export interface CatalogBook {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  cover_url: string | null;
  language: string;
  status: 'ongoing' | 'completed' | 'hiatus';
  revision: string;
  section_ids: string[];
  next_release_at: string | null;
}

export const publicationLabel = (status: string) =>
  status === 'completed' ? 'Completed' : status === 'hiatus' ? 'On hiatus' : 'Ongoing';

export const nextRelease = (value: string | null, now = Date.now()): string | null =>
  value && Number.isFinite(Date.parse(value)) && Date.parse(value) > now ? value : null;

/** The first CFI step after /6 addresses the EPUB spine (2,4,6,...). */
export function migrateLocation(location: string, oldIds: string[], newIds: string[]): string {
  const match = /^epubcfi\(\/6\/(\d+)(?:\[[^\]]*\])?!/.exec(location);
  if (!match || !newIds.length) return location;
  const oldIndex = Number(match[1]) / 2 - 1;
  const id = oldIds[oldIndex];
  if (!id) return location;
  const newIndex = newIds.indexOf(id);
  if (newIndex >= 0)
    return location.replace(
      /^epubcfi\(\/6\/\d+(?:\[[^\]]*\])?!/,
      `epubcfi(/6/${(newIndex + 1) * 2}!`,
    );
  for (let i = oldIndex - 1; i >= 0; i--) {
    const previous = newIds.indexOf(oldIds[i]!);
    if (previous >= 0) return `epubcfi(/6/${(previous + 1) * 2}!/4/2)`;
  }
  return 'epubcfi(/6/2!/4/2)';
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateCatalog(value: unknown): CatalogBook[] {
  if (!record(value) || !Array.isArray(value['books'])) throw Error('Invalid catalog');
  return value['books'].map((book: unknown) => {
    if (
      !record(book) ||
      typeof book['id'] !== 'string' ||
      typeof book['title'] !== 'string' ||
      typeof book['author'] !== 'string' ||
      typeof book['synopsis'] !== 'string' ||
      typeof book['revision'] !== 'string' ||
      typeof book['language'] !== 'string' ||
      !['ongoing', 'completed', 'hiatus'].includes(String(book['status'])) ||
      !Array.isArray(book['section_ids']) ||
      !book['section_ids'].every((id: unknown) => typeof id === 'string') ||
      !(book['cover_url'] === null || typeof book['cover_url'] === 'string') ||
      !(book['next_release_at'] === null || typeof book['next_release_at'] === 'string')
    )
      throw Error('Invalid book');
    if (book['cover_url'] && !/^https:\/\//i.test(String(book['cover_url'])))
      throw Error('Invalid cover URL');
    return book as unknown as CatalogBook;
  });
}
