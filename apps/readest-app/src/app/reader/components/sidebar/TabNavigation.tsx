import { useTranslation } from '@/hooks/useTranslation';
import { List, NotebookPen, Bookmark, MessageSquare } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
export default function TabNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const _ = useTranslation();
  const aiEnabled = useSettingsStore((s) => s.settings?.aiSettings?.enabled ?? false);
  const tabs = [
    { id: 'toc', label: _('Isi'), icon: List },
    { id: 'annotations', label: _('Catatan'), icon: NotebookPen },
    { id: 'bookmarks', label: _('Penanda'), icon: Bookmark },
    ...(aiEnabled ? [{ id: 'history', label: _('Chat'), icon: MessageSquare }] : []),
  ];
  return (
    <div className='kk-sidebar-tabs' role='tablist' aria-label={_('Panel bacaan')}>
      {tabs.map(({ id, label, icon: Icon }, index) => (
        <button
          key={id}
          type='button'
          role='tab'
          aria-selected={id === activeTab}
          tabIndex={id === activeTab ? 0 : -1}
          onClick={() => onTabChange(id)}
          onKeyDown={(event) => {
            const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
            if (offset || event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : (index + offset + tabs.length) % tabs.length;
              onTabChange(tabs[next]!.id);
              (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
            }
          }}
        >
          <Icon size={19} aria-hidden='true' />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
