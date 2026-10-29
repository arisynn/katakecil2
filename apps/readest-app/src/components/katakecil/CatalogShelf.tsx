'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, RefreshCw, Settings, Info, BookOpen } from 'lucide-react';
import { useEnv } from '@/context/EnvContext';
import { useLibrary } from '@/hooks/useLibrary';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemeStore } from '@/store/themeStore';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppRouter } from '@/hooks/useAppRouter';
import { navigateToReader } from '@/utils/nav';
import { cachedCatalog, fetchCatalog, prepareCatalogBook } from '@/services/katakecil/catalog';
import { nextRelease, publicationLabel, type CatalogBook } from '@/services/katakecil/model';
import SettingsDialog from '@/components/settings/SettingsDialog';
import { AboutWindow, setAboutDialogVisible } from '@/components/AboutWindow';
import { useCustomFonts } from '@/hooks/useCustomFonts';

export default function CatalogShelf() {
  const _ = useTranslation();
  const { appService } = useEnv();
  const { libraryLoaded } = useLibrary();
  const { library, setLibrary } = useLibraryStore();
  const { settings, isSettingsDialogOpen, setSettingsDialogOpen } = useSettingsStore();
  const { safeAreaInsets: insets } = useThemeStore();
  const router = useAppRouter();
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const refreshInFlight = useRef(false);
  useTheme({ themeScope: 'library' });
  useCustomFonts();
  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    try {
      setBooks(await fetchCatalog());
      setOffline(false);
      setError('');
    } catch (e) {
      setOffline(true);
      setError(e instanceof Error ? e.message : 'Could not refresh the collection.');
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    setBooks(cachedCatalog());
    void refresh();
    const resume = () => {
      if (!document.hidden) void refresh();
    };
    const timer = window.setInterval(resume, 60000);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [refresh]);

  const openBook = async (entry: CatalogBook) => {
    if (!appService || !libraryLoaded || opening) return;
    setOpening(entry.id);
    setError('');
    try {
      const book = await prepareCatalogBook(entry, appService, library, settings);
      const latest = useLibraryStore.getState().library;
      const updated = [
        ...latest.filter((b) => b.hash !== book.hash && b.kataKecil?.id !== entry.id),
        book,
      ];
      await appService.saveLibraryBooks(updated, { replace: true });
      setLibrary(updated);
      navigateToReader(router, [book.hash]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this book.');
    } finally {
      setOpening(null);
    }
  };
  const filtered = books.filter((b) =>
    `${b.title} ${b.author}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <main
      className='kk-library h-dvh overflow-y-auto'
      style={{
        paddingTop: Math.max(insets?.top || 0, 12),
        paddingBottom: Math.max(insets?.bottom || 0, 24),
        paddingInlineStart: Math.max(insets?.left || 0, 16),
        paddingInlineEnd: Math.max(insets?.right || 0, 16),
      }}
    >
      <header className='kk-toolbar glass mx-auto flex max-w-6xl items-center gap-3 px-4 py-3'>
        <img src='/katakecil-mark.svg' alt='' className='kk-mark h-8 w-8 shrink-0' />
        <span className='hidden text-sm font-semibold tracking-tight sm:block'>katakecil</span>
        <label className='kk-search flex min-w-0 flex-1 items-center gap-2'>
          <Search size={17} aria-hidden='true' />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={_('Search Books')}
            placeholder={_('Search Books...')}
            className='min-w-0 w-full bg-transparent py-2 text-sm outline-none'
          />
        </label>
        <button
          type='button'
          className='kk-icon-button'
          disabled={refreshing}
          onClick={() => void refresh()}
          aria-label={_('Refresh Collection')}
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <button
          type='button'
          className='kk-icon-button'
          disabled={!settings.globalViewSettings}
          onClick={() => setSettingsDialogOpen(true)}
          aria-label={_('Settings')}
        >
          <Settings size={19} />
        </button>
        <button
          type='button'
          className='kk-icon-button hidden sm:flex'
          onClick={() => setAboutDialogVisible(true)}
          aria-label={_('About Kata Kecil')}
        >
          <Info size={18} />
        </button>
      </header>
      {error && (
        <div
          role='status'
          className='glass mx-auto mt-5 flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 text-sm'
        >
          <span>
            {_(error)} {offline && books.length > 0 && _('Showing the saved collection.')}
          </span>
          <button
            type='button'
            onClick={() => void refresh()}
            className='underline underline-offset-4'
          >
            {_('Try Again')}
          </button>
        </div>
      )}
      <section
        aria-label={_('Book Collection')}
        aria-busy={refreshing || !!opening}
        className='kk-shelf mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-2 pt-9 sm:grid-cols-3 sm:gap-8 md:grid-cols-4 lg:grid-cols-5'
      >
        {filtered.map((entry) => {
          const local = library.find((b) => !b.deletedAt && b.kataKecil?.id === entry.id);
          const upcoming = nextRelease(entry.next_release_at);
          const progress = local?.progress;
          const caughtUp =
            entry.status === 'ongoing' && progress && progress[1] > 0 && progress[0] >= progress[1];
          const updated = local?.kataKecil && local.kataKecil.revision !== entry.revision;
          return (
            <article key={entry.id} className='min-w-0'>
              <button
                type='button'
                disabled={!!opening || !libraryLoaded}
                onClick={() => void openBook(entry)}
                aria-label={_('Read {{title}}', { title: entry.title })}
                className='kk-book group relative block w-full overflow-hidden rounded-lg text-start focus-visible:outline-2 focus-visible:outline-offset-4'
              >
                {entry.cover_url ? (
                  <img
                    src={entry.cover_url}
                    alt={entry.title}
                    crossOrigin='anonymous'
                    loading='lazy'
                    className='aspect-[2/3] w-full object-cover'
                  />
                ) : (
                  <div className='kk-cover-fallback flex aspect-[2/3] flex-col justify-between p-5'>
                    <BookOpen size={24} aria-hidden='true' />
                    <span className='font-serif text-lg leading-snug'>{entry.title}</span>
                    <span className='text-xs'>{entry.author}</span>
                  </div>
                )}
                {opening === entry.id && (
                  <span
                    className='kk-loading glass absolute inset-x-2 bottom-3 py-2 text-center text-xs'
                    role='status'
                  >
                    {_('Opening Book...')}
                  </span>
                )}
              </button>
              <div className='mt-3 flex flex-wrap items-center gap-2 text-[11px]'>
                <span className='kk-badge'>{_(publicationLabel(entry.status))}</span>
                {updated && <span>{_('New Update')}</span>}
              </div>
              <p className='kk-muted mt-2 text-[11px] leading-relaxed'>
                {upcoming
                  ? _('Next release: {{date}}', {
                      date:
                        new Intl.DateTimeFormat(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: 'Asia/Jakarta',
                        }).format(new Date(upcoming)) + ' WIB',
                    })
                  : entry.status !== 'completed'
                    ? _('Next release not announced yet.')
                    : _('All sections published.')}
              </p>
              {caughtUp && !updated && (
                <p className='kk-muted mt-1 text-[11px]'>{_('You are up to date.')}</p>
              )}
            </article>
          );
        })}
      </section>
      {!filtered.length && (
        <div className='mx-auto max-w-md px-5 py-24 text-center'>
          <BookOpen size={30} className='mx-auto mb-5 opacity-40' />
          <p className='font-serif text-xl'>
            {refreshing
              ? _('Loading Collection...')
              : query
                ? _('No Books Found')
                : _('Your collection is on its way.')}
          </p>
          <p className='kk-muted mt-3 text-sm'>
            {!query && !refreshing && _('Published books will appear here automatically.')}
          </p>
        </div>
      )}
      {isSettingsDialogOpen && settings.globalViewSettings && <SettingsDialog bookKey='' />}
      <AboutWindow />
    </main>
  );
}
