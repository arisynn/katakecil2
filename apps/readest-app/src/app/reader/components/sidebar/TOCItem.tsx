import clsx from 'clsx';
import { useTranslation } from '@/hooks/useTranslation';
import React, { useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import { navigationLabel, splitNavigationLabel, tocPageNumber } from '../../utils/navigationLabel';
import { TOCItem } from '@/libs/document';
import { getContentMd5 } from '@/utils/misc';

const createExpanderIcon = (isExpanded: boolean) => {
  return (
    <svg
      viewBox='0 0 8 10'
      width='8'
      height='10'
      className={clsx(
        'text-base-content transform transition-transform',
        isExpanded ? 'rotate-90' : 'rotate-0',
      )}
      style={{ transformOrigin: 'center' }}
      fill='currentColor'
      aria-hidden='true'
      focusable='false'
    >
      <polygon points='0 0, 8 5, 0 10' />
    </svg>
  );
};

export interface FlatTOCItem {
  item: TOCItem;
  depth: number;
  index: number;
  isExpanded?: boolean;
  // Owns pages whose thumbnails unfold beneath it (see computeTOCPageRanges).
  hasPages?: boolean;
}

// A row of page thumbnails shown under an unfolded TOC item.
export interface PageThumbnailsItem {
  isPageThumbnails: true;
  depth: number;
  pages: number[];
}

export type TOCListItem = FlatTOCItem | PageThumbnailsItem;

export const isPageThumbnailsItem = (item: TOCDisplayItem): item is PageThumbnailsItem =>
  'isPageThumbnails' in item;

// Synthetic row injected right under the active TOC item to surface the
// current reading page (see buildTOCDisplayItems).
export interface CurrentPositionItem {
  isCurrentPosition: true;
  depth: number;
  page: number;
}

export type TOCDisplayItem = TOCListItem | CurrentPositionItem;

export const isCurrentPositionItem = (item: TOCDisplayItem): item is CurrentPositionItem =>
  'isCurrentPosition' in item;

// Insert a "current position" row immediately after the active TOC item so the
// reader can see exactly how far they've progressed within the highlighted
// section. The row sits one level deeper than the active item. Inserting it
// *after* the active item leaves that item's index untouched, so the auto-scroll
// logic in TOCView keeps targeting the right row.
export const buildTOCDisplayItems = <T extends TOCListItem>(
  flatItems: T[],
  activeHref: string | null,
  currentPage: number | null | undefined,
): (T | CurrentPositionItem)[] => {
  if (!activeHref || currentPage == null) return flatItems;
  const activeIndex = flatItems.findIndex((f) => 'item' in f && f.item.href === activeHref);
  if (activeIndex === -1) return flatItems;
  const currentRow: CurrentPositionItem = {
    isCurrentPosition: true,
    depth: flatItems[activeIndex]!.depth + 1,
    page: currentPage,
  };
  const result: (T | CurrentPositionItem)[] = flatItems.slice();
  result.splice(activeIndex + 1, 0, currentRow);
  return result;
};

const TOCItemView = React.memo<{
  bookKey: string;
  flatItem: FlatTOCItem;
  itemSize?: number;
  isActive: boolean;
  fixedPages?: boolean;
  displayLabel?: string;
  onToggleExpand: (item: TOCItem) => void;
  onItemClick: (item: TOCItem) => void;
}>(({ flatItem, itemSize, isActive, onToggleExpand, onItemClick, fixedPages, displayLabel }) => {
  const _ = useTranslation();
  const { item, depth } = flatItem;
  const expandable = !!item.subitems || !!flatItem.hasPages;

  const pageNumber = tocPageNumber(item, fixedPages);
  const { caption, title } = splitNavigationLabel(displayLabel ?? item.label);
  const ariaLabel =
    navigationLabel(item.label) +
    (pageNumber !== null ? `, ${fixedPages ? 'halaman' : 'lokasi'} ${pageNumber}` : '');

  const handleToggleExpand = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onToggleExpand(item);
    },
    [item, onToggleExpand],
  );

  const handleClickItem = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      event.preventDefault();
      onItemClick(item);
    },
    [item, onItemClick],
  );

  return (
    <div
      tabIndex={0}
      role='treeitem'
      onClick={item.href ? handleClickItem : undefined}
      onKeyDown={
        item.href ? (e) => ['Enter', ' '].includes(e.key) && handleClickItem(e) : undefined
      }
      aria-label={ariaLabel}
      aria-current={isActive ? 'page' : undefined}
      aria-expanded={expandable ? (flatItem.isExpanded ? 'true' : 'false') : undefined}
      aria-selected={isActive ? 'true' : 'false'}
      data-href={item.href ? getContentMd5(item.href) : undefined}
      className={clsx(
        'kk-toc-entry flex w-full cursor-pointer items-center rounded-md py-4 sm:py-2 sm:hover:bg-base-300/75',
        isActive && 'kk-toc-active',
      )}
      style={{
        height: itemSize ? `${itemSize}px` : 'auto',
        paddingInlineStart: `${(depth + 1) * 12}px`,
      }}
    >
      {expandable && (
        <button
          onClick={handleToggleExpand}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          aria-label={flatItem.isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
          className='inline-block cursor-pointer'
          style={{
            padding: '12px',
            margin: '-12px',
          }}
        >
          {createExpanderIcon(flatItem.isExpanded || false)}
        </button>
      )}
      <div className='kk-toc-label ms-2 min-w-0 break-words'>
        {caption && <span className='kk-toc-caption'>{caption}</span>}
        <span className='kk-toc-title'>{title}</span>
        {isActive && <span className='kk-toc-reading'>{_('Sedang dibaca')}</span>}
      </div>
      {pageNumber !== null && (
        <span aria-hidden='true' className='kk-toc-location'>
          {fixedPages ? 'Hlm.' : 'Lok.'} {pageNumber}
        </span>
      )}
    </div>
  );
});

