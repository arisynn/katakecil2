import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import CatalogShelf from '@/components/katakecil/CatalogShelf';
import { useSettingsStore } from '@/store/settingsStore';
import { DEFAULT_BOOK_FONT, DEFAULT_SYSTEM_SETTINGS } from '@/services/constants';
import { saveViewSettings } from '@/helpers/settings';
import type { SystemSettings } from '@/types/settings';
import type { ViewSettings } from '@/types/book';

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ appService: null, envConfig: {} }),
}));
vi.mock('@/hooks/useLibrary', () => ({ useLibrary: () => ({ libraryLoaded: false }) }));
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => {} }));
vi.mock('@/hooks/useCustomFonts', () => ({ useCustomFonts: () => {} }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (text: string) => text }));
vi.mock('@/hooks/useAppRouter', () => ({ useAppRouter: () => ({ push: vi.fn() }) }));
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
vi.mock('@/components/Dropdown', () => ({ default: () => null }));
vi.mock('@/helpers/settings', () => ({ saveViewSettings: vi.fn() }));

const restoredSettings = {
  ...DEFAULT_SYSTEM_SETTINGS,
  version: 1,
  globalViewSettings: { ...DEFAULT_BOOK_FONT, defaultFontSize: 23 } as ViewSettings,
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
  useSettingsStore.setState({ settings: {} as SystemSettings, isSettingsDialogOpen: false });
  vi.mocked(saveViewSettings).mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Catalog settings hydration', () => {
  it('renders a cold home page without mounting or saving font settings', async () => {
    expect(() => render(<CatalogShelf />)).not.toThrow();
    expect(screen.queryByRole('dialog')).toBeNull();
    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);
    expect(useSettingsStore.getState().isSettingsDialogOpen).toBe(false);
    expect(saveViewSettings).not.toHaveBeenCalled();
    await act(async () => {});
  });

  it('opens only on request after hydration, preserves restored fonts, and closes', async () => {
    render(<CatalogShelf />);
    await act(async () => {
      useSettingsStore.getState().setSettings(restoredSettings);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(saveViewSettings).not.toHaveBeenCalled();
    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button.hasAttribute('disabled')).toBe(false);
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByDisplayValue('23')).toBeTruthy();
    expect(useSettingsStore.getState().settings.globalViewSettings.defaultFontSize).toBe(23);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss settings' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
