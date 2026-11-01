export const validId = (id: unknown): id is string =>
  typeof id === 'string' && /^[a-z0-9][a-z0-9_-]{0,119}$/.test(id);

export function validatePublication(value: unknown) {
  if (!value || typeof value !== 'object') throw Error('Invalid publication');
  const input = value as Record<string, unknown>;
  const book = input['book'] as Record<string, unknown>;
  if (!book || !validId(book['id'])) throw Error('Invalid book ID');
  if (typeof book['title'] !== 'string' || !book['title'].trim() || book['title'].length > 300)
    throw Error('Invalid title');
  if (typeof book['author'] !== 'string' || book['author'].length > 300)
    throw Error('Invalid author');
  if (typeof book['synopsis'] !== 'string' || book['synopsis'].length > 10000)
    throw Error('Invalid synopsis');
  if (typeof book['language'] !== 'string' || book['language'].length > 50)
    throw Error('Invalid language');
  if (!['ongoing', 'completed', 'hiatus'].includes(String(book['status'])))
    throw Error('Invalid status');
  if (typeof book['is_published'] !== 'boolean') throw Error('Invalid publication state');
  if (
    book['cover_url'] != null &&
    (typeof book['cover_url'] !== 'string' ||
      !book['cover_url'].startsWith('https://') ||
      book['cover_url'].length > 2000)
  )
    throw Error('Invalid cover URL');
  if (
    input['expected_updated_at'] != null &&
    (typeof input['expected_updated_at'] !== 'string' ||
      !Number.isFinite(Date.parse(input['expected_updated_at'])))
  )
    throw Error('Invalid version');
  if (typeof input['request_id'] !== 'string' || !/^[a-f0-9]{64}$/.test(input['request_id']))
    throw Error('Invalid request ID');
  if (
    !Array.isArray(input['sections']) ||
    input['sections'].length < 1 ||
    input['sections'].length > 600
  )
    throw Error('Use 1–600 sections');
  const ids = new Set<string>();
  let totalContentBytes = 0;
  const kinds = (input['kinds'] || {}) as Record<string, unknown>;
  const sections = input['sections'].map((raw, position) => {
    const section = raw as Record<string, unknown>;
    if (
      !section ||
      typeof section['id'] !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(section['id']) ||
      ids.has(section['id'])
    )
      throw Error('Invalid section ID');
    ids.add(section['id']);
    if (
      section['position'] !== position ||
      typeof section['title'] !== 'string' ||
      !section['title'].trim() ||
      section['title'].length > 300
    )
      throw Error('Invalid section order/title');
    if (
      typeof section['content_html'] !== 'string' ||
      new TextEncoder().encode(section['content_html']).length > 16_000_000
    )
      throw Error('Invalid section content');
    totalContentBytes += new TextEncoder().encode(section['content_html']).length;
    if (totalContentBytes > 16_000_000) throw Error('Invalid publication size');
    if (
      typeof section['release_at'] !== 'string' ||
      !/(Z|[+-]\d\d:\d\d)$/.test(section['release_at']) ||
      !Number.isFinite(Date.parse(section['release_at']))
    )
      throw Error('Invalid release date');
    if (typeof section['is_enabled'] !== 'boolean') throw Error('Invalid section state');
    if (
      kinds[section['id']] !== undefined &&
      !['page', 'episode'].includes(String(kinds[section['id']]))
    )
      throw Error('Invalid section kind');
    return {
      id: section['id'],
      position,
      title: section['title'],
      content_html: section['content_html'],
      release_at: section['release_at'],
      is_enabled: section['is_enabled'],
    };
  });
  const normalizedBook = {
    id: book['id'],
    title: book['title'],
    author: book['author'],
    synopsis: book['synopsis'],
    language: book['language'],
    status: book['status'],
    is_published: book['is_published'],
    cover_url: book['cover_url'] || null,
  };
  return {
    book: normalizedBook,
    sections,
    kinds: Object.fromEntries(sections.map((s) => [s.id, kinds[s.id] || 'episode'])),
    expected: input['expected_updated_at'] || null,
    requestId: input['request_id'],
  };
}
