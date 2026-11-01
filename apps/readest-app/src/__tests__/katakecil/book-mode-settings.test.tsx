import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookModePanel from '@/components/settings/BookModePanel';
import { useReaderStore } from '@/store/readerStore';
import { useBookDataStore, type BookData } from '@/store/bookDataStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_VIEW_CONFIG,
  DEFAULT_BOOK_FONT,
} from '@/services/constants';
import type { SystemSettings } from '@/types/settings';
import type { ViewSettings } from '@/types/book';
import type { BookDoc } from '@/libs/document';
vi.mock('@/context/EnvContext', () => ({ useEnv: () => ({ envConfig: {}, appService: {} }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (text: string) => text }));
afterEach(cleanup);
describe('document settings persistence', () => {
  it('persists this-book scroll flow and retains CFI and annotations without changing global defaults', async () => {
    const viewSettings = {
      ...DEFAULT_VIEW_CONFIG,
      ...DEFAULT_BOOK_FONT,
      isGlobal: false,
      scrolled: false,
    } as ViewSettings;
    const globalViewSettings = { ...viewSettings, isGlobal: true };
    const saveConfig = vi.fn().mockResolvedValue(undefined);
    const location = 'epubcfi(/6/8!/4/2/1:8)';
    const booknotes = [{ id: 'bookmark', type: 'bookmark', cfi: location }];
    useSettingsStore.setState({
      settings: { ...DEFAULT_SYSTEM_SETTINGS, globalViewSettings } as SystemSettings,
    });
    useBookDataStore.setState({
      saveConfig,
      booksData: {
        book: {
          id: 'book',
          book: null,
          file: null,
          isFixedLayout: false,
          bookDoc: { dir: 'ltr', rendition: {} } as BookDoc,
          config: { location, booknotes, viewSettings },
        } as BookData,
      },
    });
    useReaderStore.setState({
      bookKeys: ['book-0'],
      viewStates: {
        'book-0': { isPrimary: true, view: null, viewSettings } as ReturnType<
          typeof useReaderStore.getState
        >['viewStates'][string],
      },
    });
    render(<BookModePanel bookKey='book-0' />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Scrolled Mode' }));
    await waitFor(() => expect(saveConfig).toHaveBeenCalled());
    const config = useBookDataStore.getState().getConfig('book-0');
    expect(config?.viewSettings?.scrolled).toBe(true);
    expect(config?.location).toBe(location);
    expect(config?.booknotes).toEqual(booknotes);
    expect(useSettingsStore.getState().settings.globalViewSettings.scrolled).toBe(false);
  });
});
