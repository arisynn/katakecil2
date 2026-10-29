import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getAppVersion } from '@/utils/version';
import Dialog from './Dialog';

export const setAboutDialogVisible = (visible: boolean) => {
  document
    .getElementById('about_window')
    ?.dispatchEvent(new CustomEvent('setDialogVisibility', { detail: { visible } }));
};
export const AboutWindow = () => {
  const _ = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const dialog = document.getElementById('about_window');
    const handler = (event: Event) =>
      setIsOpen((event as CustomEvent<{ visible: boolean }>).detail.visible);
    dialog?.addEventListener('setDialogVisibility', handler);
    return () => dialog?.removeEventListener('setDialogVisibility', handler);
  }, []);
  return (
    <Dialog
      id='about_window'
      isOpen={isOpen}
      title={_('About Kata Kecil')}
      onClose={() => setIsOpen(false)}
      boxClassName='sm:w-[420px]! sm:h-auto'
    >
      {isOpen && (
        <div className='flex flex-col items-center gap-4 px-6 py-8 text-center'>
          <img className='kk-mark h-16 w-16' src='/katakecil-mark.svg' alt='' />
          <h2 className='text-2xl font-semibold'>Kata Kecil</h2>
          <p className='kk-muted text-sm'>{_('A quiet space for reading.')}</p>
          <p className='kk-muted text-xs'>
            {_('Version {{version}}', { version: getAppVersion() })}
          </p>
          <p className='text-xs leading-relaxed'>
            Powered by{' '}
            <a className='underline' href='https://github.com/readest/readest'>
              Readest
            </a>{' '}
            and{' '}
            <a className='underline' href='https://github.com/johnfactotum/foliate-js'>
              Foliate
            </a>
            .
          </p>
          <p className='kk-muted text-xs'>
            {_('Source code and open-source licenses are included in this distribution.')}
          </p>
        </div>
      )}
    </Dialog>
  );
};
