import { Settings, RefreshCw, Maximize, ChartNoAxesColumn } from 'lucide-react';
import { useEnv } from '@/context/EnvContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { canToggleFullScreen, toggleFullScreen } from '@/utils/window';
import { setReadingStatsDialogVisible } from '@/components/stats/ReadingStatsDialog';

export default function SettingsMenu({
  onPullLibrary,
  setIsDropdownOpen,
}: {
  onPullLibrary: (fullRefresh?: boolean, verbose?: boolean) => void;
  setIsDropdownOpen?: (open: boolean) => void;
}) {
  const _ = useTranslation();
  const { appService } = useEnv();
  const { setSettingsDialogOpen, setSettingsDialogBookKey, setRequestedPanel } = useSettingsStore();
  const close = () => setIsDropdownOpen?.(false);
  return (
    <div className='kk-menu-actions'>
      <button
        onClick={() => {
          close();
          setRequestedPanel(null);
          setSettingsDialogBookKey('');
          setSettingsDialogOpen(true);
        }}
      >
        <Settings size={20} />
        <span>{_('Semua pengaturan')}</span>
      </button>
      <button
        onClick={() => {
          close();
          onPullLibrary(true, true);
        }}
      >
        <RefreshCw size={20} />
        <span>{_('Refresh Collection')}</span>
      </button>
      <button
        onClick={() => {
          close();
          setReadingStatsDialogVisible(true);
        }}
      >
        <ChartNoAxesColumn size={20} />
        <span>{_('Reading Statistics')}</span>
      </button>
      {canToggleFullScreen(appService) && (
        <button
          onClick={() => {
            close();
            toggleFullScreen(appService);
          }}
        >
          <Maximize size={20} />
          <span>{_('Fullscreen')}</span>
        </button>
      )}
    </div>
  );
}