TOCItemView.displayName = 'TOCItemView';

interface ListRowProps {
  fixedPages?: boolean;
  displayLabel?: string;
  bookKey: string;
  flatItem: FlatTOCItem;
  itemSize?: number;
  activeHref: string | null;
  onToggleExpand: (item: TOCItem) => void;
  onItemClick: (item: TOCItem) => void;
}

export const StaticListRow: React.FC<ListRowProps> = ({
  bookKey,
  flatItem,
  itemSize,
  activeHref,
  onToggleExpand,
  onItemClick,
  fixedPages,
  displayLabel,
}) => {
  const isActive = activeHref === flatItem.item.href;

  return (
    <div
      className={clsx(
        'border-base-300 w-full border-b sm:border-none',
        'pe-4 ps-2 pt-[1px] sm:pe-2',
      )}
      title={flatItem.item.label || ''}
    >
      <TOCItemView
        bookKey={bookKey}
        fixedPages={fixedPages}
        displayLabel={displayLabel}
        flatItem={flatItem}
        itemSize={itemSize}
        isActive={isActive}
        onToggleExpand={onToggleExpand}
        onItemClick={onItemClick}
      />
    </div>
  );
};

export const CurrentPositionRow: React.FC<{
  depth: number;
  page: number;
  onClick?: () => void;
}> = ({ depth, onClick }) => {
  const _ = useTranslation();
  const label = _('Posisi Saat Ini');

  const handleClick = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      event.preventDefault();
      onClick?.();
    },
    [onClick],
  );

  return (
    <div
      className={clsx(
        'border-base-300 w-full border-b sm:border-none',
        'pe-4 ps-2 pt-[1px] sm:pe-2',
      )}
      title={label}
    >
      <div
        tabIndex={onClick ? 0 : undefined}
        role='treeitem'
        aria-current='true'
        aria-label={label}
        onClick={onClick ? handleClick : undefined}
        onKeyDown={onClick ? (e) => ['Enter', ' '].includes(e.key) && handleClick(e) : undefined}
        className={clsx(
          'flex w-full items-center rounded-md py-4 sm:py-2',
          'text-bold-in-eink sm:bg-base-300/65 sm:text-base-content text-blue-500',
          onClick && 'cursor-pointer sm:hover:bg-base-300/75',
        )}
        style={{ paddingInlineStart: `${depth * 12 + 8}px` }}
      >
        <BookOpen className='h-4 w-4 shrink-0' aria-hidden='true' />
        <div
          className='ms-2 truncate text-ellipsis'
          style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};
