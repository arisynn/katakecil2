import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeCatalogLibrary, openCatalogLibraryBook } from '@/services/katakecil/library';
import { fetchCatalog } from '@/services/katakecil/catalog';
import { useLibraryStore } from '@/store/libraryStore';
import type { CatalogBook } from '@/services/katakecil/model';
import type { Book } from '@/types/book';
import type { AppService } from '@/types/system';
import type { SystemSettings } from '@/types/settings';

const entry: CatalogBook = {
  id: 'story',
  title: 'Published title',
  author: 'Author',
  synopsis: '',
  cover_url: null,
  language: 'id',
  status: 'ongoing',
  revision: 'new',
  section_ids: ['a'],
  next_release_at: null,
};
const settings = {} as SystemSettings;
const local: Book = {
  hash: 'real-epub-hash',
  title: 'Old title',
  author: 'Author',
  format: 'EPUB',
  createdAt: 1,
  updatedAt: 2,
  readingStatus: 'finished',
  tags: ['Favorite'],
  groupId: 'novels',
  progress: [20, 20],
  kataKecil: { id: 'story', revision: 'old', sectionIds: ['a'] },
};

beforeEach(() => {
  useLibraryStore.getState().setLibrary([]);
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('Catalog on the native Readest shelf', () => {
  it('carries catalog publication status independently of finished reading at 100%', () => {
    const projected = mergeCatalogLibrary([entry], [local])[0]!;
    expect(projected.kataKecil).toMatchObject({ status: 'ongoing' });
    expect(projected.readingStatus).toBe('finished');
    expect(projected.progress).toEqual([20, 20]);
    expect(
      mergeCatalogLibrary([{ ...entry, status: 'hiatus' }], [projected])[0]?.kataKecil,
    ).toMatchObject({ status: 'hiatus' });
  });
  it('retains a durable cover inside the persisted catalog identity', () => {
    const cover = 'https://example.com/cover.jpg';
    const projected = mergeCatalogLibrary([{ ...entry, cover_url: cover }], [local])[0]!;
    // library.json intentionally omits transient coverImageUrl values.
    const { coverImageUrl: _transient, ...saved } = projected;
    expect(JSON.parse(JSON.stringify(saved)).kataKecil.coverUrl).toBe(cover);
    expect(saved.progress).toEqual(local.progress);
  });
  it('projects metadata without downloading EPUBs and preserves local reading data', () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const placeholder = mergeCatalogLibrary([entry], [])[0]!;
    expect(placeholder.hash).toMatch(/^[a-f0-9]{32}$/);
    expect(mergeCatalogLibrary([entry], [])[0]?.hash).toBe(placeholder.hash);
    const projected = mergeCatalogLibrary([entry], [local])[0]!;
    expect(projected).toMatchObject({
      hash: local.hash,
      title: entry.title,
      progress: [20, 20],
      tags: ['Favorite'],
      groupId: 'novels',
      readingStatus: 'finished',
      kataKecil: { revision: 'old' },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('retains unrelated and unpublished local records without adding them to the catalog', () => {
    const unrelated = { ...local, hash: 'local-book', kataKecil: undefined };
    expect(mergeCatalogLibrary([], [local, unrelated])).toEqual([local, unrelated]);
    const merged = mergeCatalogLibrary([entry], [unrelated]);
    expect(merged).toHaveLength(2);
    expect(merged.filter((book) => book.kataKecil?.id === entry.id)).toHaveLength(1);
  });

  it('opens an already downloaded book offline without fetching metadata', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const api = { isBookAvailable: vi.fn().mockResolvedValue(true), saveLibraryBooks: vi.fn() };
    expect(await openCatalogLibraryBook(local, api as unknown as AppService, settings)).toBe(local);
    expect(fetcher).not.toHaveBeenCalled();
    expect(api.saveLibraryBooks).not.toHaveBeenCalled();
  });

  it('replaces placeholders with real EPUB hashes and saves both concurrent opens', async () => {
    const second = { ...entry, id: 'second', title: 'Second book' };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ books: [entry, second] })));
    vi.stubGlobal('fetch', fetcher);
    await fetchCatalog();
    fetcher.mockImplementation(
      async () =>
        new Response(new Blob(['EPUB']), {
          headers: { 'content-type': 'application/epub+zip', 'x-katakecil-revision': 'new' },
        }),
    );
    const placeholders = mergeCatalogLibrary([entry, second], []);
    useLibraryStore.getState().setLibrary(placeholders);
    let disk: Book[] = [];
    const api = {
      isBookAvailable: vi.fn().mockResolvedValue(false),
      loadBookConfig: vi.fn().mockResolvedValue(null),
      importBook: vi.fn(async (file: File) => ({
        ...local,
        hash: `epub-${file.name}`,
        readingStatus: 'unread',
      })),
      saveLibraryBooks: vi.fn(async (books: Book[]) => {
        disk = [...books];
      }),
    };
    const opened = await Promise.all(
      placeholders.map((book) =>
        openCatalogLibraryBook(book, api as unknown as AppService, settings),
      ),
    );
    expect(opened.map((book) => book.hash)).toEqual(['epub-story.epub', 'epub-second.epub']);
    expect(disk.map((book) => book.hash).sort()).toEqual(opened.map((book) => book.hash).sort());
    expect(useLibraryStore.getState().library).toHaveLength(2);
    expect(api.saveLibraryBooks).toHaveBeenLastCalledWith(expect.any(Array), { replace: true });
  });
});
