import { KATAKECIL_ENDPOINT, KATAKECIL_KEY } from './config';
import { validateCatalog, migrateLocation, type CatalogBook } from './model';
import type { AppService } from '@/types/system';
import type { Book, BookConfig } from '@/types/book';
import type { SystemSettings } from '@/types/settings';

const CACHE = 'katakecil:catalog:v1';
export const cachedCatalog = (): CatalogBook[] => {
  try {
    return validateCatalog(JSON.parse(localStorage.getItem(CACHE) || '{}'));
  } catch {
    return [];
  }
};
export async function fetchCatalog(signal?: AbortSignal): Promise<CatalogBook[]> {
  const response = await fetch(KATAKECIL_ENDPOINT, {
    headers: { apikey: KATAKECIL_KEY },
    signal,
    cache: 'no-store',
  });
  if (!response.ok)
    throw Error(
      response.status === 429
        ? 'Too many requests. Please try again.'
        : 'Could not refresh the collection.',
    );
  const books = validateCatalog(await response.json());
  try {
    localStorage.setItem(CACHE, JSON.stringify({ books }));
  } catch {
    /* Reading works without a metadata cache. */
  }
  return books;
}

function migrateConfig(config: BookConfig, previous: Book, next: Book, ids: string[]): BookConfig {
  const old = previous.kataKecil?.sectionIds || [];
  return {
    ...config,
    bookHash: next.hash,
    metaHash: next.metaHash,
    location: config.location ? migrateLocation(config.location, old, ids) : undefined,
    // Physical page counts are recalculated for the new EPUB/font/layout.
    progress: undefined,
    booknotes: config.booknotes?.map((note) => ({
      ...note,
      bookHash: next.hash,
      cfi: migrateLocation(note.cfi, old, ids),
    })),
    rsvpPosition: config.rsvpPosition
      ? { ...config.rsvpPosition, cfi: migrateLocation(config.rsvpPosition.cfi, old, ids) }
      : undefined,
    updatedAt: Date.now(),
  };
}

/** One download per book at a time, even if both the shelf and update notice are tapped. */
const opening = new Map<string, Promise<Book>>();
export function prepareCatalogBook(
  entry: CatalogBook,
  app: AppService,
  books: Book[],
  settings: SystemSettings,
): Promise<Book> {
  const current = opening.get(entry.id);
  if (current) return current;
  const work = async () => {
    const previous = books.find((b) => !b.deletedAt && b.kataKecil?.id === entry.id);
    if (previous?.kataKecil?.revision === entry.revision && (await app.isBookAvailable(previous)))
      return {
        ...previous,
        coverImageUrl: entry.cover_url || previous.coverImageUrl,
        kataKecil: { ...previous.kataKecil, coverUrl: entry.cover_url, status: entry.status },
      };
    if (!entry.section_ids.length) throw Error('This book has no published sections yet.');
    if (
      typeof navigator !== 'undefined' &&
      !navigator.onLine &&
      previous &&
      (await app.isBookAvailable(previous))
    )
      return previous;
    const config = previous ? await app.loadBookConfig(previous, settings) : null;
    const query = new URLSearchParams({ action: 'epub', book: entry.id, revision: entry.revision });
    const response = await fetch(`${KATAKECIL_ENDPOINT}?${query}`, {
      headers: { apikey: KATAKECIL_KEY },
      cache: 'no-store',
    });
    if (!response.ok)
      throw Error(
        response.status === 409
          ? 'Book updated. Refresh the collection and try again.'
          : 'Could not load this book.',
      );
    if (
      !response.headers.get('content-type')?.includes('application/epub+zip') ||
      response.headers.get('x-katakecil-revision') !== entry.revision
    )
      throw Error('Invalid book response.');
    const blob = await response.blob();
    if (blob.size > 18000000) throw Error('Book is too large.');
    const imported = await app.importBook(
      new File([blob], `${entry.id}.epub`, { type: 'application/epub+zip' }),
      books.map((b) => ({ ...b })),
      { overwrite: true },
    );
    if (!imported) throw Error('Could not open this EPUB.');
    const next: Book = {
      ...imported,
      title: entry.title,
      author: entry.author,
      coverImageUrl: entry.cover_url || imported.coverImageUrl,
      readingStatus: previous?.readingStatus ?? 'unread',
      ...(previous
        ? {
            createdAt: previous.createdAt,
            tags: previous.tags,
            groupId: previous.groupId,
            groupName: previous.groupName,
            groupUpdatedAt: previous.groupUpdatedAt,
            readingStatusUpdatedAt: previous.readingStatusUpdatedAt,
          }
        : {}),
      kataKecil: {
        id: entry.id,
        revision: entry.revision,
        sectionIds: entry.section_ids,
        coverUrl: entry.cover_url,
        status: entry.status,
      },
    };
    if (previous && config)
      await app.saveBookConfig(
        next,
        migrateConfig(config, previous, next, entry.section_ids),
        settings,
      );
    return next;
  };
  const promise = work().finally(() => opening.delete(entry.id));
  opening.set(entry.id, promise);
  return promise;
}
