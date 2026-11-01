import React, { useEffect, useRef, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { MdClose, MdManageSearch } from 'react-icons/md';
import { PiDotsThree } from 'react-icons/pi';
import { useThemeStore } from '@/store/themeStore';
import { useTranslation } from '@/hooks/useTranslation';
import type { LibrarySearchConfig, LibrarySearchTarget } from '@/types/book';
import { useLibraryStore } from '@/store/libraryStore';
import useShortcuts from '@/hooks/useShortcuts';
import Dropdown from '@/components/Dropdown';
import LibrarySearchOptionsMenu from './LibrarySearchOptionsMenu';
import LibraryMenu from './LibraryMenu';

interface LibraryHeaderProps {
  isSelectMode: boolean;
  isSelectAll: boolean;
  onPullLibrary: () => void;
  onToggleSelectMode: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  searchQuery: string;
  searchTarget: LibrarySearchTarget;
  searchConfig: LibrarySearchConfig;
  onSearchConfigChange: (config: LibrarySearchConfig) => void;
  onSearchQueryChange: (query: string) => void;
  onSearchTargetChange: (target: LibrarySearchTarget) => void;
}

const LibraryHeader: React.FC<LibraryHeaderProps> = (props) => {
  const _ = useTranslation();
  const { safeAreaInsets: insets } = useThemeStore();
  const count = useLibraryStore((state) => state.currentBookshelf.length);
  const [searchOpen, setSearchOpen] = useState(!!props.searchQuery);
  const input = useRef<HTMLInputElement>(null);
  const showSearch = searchOpen || !!props.searchQuery;
  useShortcuts({ onToggleSelectMode: props.onToggleSelectMode });
  useEffect(() => {
    if (searchOpen) input.current?.focus();
  }, [searchOpen]);
  if (!insets) return null;
  const closeSearch = () => {
    props.onSearchQueryChange('');
    setSearchOpen(false);
  };

  return (
    <header
      className='kk-library-header'
      style={{
        paddingTop: `max(24px, ${insets.top}px)`,
        paddingInlineStart: `max(24px, ${insets.left}px)`,
        paddingInlineEnd: `max(24px, ${insets.right}px)`,
      }}
    >
      <div className='kk-library-heading'>
        <div className='kk-brand'>
          <img src='/katakecil-mark.svg' alt='' width={30} height={36} className='kk-mark' />
          <h1>Kata Kecil</h1>
        </div>
        <div className='kk-header-actions eink-bordered flex items-center'>
          {props.isSelectMode ? (
            <>
              <button
                type='button'
                className='kk-text-button'
                onClick={props.isSelectAll ? props.onDeselectAll : props.onSelectAll}
              >
                {props.isSelectAll ? _('Deselect') : _('Select All')}
              </button>
              <button
                type='button'
                className='kk-circle-button eink-bordered'
                aria-label={_('Cancel')}
                onClick={props.onToggleSelectMode}
              >
                <MdClose size={22} />
              </button>
            </>
          ) : (
            <>
              <button
                type='button'
                className='kk-circle-button eink-bordered'
                aria-label={_('Search Books')}
                aria-expanded={showSearch}
                aria-controls='kk-library-search'
                onClick={() => (showSearch ? closeSearch() : setSearchOpen(true))}
              >
                {showSearch ? <MdClose size={22} /> : <FaSearch size={18} />}
              </button>
              <Dropdown
                label={_('Library Menu')}
                className='dropdown-bottom dropdown-end'
                buttonClassName='kk-circle-button eink-bordered'
                toggleButton={<PiDotsThree size={27} />}
              >
                <LibraryMenu
                  onPullLibrary={props.onPullLibrary}
                  onToggleSelectMode={props.onToggleSelectMode}
                />
              </Dropdown>
            </>
          )}
        </div>
      </div>
      <div className='kk-library-intro'>
        <h2>{_('Your Library')}</h2>
        <span>{_('{{count}} books', { count })}</span>
      </div>
      {showSearch && (
        <div id='kk-library-search' className='kk-library-search eink-bordered' role='search'>
          <button
            type='button'
            className='kk-circle-button'
            aria-label={props.searchTarget === 'text' ? _('Full Text Search') : _('Search Books')}
            aria-pressed={props.searchTarget === 'text'}
            onClick={() =>
              props.onSearchTargetChange(props.searchTarget === 'text' ? 'books' : 'text')
            }
          >
            {props.searchTarget === 'text' ? <MdManageSearch size={24} /> : <FaSearch size={17} />}
          </button>
          <input
            ref={input}
            value={props.searchQuery}
            type='search'
            spellCheck={false}
            aria-label={_('Search Books')}
            placeholder={
              props.searchTarget === 'text'
                ? _('Search contents in {{count}} Book(s)...', { count })
                : _('Search Books...')
            }
            onChange={(event) => props.onSearchQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                closeSearch();
              }
            }}
          />
          {props.searchTarget === 'text' && (
            <Dropdown
              label={_('Search Options')}
              className='dropdown-bottom dropdown-end'
              buttonClassName='kk-circle-button'
              toggleButton={<PiDotsThree size={24} />}
            >
              <LibrarySearchOptionsMenu
                config={props.searchConfig}
                onConfigChange={props.onSearchConfigChange}
              />
            </Dropdown>
          )}
        </div>
      )}
    </header>
  );
};
export default LibraryHeader;
