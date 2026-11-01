import React, { useState } from 'react';

import { BookDoc } from '@/libs/document';
import { useSidebarStore } from '@/store/sidebarStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { useSettingsStore } from '@/store/settingsStore';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import 'overlayscrollbars/overlayscrollbars.css';

import TOCView from './TOCView';
import BooknoteView from './BooknoteView';
import TabNavigation from './TabNavigation';
import ChatHistoryView from './ChatHistoryView';

const SidebarContent: React.FC<{
  bookDoc: BookDoc;
  sideBarBookKey: string;
}> = ({ bookDoc, sideBarBookKey }) => {
  const { setSearchBarVisible } = useSidebarStore();
  const { getConfig, setConfig } = useBookDataStore();
  const { settings } = useSettingsStore();
  const config = getConfig(sideBarBookKey);
  const [fallbackTab, setFallbackTab] = useState('toc');
  const aiEnabled = settings?.aiSettings?.enabled ?? false;
  const configuredTab = config?.viewSettings?.sideBarTab || fallbackTab;
  const activeTab = configuredTab === 'history' && !aiEnabled ? 'toc' : configuredTab;
  const handleTabChange = (tab: string) => {
    if (activeTab === tab) return;
    setSearchBarVisible(false);
    setFallbackTab(tab);
    const latestConfig = getConfig(sideBarBookKey);
    if (latestConfig)
      setConfig(sideBarBookKey, {
        viewSettings: { ...latestConfig.viewSettings, sideBarTab: tab },
      });
  };

  return (
    <>
      <div className='sidebar-content flex h-full min-h-0 grow flex-col font-sans text-base font-normal sm:text-sm'>
        {activeTab === 'history' ? (
          <ChatHistoryView bookKey={sideBarBookKey} />
        ) : (
          <OverlayScrollbarsComponent
            className='min-h-0 flex-1'
            options={{
              // The tab content is width-bound; x stays hidden so oversized
              // touch-target halos (e.g. the toolbar's dropdown toggle) can't
              // turn into a horizontal scrollbar.
              overflow: { x: 'hidden' },
              scrollbars: { autoHide: 'scroll', clickScroll: true },
              showNativeOverlaidScrollbars: false,
            }}
            defer
          >
            <div className='scroll-container h-full'>
              {activeTab === 'toc' && (bookDoc.toc || bookDoc.getPageThumbnail) && (
                <TOCView toc={bookDoc.toc ?? []} bookDoc={bookDoc} bookKey={sideBarBookKey} />
              )}
              {activeTab === 'annotations' && (
                <BooknoteView type='annotation' toc={bookDoc.toc ?? []} bookKey={sideBarBookKey} />
              )}
              {activeTab === 'bookmarks' && (
                <BooknoteView type='bookmark' toc={bookDoc.toc ?? []} bookKey={sideBarBookKey} />
              )}
            </div>
          </OverlayScrollbarsComponent>
        )}
      </div>
      <div
        className='shrink-0'
        style={
          {
            // paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) / 2)',
          }
        }
      >
        <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </>
  );
};

export default SidebarContent;
