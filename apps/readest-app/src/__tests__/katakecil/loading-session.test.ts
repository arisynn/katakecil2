import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReaderStore } from '@/store/readerStore';
import { useBookDataStore, type BookData } from '@/store/bookDataStore';
import type { EnvConfigType } from '@/services/environment';
import type { TOCItem } from '@/libs/document';
import type { TimeInfo } from '@/types/book';
const originalError = console.error;
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  useReaderStore.setState({ viewStates: {}, bookKeys: [] });
  useBookDataStore.setState({ booksData: {} });
});
afterEach(() => {
  vi.restoreAllMocks();
  console.error = originalError;
});
const pendingService = () => {
  type Service = Awaited<ReturnType<EnvConfigType['getAppService']>>;
  let resolve!: (service: Service) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Service>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { resolve, reject, env: { getAppService: () => promise } as EnvConfigType };
};
describe('reader loading sessions', () => {
  it('does not resurrect a closed view when its request rejects later', async () => {
    const request = pendingService();
    const task = useReaderStore.getState().initViewState(request.env, 'book', 'book-view');
    useReaderStore.getState().clearViewState('book-view');
    request.reject(new Error('late failure'));
    await task.catch(() => {});
    expect(useReaderStore.getState().getViewState('book-view')).toBeNull();
  });
  it('ignores a late success after close, before accessing book data', async () => {
    const request = pendingService();
    const task = useReaderStore.getState().initViewState(request.env, 'book', 'book-view');
    useReaderStore.getState().clearViewState('book-view');
    request.resolve({} as Awaited<ReturnType<EnvConfigType['getAppService']>>);
    await task.catch(() => {});
    expect(useReaderStore.getState().getViewState('book-view')).toBeNull();
  });
  it('gives a retry its own identity and ignores an older rejection', async () => {
    const first = pendingService(),
      second = pendingService();
    const a = useReaderStore.getState().initViewState(first.env, 'book', 'book-view');
    const identity = useReaderStore.getState().getViewState('book-view')?.viewerKey;
    const b = useReaderStore.getState().initViewState(second.env, 'book', 'book-view');
    expect(useReaderStore.getState().getViewState('book-view')?.viewerKey).not.toBe(identity);
    first.reject(new Error('old failure'));
    await a.catch(() => {});
    expect(useReaderStore.getState().getViewState('book-view')?.error).toBeNull();
    second.reject(new Error('new failure'));
    await b.catch(() => {});
  });
  it.each([
    'restoring',
    'preview',
  ] as const)('protects confirmed CFI and notes during %s', (mode) => {
    const saved = 'epubcfi(/6/8!/4/2/1:12)';
    const intermediate = 'epubcfi(/6/2!/4/2/1:0)';
    const notes = [{ id: 'mark', type: 'bookmark', cfi: saved }];
    useBookDataStore.setState({
      booksData: {
        book: {
          id: 'book',
          isFixedLayout: false,
          config: { location: saved, booknotes: notes },
        } as BookData,
      },
    });
    useReaderStore.setState({
      viewStates: {
        'book-view': {
          key: 'book-view',
          isPrimary: true,
          inited: false,
          loadPhase: mode === 'restoring' ? 'restoring' : 'ready',
          previewMode: mode === 'preview',
        } as ReturnType<typeof useReaderStore.getState>['viewStates'][string],
      },
    });
    const page = { current: 0, next: 1, total: 3 };
    useReaderStore
      .getState()
      .setProgress(
        'book-view',
        intermediate,
        { label: 'Chapter', href: 'chapter.xhtml' } as TOCItem,
        null,
        page,
        page,
        {} as TimeInfo,
        document.createRange(),
        0,
      );
    expect(useBookDataStore.getState().getConfig('book-view')?.location).toBe(saved);
    expect(useBookDataStore.getState().getConfig('book-view')?.booknotes).toEqual(notes);
  });
});
