import { md5 } from 'js-md5';
import type { Book } from '@/types/book';
import type { AppService } from '@/types/system';
import type { SystemSettings } from '@/types/settings';
import { useLibraryStore } from '@/store/libraryStore';
import { cachedCatalog, fetchCatalog, prepareCatalogBook } from './catalog';
import type { CatalogBook } from './model';

let saveTail: Promise<void> = Promise.resolve();

/** Catalog metadata uses the same Book model as the native Readest shelf. */
export function mergeCatalogLibrary(entries: CatalogBook[], library: Book[]): Book[] {
  const publishedIds = new Set(entries.map((entry) => entry.id));
  const localBooks = new Map(
    library.flatMap((book) => (book.kataKecil ? [[book.kataKecil.id, book] as const] : [])),
  );
  return [
    ...library.filter((book) => !book.kataKecil || !publishedIds.has(book.kataKecil.id)),
    ...entries.map((entry): Book => {
      const local = localBooks.get(entry.id);
      return {
        hash: md5(`katakecil:${entry.id}`),
        format: 'EPUB',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        readingStatus: 'unread',
        ...local,
        kataKecil: {
          ...(local?.kataKecil ?? {
            id: entry.id,
            revision: entry.revision,
            sectionIds: entry.section_ids,
          }),
          coverUrl: entry.cover_url,
        },
        title: entry.title,
        author: entry.author,
        coverImageUrl: entry.cover_url || local?.coverImageUrl,
      };
    }),
  ];
}

/** Resolve a catalog row to the real locally imported EPUB before navigation. */
export async function openCatalogLibraryBook(
  book: Book,
  app: AppService,
  settings: SystemSettings,
): Promise<Book> {
  if (!navigator.onLine && (await app.isBookAvailable(book))) return book;
  const id = book.kataKecil?.id;
  const entries = cachedCatalog();
  const entry =
    entries.find((item) => item.id === id) ?? (await fetchCatalog()).find((item) => item.id === id);
  if (!entry) throw Error('This book is no longer in the published collection.');
  const next = await prepareCatalogBook(entry, app, useLibraryStore.getState().library, settings);
  // Publish synchronously; serialize disk writes so concurrent opens cannot
  // leave an older snapshot on disk after a more recent one.
  const latest = useLibraryStore.getState();
  const updated = [
    ...latest.library.filter((item) => item.hash !== next.hash && item.kataKecil?.id !== id),
    next,
  ];
  latest.setLibrary(updated);
  const saved = saveTail
    .catch(() => {})
    .then(() => app.saveLibraryBooks(useLibraryStore.getState().library, { replace: true }));
  saveTail = saved;
  await saved;
  return next;
}
