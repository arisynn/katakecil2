import {
  ChevronsRight,
  MoveDown,
  Bookmark as MdBookmarkBorder,
  Search as MdOutlineSearch,
  NotebookPen as MdOutlineNotes,
  X as MdClose,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useBookDataStore } from '@/store/bookDataStore';
import { useReaderStore } from '@/store/readerStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { eventDispatcher } from '@/utils/event';
import { useEnv } from '@/context/EnvContext';
import { saveViewSettings } from '@/helpers/settings';
import QuickActionMenu from './annotator/QuickActionMenu';
import NotebookToggler from './NotebookToggler';
import TranslationToggler from './TranslationToggler';

/** Entry points only: annotations, search and notebooks keep their existing engines. */
export default function ReaderTools({
  bookKey,
  setIsDropdownOpen,
  onCloseBook,
}: {
  bookKey: string;
  onCloseBook: () => void;
  setIsDropdownOpen?: (open: boolean) => void;
}) {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const viewSettings = useReaderStore((state) => state.getViewSettings(bookKey));
  const openSidebar = (tab: string, search = false) => {
    const { getConfig, setConfig } = useBookDataStore.getState();
    const config = getConfig(bookKey);
    if (config?.viewSettings)
      setConfig(bookKey, { viewSettings: { ...config.viewSettings, sideBarTab: tab } });
    const sidebar = useSidebarStore.getState();
    sidebar.setSideBarBookKey(bookKey);
    sidebar.setSideBarVisible(true);
    sidebar.setSearchBarVisible(search);
    useReaderStore.getState().setHoveredBookKey('');
    setIsDropdownOpen?.(false);
  };
  return (
    <div className='kk-reader-tools dropdown-content no-triangle eink-bordered'>
      <div className='kk-sheet-heading'>
        <h2>{_('Reading Tools')}</h2>
        <button
          className='kk-circle-button'
          aria-label={_('Close')}
          onClick={() => setIsDropdownOpen?.(false)}
        >
          <MdClose size={20} />
        </button>
      </div>
      <button
        className='kk-tool-row'
        disabled={!viewSettings?.scrolled}
        onClick={() => {
          setIsDropdownOpen?.(false);
          eventDispatcher.dispatch('autoscroll-toggle', { bookKey });
        }}
      >
        <MoveDown />
        {_('Gulir otomatis')}
      </button>
      {!useBookDataStore.getState().getBookData(bookKey)?.isFixedLayout && (
        <button
          className='kk-tool-row'
          onClick={() => {
            setIsDropdownOpen?.(false);
            eventDispatcher.dispatch('rsvp-start', { bookKey });
          }}
        >
          <ChevronsRight />
          {_('Baca cepat')}
        </button>
      )}
      <button className='kk-tool-row' onClick={() => openSidebar('toc', true)}>
        <MdOutlineSearch />
        {_('Search in Book')}
      </button>
      <button className='kk-tool-row' onClick={() => openSidebar('bookmarks')}>
        <MdBookmarkBorder />
        {_('Bookmarks')}
      </button>
      <button className='kk-tool-row' onClick={() => openSidebar('annotations')}>
        <MdOutlineNotes />
        {_('Highlights & Notes')}
      </button>
      <div className='kk-tool-shortcuts' onClick={() => setIsDropdownOpen?.(false)}>
        <div>
          <button
            className='kk-circle-button'
            aria-label={_('Toggle Bookmark')}
            onClick={() => eventDispatcher.dispatch('toggle-bookmark', { bookKey })}
          >
            <MdBookmarkBorder size={22} />
          </button>
          <span>{_('Bookmark')}</span>
        </div>
        <div>
          <NotebookToggler bookKey={bookKey} />
          <span>{_('Notebook')}</span>
        </div>
        <div>
          <TranslationToggler bookKey={bookKey} />
          <span>{_('Translation')}</span>
        </div>
      </div>
      <button
        className='kk-tool-row'
        onClick={() => {
          setIsDropdownOpen?.(false);
          onCloseBook();
        }}
      >
        <MdClose />
        {_('Close Book')}
      </button>
      {viewSettings?.enableAnnotationQuickActions && (
        <details className='kk-selection-actions'>
          <summary>{_('Selection actions')}</summary>
          <QuickActionMenu
            bookKey={bookKey}
            menuClassName='kk-inline-menu'
            selectedAction={viewSettings.annotationQuickAction}
            setIsDropdownOpen={setIsDropdownOpen}
            onActionSelect={(action) => {
              saveViewSettings(
                envConfig,
                bookKey,
                'annotationQuickAction',
                viewSettings.annotationQuickAction === action ? null : action,
                false,
                true,
              );
            }}
          />
        </details>
      )}
    </div>
  );
}
