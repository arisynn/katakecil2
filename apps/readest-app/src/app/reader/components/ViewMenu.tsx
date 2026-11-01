import { useTranslation } from '@/hooks/useTranslation';
import { Settings, Maximize, Share2, BarChart3 } from 'lucide-react';
import { useEnv } from '@/context/EnvContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { useReaderStore } from '@/store/readerStore';
import { canToggleFullScreen, toggleFullScreen } from '@/utils/window';
import { setReadingStatsDialogVisible } from '@/components/stats/ReadingStatsDialog';
import { eventDispatcher } from '@/utils/event';
export default function ViewMenu({
  bookKey,
  setIsDropdownOpen,
}: {
  bookKey: string;
  setIsDropdownOpen?: (open: boolean) => void;
  onShowMetaHashDialog?: () => void;
}) {
  const _ = useTranslation();
  const { appService } = useEnv();
  const { setSettingsDialogBookKey, setSettingsDialogOpen, setRequestedPanel } = useSettingsStore();
  const close = () => setIsDropdownOpen?.(false);
  return (
    <div className='kk-library-menu kk-menu-actions dropdown-content no-triangle'>
      <button
        onClick={() => {
          close();
          setSettingsDialogBookKey(bookKey);
          setRequestedPanel(null);
          setSettingsDialogOpen(true);
        }}
      >
        <Settings size={20} />
        {_('Semua pengaturan')}
      </button>
      {canToggleFullScreen(appService) && (
        <button
          onClick={() => {
            close();
            toggleFullScreen(appService);
          }}
        >
          <Maximize size={20} />
          {_('Layar penuh')}
        </button>
      )}
      <button
        onClick={() => {
          close();
          setReadingStatsDialogVisible(true);
        }}
      >
        <BarChart3 size={20} />
        {_('Statistik membaca')}
      </button>
      <button
        onClick={() => {
          close();
          const book = useBookDataStore.getState().getBookData(bookKey)?.book;
          if (book)
            eventDispatcher.dispatch('show-share-dialog', {
              book,
              cfi: useReaderStore.getState().getProgress(bookKey)?.location ?? null,
            });
        }}
      >
        <Share2 size={20} />
        {_('Bagikan buku')}
      </button>
    </div>
  );
}
