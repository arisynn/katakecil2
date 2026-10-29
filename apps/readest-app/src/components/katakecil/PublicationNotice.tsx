'use client';
import { useEffect, useState } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import { useReaderStore } from '@/store/readerStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { fetchCatalog, prepareCatalogBook } from '@/services/katakecil/catalog';
import { publicationLabel, type CatalogBook } from '@/services/katakecil/model';

export default function PublicationNotice() {
  const _ = useTranslation();
  const { appService } = useEnv();
  const library = useLibraryStore((s) => s.library);
  const [catalog, setCatalog] = useState<CatalogBook[]>([]);
  const [dismissed, setDismissed] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hovered = useReaderStore((s) => s.hoveredBookKey);
  const activeData = useBookDataStore((s) => s.booksData);
  const book = (
    hovered
      ? activeData[hovered.split('-')[0]!]
      : Object.values(activeData).find((d) => d.book?.kataKecil)
  )?.book;
  const entry = catalog.find((b) => b.id === book?.kataKecil?.id);
  useEffect(() => {
    let active = true,
      running = false;
    const refresh = async () => {
      if (document.hidden || running) return;
      running = true;
      try {
        const data = await fetchCatalog();
        if (active) setCatalog(data);
      } catch {
        /* Offline reading continues. */
      } finally {
        running = false;
      }
    };
    void refresh();
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, []);
  const update = async () => {
    if (!entry || !book || !appService) return;
    setBusy(true);
    setError('');
    try {
      const settings = useSettingsStore.getState().settings;
      const config = useBookDataStore.getState().getConfig(book.hash);
      if (config) await appService.saveBookConfig(book, config, settings);
      const next = await prepareCatalogBook(entry, appService, library, settings);
      const updated = [
        ...useLibraryStore
          .getState()
          .library.filter((b) => b.hash !== next.hash && b.kataKecil?.id !== entry.id),
        next,
      ];
      await appService.saveLibraryBooks(updated, { replace: true });
      // A full navigation releases the old document and all its delayed autosave callbacks.
      window.location.assign(`/reader?ids=${encodeURIComponent(next.hash)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this book.');
      setBusy(false);
    }
  };
  if (
    !entry ||
    !book ||
    entry.revision === book.kataKecil?.revision ||
    dismissed === entry.revision
  )
    return null;
  return (
    <aside
      className='kk-update-notice glass flex flex-wrap items-center gap-3 text-xs'
      aria-live='polite'
    >
      <span className='flex-1'>
        {_(publicationLabel(entry.status))} · {_('A new book version is available.')}
        {error && (
          <span role='alert' className='block mt-1'>
            {_(error)}
          </span>
        )}
      </span>
      <button
        type='button'
        className='btn btn-contrast btn-sm'
        disabled={busy}
        onClick={() => void update()}
      >
        {busy ? _('Opening Book...') : _('Update Book')}
      </button>
      <button
        type='button'
        className='kk-icon-button'
        disabled={busy}
        aria-label={_('Dismiss')}
        onClick={() => setDismissed(entry.revision)}
      >
        ×
      </button>
    </aside>
  );
}
