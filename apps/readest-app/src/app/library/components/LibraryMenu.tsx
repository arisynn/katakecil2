import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import ViewMenu from './ViewMenu';
import SettingsMenu from './SettingsMenu';

export default function LibraryMenu({
  onPullLibrary,
  onToggleSelectMode,
  setIsDropdownOpen,
}: {
  onPullLibrary: () => void;
  onToggleSelectMode: () => void;
  setIsDropdownOpen?: (open: boolean) => void;
}) {
  const _ = useTranslation();
  const [tab, setTab] = useState<'view' | 'settings'>('view');
  return (
    <div className='kk-library-menu dropdown-content no-triangle'>
      <div className='kk-menu-tabs' role='tablist' aria-label={_('Library Menu')}>
        {(['view', 'settings'] as const).map((value) => (
          <button
            key={value}
            type='button'
            role='tab'
            aria-selected={value === tab}
            id={`kk-menu-${value}`}
            aria-controls='kk-menu-panel'
            onClick={() => setTab(value)}
          >
            {value === 'view' ? _('View') : _('Settings')}
          </button>
        ))}
      </div>
      <div id='kk-menu-panel' role='tabpanel' aria-labelledby={`kk-menu-${tab}`}>
        {tab === 'view' ? (
          <>
            <button
              type='button'
              className='kk-menu-select'
              onClick={() => {
                onToggleSelectMode();
                setIsDropdownOpen?.(false);
              }}
            >
              {_('Select Books')}
            </button>
            <ViewMenu setIsDropdownOpen={setIsDropdownOpen} />
          </>
        ) : (
          <SettingsMenu onPullLibrary={onPullLibrary} setIsDropdownOpen={setIsDropdownOpen} />
        )}
      </div>
    </div>
  );
}
