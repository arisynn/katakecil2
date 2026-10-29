import { createClient } from '@supabase/supabase-js';
import { makeEpub } from './epub.ts';

const named = (name: string) => {
  try {
    return JSON.parse(Deno.env.get(name) || '{}').default || '';
  } catch {
    return '';
  }
};
const url = Deno.env.get('SUPABASE_URL')!;
const publicKey = named('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY')!;
const secret = named('SUPABASE_SECRET_KEYS') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
// User-supplied Authorization is intentionally not forwarded: all readers get published data only.
const reader = createClient(url, publicKey, options);
const admin = createClient(url, secret, options);
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Expose-Headers': 'X-KataKecil-Revision',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
const digest = async (value: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');

async function catalog() {
  const { data: books, error } = await reader
    .from('kk_books')
    .select('id,title,author,synopsis,cover_url,language,status,updated_at')
    .order('title');
  if (error) throw error;
  const results = [];
  for (const book of books || []) {
    const [{ data: sections, error: e1 }, { data: schedule, error: e2 }] = await Promise.all([
      reader
        .from('kk_sections')
        .select('id,position,updated_at')
        .eq('book_id', book.id)
        .order('position')
        .limit(600),
      reader
        .from('kk_release_schedule')
        .select('release_at')
        .eq('book_id', book.id)
        .gt('release_at', new Date().toISOString())
        .order('release_at')
        .limit(1),
    ]);
    if (e1 || e2) throw e1 || e2;
    const revision = await digest(JSON.stringify([book, sections]));
    results.push({
      ...book,
      revision,
      section_ids: (sections || []).map((s) => s.id),
      next_release_at: schedule?.[0]?.release_at || null,
    });
  }
  return results;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const visitor = await digest(
      secret + ':' + ip + ':' + (request.headers.get('user-agent') || ''),
    );
    const budget = await admin.rpc('kk_consume_read_budget', { visitor_key: visitor });
    if (budget.error) return json({ error: 'Reader temporarily unavailable' }, 503);
    if (!budget.data) return json({ error: 'Please try again shortly' }, 429);
    const target = new URL(request.url),
      action = target.searchParams.get('action') || 'catalog';
    if (action === 'catalog')
      return json({ books: await catalog(), server_time: new Date().toISOString() });
    if (action !== 'epub') return json({ error: 'Unknown action' }, 400);
    const id = target.searchParams.get('book');
    if (!id || !/^[a-z0-9][a-z0-9_-]{0,119}$/.test(id)) return json({ error: 'Invalid book' }, 400);
    const book = (await catalog()).find((b) => b.id === id);
    if (!book || !book.section_ids.length) return json({ error: 'Book not available' }, 404);
    const requestedRevision = target.searchParams.get('revision');
    if (requestedRevision && requestedRevision !== book.revision)
      return json({ error: 'Book updated; refresh the catalog' }, 409);
    const { data: sections, error } = await reader
      .from('kk_sections')
      .select('id,title,content_html')
      .eq('book_id', id)
      .order('position')
      .limit(600);
    if (error) throw error;
    if (!sections || JSON.stringify(sections.map((s) => s.id)) !== JSON.stringify(book.section_ids))
      return json({ error: 'Book updated; refresh the catalog' }, 409);
    const bytes = makeEpub(book, sections);
    // Check again after assembly so a withdrawal/version change cannot leak a stale release.
    const current = (await catalog()).find((b) => b.id === id);
    if (!current || current.revision !== book.revision)
      return json({ error: 'Book updated; refresh the catalog' }, 409);
    return new Response(bytes, {
      headers: {
        ...headers,
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `inline; filename="${id}.epub"`,
        'X-KataKecil-Revision': book.revision,
      },
    });
  } catch (error) {
    console.error('Kata Kecil reader:', error instanceof Error ? error.name : 'request failed');
    return json({ error: 'Reading service temporarily unavailable' }, 503);
  }
});
