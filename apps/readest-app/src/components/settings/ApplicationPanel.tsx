import { useTranslation } from '@/hooks/useTranslation';
import { useState } from 'react';
import { BarChart3, Info, KeyRound, RefreshCw } from 'lucide-react';
import { useEnv } from '@/context/EnvContext';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppLockStore } from '@/store/appLockStore';
import { setReadingStatsDialogVisible } from '@/components/stats/ReadingStatsDialog';
import { setAboutDialogVisible } from '@/components/AboutWindow';
import { BoxedList, NavigationRow } from './primitives';

export default function ApplicationPanel() {
  const _ = useTranslation();
  const { appService } = useEnv();
  const { setLibrary } = useLibraryStore();
  const { settings } = useSettingsStore();
  const { openDialog } = useAppLockStore();
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');
  const refreshMetadata = async () => {
    if (!appService || refreshing) return;
    setRefreshing(true);
    try {
      const books = await appService.loadLibraryBooks();
      const active = books.filter((book) => !book.deletedAt);
      let count = 0;
      for (const [index, book] of active.entries()) {
        setStatus(`${index + 1} / ${active.length}`);
        try {
          if (await appService.refreshBookMetadata(book)) count++;
        } catch {
          /* Retain unreadable files and their existing metadata. */
        }
      }
      await appService.saveLibraryBooks(books);
      setLibrary(books);
      setStatus(`${count} buku diperbarui`);
    } catch {
      setStatus(_('Metadata belum dapat diperbarui. Koleksi tetap tersimpan.'));
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <div className='space-y-6'>
      <BoxedList title={_('Koleksi & informasi')}>
        <NavigationRow
          icon={BarChart3}
          title={_('Statistik membaca')}
          onClick={() => setReadingStatsDialogVisible(true)}
        />
        <NavigationRow
          icon={RefreshCw}
          title={_('Perbarui metadata lokal')}
          status={status || _('Baca ulang informasi dari berkas buku')}
          disabled={refreshing}
          onClick={() => void refreshMetadata()}
        />
        <NavigationRow
          icon={Info}
          title={_('Tentang Kata Kecil')}
          onClick={() => setAboutDialogVisible(true)}
        />
      </BoxedList>
      <BoxedList
        title={_('Kunci aplikasi')}
        description={_('PIN melindungi akses aplikasi pada perangkat ini.')}
      >
        <NavigationRow
          icon={KeyRound}
          title={settings.pinCodeEnabled ? _('Ubah PIN') : _('Atur PIN')}
          onClick={() => openDialog(settings.pinCodeEnabled ? 'change' : 'set')}
        />
        {settings.pinCodeEnabled && (
          <NavigationRow title={_('Nonaktifkan PIN')} onClick={() => openDialog('disable')} />
        )}
      </BoxedList>
    </div>
  );
}
