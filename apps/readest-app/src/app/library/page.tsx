'use client';

import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MdChevronRight } from 'react-icons/md';
import clsx from 'clsx';
import { useEnv } from '@/context/EnvContext';
import { useLibrary } from '@/hooks/useLibrary';
import { useCustomFonts } from '@/hooks/useCustomFonts';
import { useTheme } from '@/hooks/useTheme';
import { useUICSS } from '@/hooks/useUICSS';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useTranslation } from '@/hooks/useTranslation';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore } from '@/store/themeStore';
import { cachedCatalog, fetchCatalog } from '@/services/katakecil/catalog';
import { mergeCatalogLibrary, openCatalogLibraryBook } from '@/services/katakecil/library';
import type { CatalogBook } from '@/services/katakecil/model';
import type { Book, LibrarySearchConfig, LibrarySearchTarget } from '@/types/book';
import { navigateToLibrary, navigateToReader } from '@/utils/nav';
import { LibraryGroupByType } from '@/types/settings';
import { getActiveBookshelfGroupBy } from '@/services/bookshelves/grouping';
import { eventDispatcher } from '@/utils/event';
import { saveBookMetadataEdit } from '@/services/bookMetadataEdit';
import { AboutWindow } from '@/components/AboutWindow';
import { BookDetailModal } from '@/components/metadata';
import ReadingStatsDialog from '@/components/stats/ReadingStatsDialog';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import SettingsDialog from '@/components/settings/SettingsDialog';
import { Toast } from '@/components/Toast';
import LibraryHeader from './components/LibraryHeader';
import Bookshelf from './components/Bookshelf';
import BookshelvesDialog from './components/BookshelvesDialog';
import { CacheManagerWindow } from './components/CacheManagerWindow';
import { MigrateDataWindow } from './components/MigrateDataWindow';
import GroupHeader from './components/GroupHeader';
import { createBookGroups, findGroupById, getBreadcrumbs } from './utils/libraryUtils';

const noUpload = async () => false;
const noPush = async () => {};

function getSearchConfig(params: Pick<URLSearchParams, 'get'> | null): LibrarySearchConfig {
  const mode = params?.get('mode') as LibrarySearchConfig['mode'];
  const nearby = Number(params?.get('nearby'));
  return {
    scope: 'book',
    mode: ['contains', 'whole-words', 'regex', 'nearby-words', 'fuzzy'].includes(mode)
      ? mode
      : 'contains',
    matchCase: params?.get('matchCase') === 'true',
    matchDiacritics: params?.get('matchDiacritics') === 'true',
    nearbyWords: Number.isFinite(nearby) && nearby > 0 ? nearby : 10,
  };
}

