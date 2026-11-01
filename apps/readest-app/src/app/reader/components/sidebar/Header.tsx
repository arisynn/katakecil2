import { Search, Menu, Pin, PinOff, ChevronLeft } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import Dropdown from '@/components/Dropdown';
import BookMenu from './BookMenu';
export default function SidebarHeader({
  bookKey: _bookKey,
  isPinned,
  isSearchBarVisible,
  onClose,
  onTogglePin,
  onToggleSearchBar,
}: {
  bookKey: string;
  isPinned: boolean;
  isSearchBarVisible: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  onToggleSearchBar: () => void;
}) {
  const _ = useTranslation();
  return (
    <div className='sidebar-header flex items-center'>
      <button
        title={_('Close')}
        aria-label={_('Close')}
        onClick={onClose}
        className='kk-circle-button'
      >
        <ChevronLeft size={22} />
      </button>
      <h2>{_('Bacaan')}</h2>
      <button
        title={isSearchBarVisible ? _('Hide Search Bar') : _('Show Search Bar')}
        aria-label={isSearchBarVisible ? _('Hide Search Bar') : _('Show Search Bar')}
        aria-pressed={isSearchBarVisible}
        onClick={onToggleSearchBar}
        className='kk-circle-button'
      >
        <Search size={20} />
      </button>
      <Dropdown
        label={_('Book Menu')}
        showTooltip={false}
        className='dropdown-bottom dropdown-end'
        buttonClassName='kk-circle-button'
        toggleButton={<Menu size={20} />}
      >
        <BookMenu />
      </Dropdown>
      <button
        title={isPinned ? _('Unpin Sidebar') : _('Pin Sidebar')}
        onClick={onTogglePin}
        className='kk-circle-button kk-sidebar-pin'
      >
        {isPinned ? <PinOff size={19} /> : <Pin size={19} />}
      </button>
    </div>
  );
}
