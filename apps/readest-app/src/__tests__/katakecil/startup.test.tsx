import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import LibraryPage from '@/app/library/page';
import { useThemeStore } from '@/store/themeStore';
import TTSPanel from '@/components/settings/TTSPanel';
import LangPanel from '@/components/settings/LangPanel';
import {
  DEFAULT_VIEW_CONFIG,
  DEFAULT_TTS_CONFIG,
  DEFAULT_TRANSLATOR_CONFIG,
  DEFAULT_WORD_LENS_CONFIG,
  DEFAULT_READSETTINGS,
} from '@/services/constants';
import { useSettingsStore } from '@/store/settingsStore';
import { DEFAULT_BOOK_FONT, DEFAULT_SYSTEM_SETTINGS } from '@/services/constants';
import { saveViewSettings, saveSysSettings } from '@/helpers/settings';
import type { SystemSettings } from '@/types/settings';
import { fetchCatalog } from '@/services/katakecil/catalog';
import { useLibraryStore } from '@/store/libraryStore';
import type { Book } from '@/types/book';
import type { ViewSettings } from '@/types/book';

const env = vi.hoisted(() => ({ appService: { isMobile: true }, envConfig: {} }));
vi.mock('@/context/EnvContext', () => ({ useEnv: () => env }));
vi.mock('@/services/translators/cache', () => ({
  getTranslation: vi.fn(),
  setTranslation: vi.fn(),
}));
vi.mock('@/hooks/useLibrary', () => ({ useLibrary: () => ({ libraryLoaded: true }) }));
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => {} }));
vi.mock('@/hooks/useCustomFonts', () => ({ useCustomFonts: () => {} }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (text: string) => text }));
vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/services/katakecil/catalog', () => ({
  cachedCatalog: () => [],
  fetchCatalog: vi.fn().mockResolvedValue([]),
  prepareCatalogBook: vi.fn(),
}));
vi.mock('@/components/AboutWindow', () => ({
  AboutWindow: () => null,
  setAboutDialogVisible: vi.fn(),
}));
vi.mock('@/components/command-palette', () => ({
  useCommandPalette: () => ({ open: vi.fn() }),
}));
vi.mock('@/components/Dialog', () => ({
  default: ({
    children,
    header,
    isOpen,
    onClose,
  }: {
    children: React.ReactNode;
    header?: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <section role='dialog'>
        {header}
        {children}
        <button onClick={onClose}>Dismiss settings</button>
      </section>
    ) : null,
}));
vi.mock('@/components/Dropdown', () => ({
  default: ({
    label,
    toggleButton,
    children,
  }: {
    label: string;
    toggleButton: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const [open, setOpen] = React.useState(false);
    return (
      <div>
        <button aria-label={label} onClick={() => setOpen(!open)}>
          {toggleButton}
        </button>
        {open && children}
      </div>
    );
  },
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/hooks/useUICSS', () => ({ useUICSS: () => {} }));
vi.mock('@/hooks/usePullToRefresh', () => ({ usePullToRefresh: () => {} }));
vi.mock('@/app/library/components/Bookshelf', () => ({
  default: ({ libraryBooks }: { libraryBooks: Book[] }) => (
    <div aria-label='Bookshelf'>
      {libraryBooks.map((book) => (
        <span key={book.hash}>{book.title}</span>
      ))}
    </div>
  ),
}));
vi.mock('@/app/library/components/BookshelvesDialog', () => ({ default: () => null }));
vi.mock('@/app/library/components/CacheManagerWindow', () => ({
  CacheManagerWindow: () => null,
  setCacheManagerDialogVisible: vi.fn(),
}));
vi.mock('@/components/stats/ReadingStatsDialog', () => ({
  default: () => null,
  setReadingStatsDialogVisible: vi.fn(),
}));
vi.mock('@/components/KeyboardShortcutsHelp', () => ({ KeyboardShortcutsHelp: () => null }));
vi.mock('@/components/Toast', () => ({ Toast: () => null }));
vi.mock('@/components/metadata', () => ({ BookDetailModal: () => null }));
vi.mock('@/helpers/settings', async (original) => ({
  ...(await original<typeof import('@/helpers/settings')>()),
  saveViewSettings: vi.fn(),
  saveSysSettings: vi.fn(),
}));

const restoredSettings = {
  ...DEFAULT_SYSTEM_SETTINGS,
  version: 1,
  globalReadSettings: DEFAULT_READSETTINGS,
  globalViewSettings: {
    ...DEFAULT_VIEW_CONFIG,
    ...DEFAULT_TTS_CONFIG,
    ...DEFAULT_TRANSLATOR_CONFIG,
    ...DEFAULT_WORD_LENS_CONFIG,
    ...DEFAULT_BOOK_FONT,
    defaultFontSize: 23,
  } as ViewSettings,
} as SystemSettings;

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  localStorage.clear();
  useLibraryStore.getState().setLibrary([]);
  vi.mocked(fetchCatalog).mockResolvedValue([]);
  useThemeStore.setState({ safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 } });
  vi.mocked(saveSysSettings).mockClear();
  useSettingsStore.setState({ settings: {} as SystemSettings, isSettingsDialogOpen: false });
  vi.mocked(saveViewSettings).mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Catalog settings hydration', () => {
  it('renders a cold home page without mounting or saving font settings', async () => {
    expect(() => render(<LibraryPage />)).not.toThrow();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Settings Menu' })).toBeNull();
    expect(saveViewSettings).not.toHaveBeenCalled();
    await act(async () => {});
  });

  it('opens only on request after hydration, preserves restored fonts, and closes', async () => {
    render(<LibraryPage />);
    await act(async () => {
      useSettingsStore.getState().setSettings(restoredSettings);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(saveViewSettings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Settings Menu' }));
    fireEvent.click(screen.getByText('Settings', { exact: true }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByDisplayValue('23')).toBeTruthy();
    expect(useSettingsStore.getState().settings.globalViewSettings.defaultFontSize).toBe(23);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss settings' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('passes only published Supabase books to the native shelf without deleting old imports', async () => {
    useSettingsStore.setState({ settings: restoredSettings });
    const imported = {
      hash: 'old-local',
      title: 'Private import',
      author: 'Author',
      format: 'EPUB',
      createdAt: 1,
      updatedAt: 1,
    } as Book;
    useLibraryStore.getState().setLibrary([imported]);
    vi.mocked(fetchCatalog).mockResolvedValue([
      {
        id: 'published',
        title: 'Published story',
        author: 'Author',
        synopsis: '',
        cover_url: null,
        language: 'id',
        status: 'ongoing',
        revision: 'v1',
        section_ids: ['a'],
        next_release_at: null,
      },
    ]);
    render(<LibraryPage />);
    await act(async () => {});
    expect(screen.getByText('Published story')).toBeTruthy();
    expect(screen.queryByText('Private import')).toBeNull();
    expect(useLibraryStore.getState().library).toContainEqual(imported);
  });

  it('keeps local reading settings without buttons that redirect to an account', async () => {
    useSettingsStore.setState({ settings: restoredSettings });
    const tts = render(<TTSPanel bookKey='' onRegisterReset={() => {}} />);
    expect(screen.queryByText('Custom TTS Services')).toBeNull();
    expect(screen.getByText('TTS Highlighting')).toBeTruthy();
    tts.unmount();
    render(<LangPanel bookKey='' onRegisterReset={() => {}} />);
    expect(screen.queryByText('Custom Translators')).toBeNull();
    expect(screen.getByText('Translate To')).toBeTruthy();
    await act(async () => {});
  });

  it('keeps native view options while removing account and book import controls', async () => {
    useSettingsStore.setState({ settings: restoredSettings });
    render(<LibraryPage />);
    await act(async () => {});
    expect(screen.getByLabelText('Bookshelf')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Import Books' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Settings Menu' }));
    expect(screen.queryByText('Sign In')).toBeNull();
    expect(screen.getByText('Settings', { exact: true })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'View Menu' }));
    fireEvent.click(screen.getByText('List', { exact: true }));
    expect(saveSysSettings).toHaveBeenCalledWith(expect.anything(), 'libraryViewMode', 'list');
    expect(screen.getByText('Grid', { exact: true })).toBeTruthy();
  });
});