function LibraryPageContent() {
  const _ = useTranslation();
  const { appService, envConfig } = useEnv();
  const { libraryLoaded } = useLibrary();
  const { library, getGroupName, getGroupId, updateBook } = useLibraryStore();
  const { settings, isSettingsDialogOpen } = useSettingsStore();
  const { safeAreaInsets: insets, isRoundedWindow } = useThemeStore();
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const searchString = searchParams?.toString() ?? '';
  const [catalog, setCatalog] = useState<CatalogBook[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(searchParams?.get('q') ?? '');
  const [target, setTarget] = useState<LibrarySearchTarget>(
    searchParams?.get('search') === 'text' ? 'text' : 'books',
  );
  const [searchConfig, setSearchConfig] = useState(() => getSearchConfig(searchParams));
  const [searchProgress, setSearchProgress] = useState<number | null>(null);
  const [isSelectMode, setSelectMode] = useState(false);
  const [isSelectAll, setSelectAll] = useState(false);
  const [isSelectNone, setSelectNone] = useState(false);
  const [detailsBook, setDetailsBook] = useState<Book | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const refreshingRef = useRef(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useTheme({ themeScope: 'library', appThemeColor: 'base-200' });
  useCustomFonts();
  useUICSS();

  const refresh = useCallback(async () => {
    if (!libraryLoaded || refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const entries = await fetchCatalog();
      const store = useLibraryStore.getState();
      store.setLibrary(mergeCatalogLibrary(entries, store.library));
      setCatalog(entries);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not refresh the collection.');
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [libraryLoaded]);

  useEffect(() => {
    if (!libraryLoaded) return;
    const cached = cachedCatalog();
    if (cached.length) {
      const store = useLibraryStore.getState();
      store.setLibrary(mergeCatalogLibrary(cached, store.library));
      setCatalog(cached);
    }
    void refresh();
    const resume = () => {
      if (!document.hidden) void refresh();
    };
    const interval = window.setInterval(resume, 60000);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [libraryLoaded, refresh]);
  usePullToRefresh(scrollerRef, refresh);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    setQuery(params.get('q') ?? '');
    setTarget(['text', 'contents'].includes(params.get('search') ?? '') ? 'text' : 'books');
    setSearchConfig(getSearchConfig(params));
    sessionStorage.setItem('lastLibraryParams', searchString);
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, [searchString]);
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  const updateSearch = (value: string, searchTarget = target, config = searchConfig) => {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set('q', value);
    else params.delete('q');
    if (searchTarget === 'text') params.set('search', 'text');
    else params.delete('search');
    params.set('mode', config.mode);
    params.set('matchCase', String(config.matchCase));
    params.set('matchDiacritics', String(config.matchDiacritics));
    params.set('nearby', String(config.nearbyWords ?? 10));
    navigateToLibrary(router, params.toString(), { scroll: false });
  };
  const setSelectionMode = (value: boolean) => {
    setSelectMode(value);
    setSelectAll(false);
    setSelectNone(false);
  };
  const publishedIds = useMemo(
    () => (catalog ? new Set(catalog.map((entry) => entry.id)) : null),
    [catalog],
  );
  const books = useMemo(
    () =>
      library.filter(
        (book) =>
          book.kataKecil &&
          !book.deletedAt &&
          (!publishedIds || publishedIds.has(book.kataKecil.id)),
      ),
    [library, publishedIds],
  );
  const downloadBook = async (book: Book) => {
    if (!appService) return false;
    try {
      await openCatalogLibraryBook(book, appService, settings);
      return true;
    } catch (cause) {
      eventDispatcher.dispatch('toast', {
        type: 'error',
        message: _(cause instanceof Error ? cause.message : 'Could not load this book.'),
      });
      return false;
    }
  };
  const deleteBook = async (book: Book) => {
    if (!appService) return false;
    await appService.deleteBook(book, 'local');
    await updateBook(envConfig, { ...book, deletedAt: Date.now(), downloadedAt: null });
    return true;
  };
  const group = searchParams?.get('group') || '';
  const groupBy = getActiveBookshelfGroupBy(settings, searchParams);
  const groupPath = groupBy === LibraryGroupByType.Group ? getGroupName(group) : undefined;
  const virtualGroup = useMemo(
    () =>
      group && groupBy !== LibraryGroupByType.Group
        ? findGroupById(createBookGroups(books, groupBy), group)
        : undefined,
    [books, groupBy, group],
  );
  const navigateToGroupPath = (path?: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('group', path ? getGroupId(path) || '' : '');
    if (!path) params.delete('shelf');
    navigateToLibrary(router, params.toString());
  };

  useEffect(() => {
    const store = useLibraryStore.getState();
    if (!libraryLoaded || !appService || catalog === null || !store.checkLastOpenBooks) return;
    store.setCheckLastOpenBooks(false);
    if (!settings.openLastBooks) return;
    void (async () => {
      const available: string[] = [];
      for (const hash of settings.lastOpenBooks || []) {
        const book = books.find((item) => item.hash === hash && item.readingStatus !== 'finished');
        if (book && (await appService.isBookAvailable(book))) available.push(hash);
      }
      if (available.length) navigateToReader(router, available);
    })();
  }, [
    libraryLoaded,
    appService,
    catalog,
    books,
    settings.openLastBooks,
    settings.lastOpenBooks,
    router,
  ]);

  // Readest's font/theme panels require the restored settings, not startup defaults.
  if (
    !appService ||
    !libraryLoaded ||
    !settings.globalViewSettings ||
    !settings.globalReadSettings ||
    !insets
  ) {
    return <div className='full-height bg-base-200' aria-busy='true' />;
  }
  return (
    <div
      aria-label={_('Your Library')}
      className={clsx(
        'library-page text-base-content full-height flex select-none flex-col overflow-hidden',
        settings.globalViewSettings.isEink ? 'bg-base-100' : 'bg-base-200',
        appService.hasRoundedWindow && isRoundedWindow && 'window-border rounded-window',
      )}
    >
      <div className='relative top-0 z-40 w-full' role='banner' aria-label={_('Library Header')}>
        <LibraryHeader
          isSelectMode={isSelectMode}
          isSelectAll={isSelectAll}
          onPullLibrary={() => void refresh()}
          onToggleSelectMode={() => setSelectionMode(!isSelectMode)}
          onSelectAll={() => {
            setSelectAll(true);
            setSelectNone(false);
          }}
          onDeselectAll={() => {
            setSelectNone(true);
            setSelectAll(false);
          }}
          searchQuery={query}
          searchTarget={target}
          searchConfig={searchConfig}
          onSearchQueryChange={(value) => {
            setQuery(value);
            if (searchTimer.current) clearTimeout(searchTimer.current);
            searchTimer.current = setTimeout(() => updateSearch(value), 300);
          }}
          onSearchTargetChange={(value) => {
            setTarget(value);
            updateSearch(query, value);
          }}
          onSearchConfigChange={(config) => {
            setSearchConfig(config);
            updateSearch(query, target, config);
          }}
        />
        {(refreshing || searchProgress !== null) && (
          <progress
            aria-label={_('Loading Collection...')}
            className='progress progress-success absolute bottom-0 left-0 right-0 h-1'
            {...(searchProgress === null ? {} : { value: searchProgress, max: 100 })}
          />
        )}
      </div>
      {error && (
        <div
          role='status'
          className='text-base-content/70 flex items-center justify-between gap-3 px-4 py-2 text-sm'
        >
          <span>{_(error)}</span>
          <button className='underline' onClick={() => void refresh()}>
            {_('Try Again')}
          </button>
        </div>
      )}
      {groupPath && (
        <div className='flex flex-wrap items-center gap-y-1 px-4 text-base'>
          <button
            className='hover:bg-base-300 rounded-sm px-2 py-1'
            onClick={() => navigateToGroupPath()}
          >
            {_('All')}
          </button>
          {getBreadcrumbs(groupPath).map((crumb, index, crumbs) => (
            <Fragment key={crumb.path}>
              <MdChevronRight className='text-neutral-content' />
              {index === crumbs.length - 1 ? (
                <span className='truncate px-2 py-1'>{crumb.name}</span>
              ) : (
                <button
                  className='hover:bg-base-300 truncate rounded-sm px-2 py-1'
                  onClick={() => navigateToGroupPath(crumb.path)}
                >
                  {crumb.name}
                </button>
              )}
            </Fragment>
          ))}
        </div>
      )}
      {virtualGroup && (
        <GroupHeader
          groupBy={groupBy}
          groupName={virtualGroup.displayName || virtualGroup.name}
          localized={virtualGroup.localized}
        />
      )}
      <BookshelvesDialog />
      <Bookshelf
        libraryBooks={books}
        isSelectMode={isSelectMode}
        isSelectAll={isSelectAll}
        isSelectNone={isSelectNone}
        onScrollerRef={(element) => {
          scrollerRef.current = element;
        }}
        handleBookDownload={downloadBook}
        handleBookUpload={noUpload}
        handleBookDelete={deleteBook}
        handleBookPurge={deleteBook}
        handleSetSelectMode={setSelectionMode}
        handleShowDetailsBook={setDetailsBook}
        handleLibraryNavigation={(nextGroup, shelfId) => {
          const params = new URLSearchParams(window.location.search);
          params.set('group', nextGroup);
          if (!nextGroup) params.delete('shelf');
          else if (shelfId) params.set('shelf', shelfId);
          navigateToLibrary(router, params.toString());
        }}
        handlePushLibrary={noPush}
        booksTransferProgress={{}}
        contentSearch={
          target === 'text' ? { query: searchParams?.get('q') ?? '', config: searchConfig } : null
        }
        onSearchContents={() => {
          setTarget('text');
          updateSearch(query, 'text');
        }}
        onSearchProgress={setSearchProgress}
      />
      {detailsBook && (
        <BookDetailModal
          isOpen
          book={detailsBook}
          onClose={() => setDetailsBook(null)}
          handleBookDownload={(book) => {
            void downloadBook(book);
          }}
          handleBookDeleteLocalCopy={(book) => {
            void deleteBook(book);
          }}
          handleBookMetadataUpdate={(book, metadata, tags) => {
            void saveBookMetadataEdit(envConfig, book, metadata, tags, false);
          }}
        />
      )}
      {isSettingsDialogOpen && <SettingsDialog bookKey='' />}
      <AboutWindow />
      <ReadingStatsDialog />
      <KeyboardShortcutsHelp />
      <CacheManagerWindow />
      <MigrateDataWindow />
      <Toast />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className='full-height bg-base-200' />}>
      <LibraryPageContent />
    </Suspense>
  );
}
