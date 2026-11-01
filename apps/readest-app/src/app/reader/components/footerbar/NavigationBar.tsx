import clsx from 'clsx';
import React from 'react';
import { IoIosList as TOCIcon } from 'react-icons/io';
import { RxSlider as SliderIcon } from 'react-icons/rx';
import { RiFontFamily as FontIcon } from 'react-icons/ri';
import { MdOutlineHeadphones as TTSIcon } from 'react-icons/md';
import { useReaderStore } from '@/store/readerStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useSidebarStore } from '@/store/sidebarStore';
import { useResponsiveSize } from '@/hooks/useResponsiveSize';
import { Insets } from '@/types/misc';

interface NavigationBarProps {
  bookKey: string;
  actionTab: string;
  gridInsets: Insets;
  forceMobileLayout: boolean;
  // Keeps the row clear of iPhone Duo's side status strip (#6307).
  insetStyle?: React.CSSProperties;
  onSetActionTab: (tab: string) => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  bookKey,
  actionTab,
  gridInsets,
  forceMobileLayout,
  insetStyle,
  onSetActionTab,
}) => {
  const isMobile = forceMobileLayout || window.innerWidth < 640 || window.innerHeight < 640;
  const _ = useTranslation();
  const { getViewState } = useReaderStore();
  const { isSideBarVisible, isSideBarPinned } = useSidebarStore();

  const viewState = getViewState(bookKey);
  const tocIconSize = useResponsiveSize(23);
  const fontIconSize = useResponsiveSize(18);
  const navPadding = isMobile ? `max(${gridInsets.bottom}px, env(safe-area-inset-bottom))` : '0px';

  return (
    <div
      className={clsx(
        'kk-reader-dock z-30 mt-auto flex w-full justify-between',
        'eink:border-base-content eink:border-t',
        !forceMobileLayout && 'sm:hidden',
      )}
      style={{
        paddingBottom: `calc(${navPadding} + 8px)`,
        ...insetStyle,
      }}
    >
      {[
        ...(!isSideBarVisible || !isSideBarPinned
          ? [{ tab: 'toc', label: _('Contents'), icon: <TOCIcon size={tocIconSize} /> }]
          : []),
        { tab: 'progress', label: _('Progress'), icon: <SliderIcon size={22} /> },
        { tab: 'font', label: _('Appearance'), icon: <FontIcon size={fontIconSize} /> },
        { tab: 'tts', label: _('Listen'), icon: <TTSIcon size={23} /> },
      ].map(({ tab, label, icon }) => (
        <button
          key={tab}
          type='button'
          className='kk-dock-action'
          aria-label={label}
          aria-pressed={
            tab === 'tts'
              ? !!viewState?.ttsEnabled
              : tab === 'font'
                ? actionTab === 'font' || actionTab === 'color'
                : actionTab === tab
          }
          onClick={() => onSetActionTab(tab)}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};
