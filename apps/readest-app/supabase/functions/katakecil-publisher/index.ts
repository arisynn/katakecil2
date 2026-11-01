import { createClient } from '@supabase/supabase-js';
import { validId, validatePublication } from './validation.ts';

const named = (name: string) => {
  try {
    return JSON.parse(Deno.env.get(name) || '{}').default || '';
  } catch {
    return '';
  }
};
const url = Deno.env.get('SUPABASE_URL')!;
const secret = named('SUPABASE_SECRET_KEYS') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
const sha256 = async (raw: Uint8Array) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', raw as BufferSource)))
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');

async function readLimited(request: Request, limit: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length') || 0) > limit) throw Error('too_large');
  const reader = request.body?.getReader();
  if (!reader) throw Error('empty_body');
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw Error('too_large');
    }
    chunks.push(value);
  }
  const raw = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    raw.set(chunk, offset);
    offset += chunk.length;
  }
  return raw;
}

Deno.serve(async (request) => {
  // Terminal-only endpoint: browsers never receive a permissive CORS response.
  if (request.headers.has('origin')) return json({ error: 'Terminal access only' }, 403);
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (kk_[a-f0-9]{64})$/)?.[1];
    if (!token) return json({ error: 'Publisher access required' }, 401);
    const hash = await sha256(new TextEncoder().encode(token));
    const { data: access, error: accessError } = await admin
      .from('kk_publisher_tokens')
      .select('is_enabled')
      .eq('token_hash', hash)
      .maybeSingle();
    if (accessError) return json({ error: 'Publisher unavailable' }, 503);
    if (!access) return json({ error: 'Invalid publisher access' }, 401);
    if (!access.is_enabled) return json({ error: 'Publisher disabled' }, 403);
    const target = new URL(request.url);
    const action = target.searchParams.get('action') || 'status';
    if (request.method === 'GET') {
      if (action === 'status')
        return json({
          ok: true,
          version: 2,
          limits: { image: 10_000_000, content: 16_000_000, epub: 18_000_000 },
        });
      if (action === 'list') {
        const { data, error } = await admin
          .from('kk_books')
          .select('id,title,author,is_published,status,updated_at')
          .order('title')
          .limit(1000);
        if (error) throw error;
        return json({ books: data });
      }
      if (action !== 'book') return json({ error: 'Unknown action' }, 400);
      const id = target.searchParams.get('id');
      if (!validId(id)) return json({ error: 'Invalid book ID' }, 400);
      const [book, sections, state] = await Promise.all([
        admin
          .from('kk_books')
          .select('id,title,author,synopsis,cover_url,language,status,is_published,updated_at')
          .eq('id', id)
          .maybeSingle(),
        admin
          .from('kk_sections')
          .select('id,position,title,content_html,is_enabled,release_at')
          .eq('book_id', id)
          .order('position')
          .limit(600),
        admin.from('kk_publisher_state').select('kinds').eq('book_id', id).maybeSingle(),
      ]);
      if (book.error || sections.error || state.error) throw Error('read_failed');
      if (!book.data) return json({ error: 'Book not found' }, 404);
      return json({
        book: book.data,
        sections: (sections.data || []).map((s) => ({
          ...s,
          kind: state.data?.kinds?.[s.id] || 'episode',
        })),
      });
    }
    if (action === 'publish') {
      let publication;
      try {
        publication = validatePublication(
          JSON.parse(new TextDecoder().decode(await readLimited(request, 24_000_000))),
        );
      } catch (error) {
        if (error instanceof Error && error.message === 'too_large') throw error;
        return json({ error: 'Invalid publication' }, 400);
      }
      const { data: saved, error } = await admin.rpc('kk_terminal_save', {
        p_book: publication.book,
        p_sections: publication.sections,
        p_kinds: publication.kinds,
        p_expected_updated_at: publication.expected,
        p_request_id: publication.requestId,
      });
      if (saved === false || error?.code === '23505')
        return json({ error: 'Publication changed; reload' }, 409);
      if (error) throw error;
      return json({ ok: true, id: publication.book.id });
    }
    if (!['source', 'cover'].includes(action)) return json({ error: 'Unknown action' }, 400);
    const id = target.searchParams.get('id');
    if (!validId(id)) return json({ error: 'Invalid book ID' }, 400);
    const mime = request.headers.get('content-type')?.split(';')[0];
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/epub+zip': 'epub',
    };
    if (!mime || !extensions[mime] || (action === 'source') !== (mime === 'application/epub+zip'))
      return json({ error: 'Invalid file type' }, 400);
    const raw = await readLimited(request, action === 'cover' ? 10_000_000 : 18_000_000);
    if (!raw.length) return json({ error: 'Empty file' }, 400);
    const path = id + '/' + (await sha256(raw)) + '.' + extensions[mime];
    const bucket = action === 'cover' ? 'kk-covers' : 'kk-sources';
    const { error } = await admin.storage
      .from(bucket)
      .upload(path, raw, { contentType: mime, upsert: true });
    if (error) throw error;
    return json({
      ok: true,
      ...(action === 'cover'
        ? { url: admin.storage.from(bucket).getPublicUrl(path).data.publicUrl }
        : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'too_large')
      return json({ error: 'File too large' }, 413);
    // Never return SQL errors, stored tokens, or server credentials.
    return json({ error: 'Publisher temporarily unavailable' }, 503);
  }
});
