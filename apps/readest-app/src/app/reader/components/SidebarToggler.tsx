import React from 'react';
import { PanelLeft as TbLayoutSidebar, PanelLeftClose as TbLayoutSidebarFilled } from 'lucide-react';

import { useSidebarStore } from '@/store/sidebarStore';
import { useTranslation } from '@/hooks/useTranslation';
import Button from '@/components/Button';

interface SidebarTogglerProps {
  bookKey: string;
}

const SidebarToggler: React.FC<SidebarTogglerProps> = ({ bookKey }) => {
  const _ = useTranslation();
  const { sideBarBookKey, isSideBarVisible, setSideBarBookKey, toggleSideBar } = useSidebarStore();
  const handleToggleSidebar = () => {
    if (sideBarBookKey === bookKey) {
      toggleSideBar();
    } else {
      setSideBarBookKey(bookKey);
      if (!isSideBarVisible) toggleSideBar();
    }
  };
  return (
    <Button
      icon={
        sideBarBookKey === bookKey && isSideBarVisible ? (
          <TbLayoutSidebarFilled className='text-base-content' />
        ) : (
          <TbLayoutSidebar className='text-base-content' />
        )
      }
      onClick={handleToggleSidebar}
      label={_('Toggle Sidebar')}
    />
  );
};

export default SidebarToggler;
