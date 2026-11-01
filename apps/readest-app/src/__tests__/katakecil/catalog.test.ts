import { describe, it, expect, vi, afterEach } from 'vitest';
import { prepareCatalogBook, fetchCatalog, cachedCatalog } from '@/services/katakecil/catalog';
import type { CatalogBook } from '@/services/katakecil/model';
import type { AppService } from '@/types/system';
import type { Book } from '@/types/book';
import type { SystemSettings } from '@/types/settings';
const entry: CatalogBook = {
  id: 'story',
  title: 'Story',
  author: 'Author',
  synopsis: '',
  cover_url: null,
  language: 'id',
  status: 'ongoing',
  revision: 'new',
  section_ids: ['x', 'a', 'b'],
  next_release_at: null,
};
const previous: Book = {
  hash: 'old',
  format: 'EPUB',
  title: 'Story',
  author: 'Author',
  createdAt: 1,
  updatedAt: 1,
  kataKecil: { id: 'story', revision: 'old', sectionIds: ['a', 'b'] },
};
const imported: Book = { ...previous, hash: 'new-hash' };
const app = () => ({
  isBookAvailable: vi.fn().mockResolvedValue(true),
  loadBookConfig: vi.fn().mockResolvedValue({
    updatedAt: 1,
    location: 'epubcfi(/6/4!/4/2/1:12)',
    booknotes: [{ type: 'bookmark', id: 'note', cfi: 'epubcfi(/6/2!/4/2)', note: '' }],
  }),
  saveBookConfig: vi.fn().mockResolvedValue(undefined),
  importBook: vi.fn().mockResolvedValue(imported),
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});
describe('Catalog reader integration', () => {
  it('keeps native shelf metadata and completed status across an EPUB update', async () => {
    const saved = {
      ...previous,
      tags: ['Novel'],
      groupId: 'favorites',
      groupName: 'Favorites',
      readingStatus: 'finished' as const,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Blob(['EPUB']), {
          headers: { 'content-type': 'application/epub+zip', 'x-katakecil-revision': 'new' },
        }),
      ),
    );
    const book = await prepareCatalogBook(
      entry,
      app() as unknown as AppService,
      [saved],
      {} as SystemSettings,
    );
    expect(book.tags).toEqual(['Novel']);
    expect(book.groupId).toBe('favorites');
    expect(book.readingStatus).toBe('finished');
  });
  it('migrates progress and notes to a new EPUB version without altering serial status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Blob(['EPUB']), {
          headers: { 'content-type': 'application/epub+zip', 'x-katakecil-revision': 'new' },
        }),
      ),
    );
    const api = app();
    const book = await prepareCatalogBook(
      entry,
      api as unknown as AppService,
      [previous],
      {} as SystemSettings,
    );
    expect(book.kataKecil?.id).toBe('story');
    expect(book.kataKecil?.revision).toBe('new');
    expect(api.saveBookConfig.mock.calls[0]?.[1]).toMatchObject({
      bookHash: 'new-hash',
      location: 'epubcfi(/6/6!/4/2/1:12)',
      booknotes: [{ cfi: 'epubcfi(/6/4!/4/2)' }],
    });
    expect(entry.status).toBe('ongoing');
  });
  it('reuses an available local version without downloading again', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const api = app();
    expect(
      await prepareCatalogBook(
        { ...entry, revision: 'old' },
        api as unknown as AppService,
        [previous],
        {} as SystemSettings,
      ),
    ).toMatchObject({ ...previous, kataKecil: { ...previous.kataKecil, status: 'ongoing' } });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('never imports a conflict or server error as an EPUB', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 409 })));
    const api = app();
    await expect(
      prepareCatalogBook(entry, api as unknown as AppService, [previous], {} as SystemSettings),
    ).rejects.toThrow('Book updated');
    expect(api.importBook).not.toHaveBeenCalled();
    expect(api.saveBookConfig).not.toHaveBeenCalled();
  });
  it('keeps a validated cached catalog when a refresh fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ books: [entry] })))
        .mockResolvedValueOnce(new Response('{}', { status: 503 })),
    );
    await fetchCatalog();
    await expect(fetchCatalog()).rejects.toThrow();
    expect(cachedCatalog()).toEqual([entry]);
  });
});
