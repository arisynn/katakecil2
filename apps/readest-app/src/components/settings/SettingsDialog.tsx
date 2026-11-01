import { useTranslation } from '@/hooks/useTranslation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Type,
  PanelsTopLeft,
  Palette,
  Hand,
  Volume2,
  Languages,
  Database,
  Code2,
  Smartphone,
  ChevronLeft,
  Search,
  X,
} from 'lucide-react';
import { useOverlayNavigation } from '@/hooks/useOverlayNavigation';
import { useEnv } from '@/context/EnvContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useReaderStore } from '@/store/readerStore';
import { useCommandPalette } from '@/components/command-palette';
import { saveViewSettings } from '@/helpers/settings';
import Dialog from '@/components/Dialog';
import FontPanel from './FontPanel';
import BookModePanel from './BookModePanel';
import LayoutPanel from './LayoutPanel';
import ThemePanel from './ThemePanel';
import ControlPanel from './ControlPanel';
import LangPanel from './LangPanel';
import MiscPanel from './MiscPanel';
import TTSPanel from './TTSPanel';
import ApplicationPanel from './ApplicationPanel';
import MaterialSettings from './MaterialSettings';
import { BoxedList, NavigationRow } from './primitives';
import {
  resolveSettingsPage,
  settingsGroups,
  settingsPageLabels,
  type SettingsPage,
} from './navigation';

// Kept for command-registry and existing callers; persisted keys do not change.
export type SettingsPanelType =
  | 'Font'
  | 'Layout'
  | 'Theme'
  | 'Control'
  | 'TTS'
  | 'Language'
  | 'AI'
  | 'Integrations'
  | 'Custom';
export type SettingsPanelPanelProp = {
  bookKey: string;
  onRegisterReset: (resetFn: () => void) => void;
};
let savedScroll: { panel: SettingsPage | null; top: number } | null = null;
export const resetSettingsScrollPosition = () => {
  savedScroll = null;
};
const icons = {
  Document: PanelsTopLeft,
  Font: Type,
  Layout: PanelsTopLeft,
  Theme: Palette,
  Appearance: Smartphone,
  Control: Hand,
  TTS: Volume2,
  Language: Languages,
  Application: Database,
  Custom: Code2,
};

export default function SettingsDialog({ bookKey }: { bookKey: string }) {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const {
    setSettingsDialogOpen,
    setFontPanelView,
    requestedPanel,
    setRequestedPanel,
    activeSettingsItemId,
    setActiveSettingsItemId,
    fontPanelView,
  } = useSettingsStore();
  const { getViewSettings } = useReaderStore();
  const { open: openSearch } = useCommandPalette();
  const [page, setPage] = useState<SettingsPage | null>(() =>
    resolveSettingsPage(requestedPanel, activeSettingsItemId),
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const isGlobal = getViewSettings(bookKey)?.isGlobal ?? true;
  const registerReset = (fn: () => void) => {
    resetRef.current = fn;
  };
  const panelProps = { bookKey, onRegisterReset: registerReset };
  const navigate = (next: SettingsPage | null) => {
    resetRef.current = null;
    setFontPanelView('main-fonts');
    setPage(next);
    // Compatibility for clients which still read lastConfigPanel.
    if (next)
      localStorage.setItem(
        'lastConfigPanel',
        ['Appearance', 'Application'].includes(next) ? 'Control' : next,
      );
  };
  const goBack = () => {
    if (page === 'Font' && fontPanelView === 'custom-fonts') setFontPanelView('main-fonts');
    else if (page) navigate(null);
    else setSettingsDialogOpen(false);
  };
  useOverlayNavigation(panelRef, true, () => setSettingsDialogOpen(false), true);
  useEffect(() => {
    setRequestedPanel(null);
    setFontPanelView('main-fonts');
  }, [setRequestedPanel, setFontPanelView]);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const scroller = panel?.closest<HTMLElement>('[data-overlayscrollbars-contents]');
    if (!scroller) return;
    const top = savedScroll?.panel === page ? savedScroll.top : 0;
    const apply = () => {
      scroller.scrollTop = top;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(scroller, { attributeFilter: ['data-overlayscrollbars-viewport'] });
    return () => {
      observer.disconnect();
      savedScroll = { panel: page, top: scroller.scrollTop };
    };
  }, [page]);
  useEffect(() => {
    if (!activeSettingsItemId) return;
    const target = resolveSettingsPage(requestedPanel, activeSettingsItemId);
    if (target && target !== page) {
      setPage(target);
      return;
    }
    const timer = setTimeout(() => {
      const el = panelRef.current?.querySelector(
        `[data-setting-id="${CSS.escape(activeSettingsItemId)}"]`,
      );
      el?.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
      el?.classList.add('settings-highlight');
      setActiveSettingsItemId(null);
    }, 150);
    return () => clearTimeout(timer);
  }, [activeSettingsItemId, page, requestedPanel, setActiveSettingsItemId]);
  const scopeVisible = page && page !== 'Application';
  return (
    <Dialog
      isOpen
      onClose={goBack}
      className='modal-open z-[110]!'
      boxClassName='kk-settings-dialog sm:min-w-[520px] overflow-hidden'
      useOverlayScroll
      header={
        <div className='kk-settings-header'>
          {page ? (
            <button
              type='button'
              className='kk-circle-button'
              aria-label={page ? _('Kembali ke pengaturan') : _('Tutup pengaturan')}
              onClick={goBack}
            >
              <ChevronLeft size={22} />
            </button>
          ) : (
            <span className='kk-settings-header-spacer' aria-hidden='true' />
          )}
          <h2>{page ? _(settingsPageLabels[page]) : _('Pengaturan')}</h2>
          <button
            type='button'
            className='kk-circle-button'
            aria-label={_('Cari pengaturan')}
            onClick={() => {
              openSearch();
              setSettingsDialogOpen(false);
            }}
          >
            <Search size={20} />
          </button>
          <button
            type='button'
            className='kk-circle-button'
            aria-label={_('Selesai mengatur')}
            onClick={() => setSettingsDialogOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
      }
    >
      <div
        ref={panelRef}
        className='kk-settings-content'
        role='group'
        aria-label={page ? settingsPageLabels[page] : _('Semua pengaturan')}
      >
        {!page ? (
          <>
            <p className='kk-settings-intro'>{_('Atur ruang untuk membacamu.')}</p>
            {settingsGroups.map((group) => (
              <BoxedList
                key={group.title}
                title={_(group.title)}
                description={_(group.description)}
              >
                {group.pages.map((key) => (
                  <NavigationRow
                    key={key}
                    icon={icons[key]}
                    title={_(settingsPageLabels[key])}
                    disabled={key === 'Document' && !bookKey}
                    status={
                      key === 'Document' && !bookKey
                        ? _('Buka buku untuk mengatur mode dokumen')
                        : undefined
                    }
                    onClick={() => navigate(key)}
                  />
                ))}
              </BoxedList>
            ))}
          </>
        ) : (
          <>
            {scopeVisible && (
              <div className='kk-settings-scope'>
                <div className='kk-segment' role='group' aria-label={_('Cakupan pengaturan')}>
                  <button
                    aria-pressed={isGlobal}
                    onClick={() =>
                      saveViewSettings(envConfig, bookKey, 'isGlobal', true, true, false)
                    }
                    disabled={!bookKey}
                  >
                    {_('Semua buku')}
                  </button>
                  <button
                    aria-pressed={!isGlobal}
                    onClick={() =>
                      saveViewSettings(envConfig, bookKey, 'isGlobal', false, true, false)
                    }
                    disabled={!bookKey}
                  >
                    {_('Buku ini')}
                  </button>
                </div>
                <p>
                  {!bookKey || isGlobal
                    ? _(
                        'Preferensi bacaan berlaku untuk semua buku yang mengikuti pengaturan global.',
                      )
                    : _('Preferensi bacaan disimpan untuk buku yang sedang dibuka.')}{' '}
                  {page === 'Theme'
                    ? _('Tema rak memiliki pilihan tersendiri.')
                    : page === 'Appearance'
                      ? _('Material kontrol dan tombol rak berlaku di seluruh aplikasi.')
                      : ''}
                </p>
              </div>
            )}
            {['TTS', 'Language', 'Application', 'Control'].includes(page) && (
              <p className='kk-settings-note'>
                {page === 'Application'
                  ? _(
                      'Pengaturan aplikasi berlaku global. Izin JavaScript EPUB mengikuti cakupan {{scope}}.',
                      { scope: isGlobal ? _('semua buku') : _('buku ini') },
                    )
                  : _(
                      'Preferensi bacaan: {{scope}}. Perangkat, bahasa antarmuka, layanan suara, dan cache berlaku global.',
                      { scope: isGlobal ? _('semua buku') : _('buku ini') },
                    )}
              </p>
            )}
            {page === 'Document' && bookKey && <BookModePanel bookKey={bookKey} />}
            {page === 'Font' && <FontPanel {...panelProps} />}
            {page === 'Layout' && <LayoutPanel {...panelProps} />}
            {page === 'Theme' && <ThemePanel {...panelProps} />}
            {page === 'Appearance' && (
              <>
                <MaterialSettings />
                <ControlPanel key='appearance' {...panelProps} section='appearance' />
              </>
            )}
            {page === 'Control' && (
              <ControlPanel key='navigation' {...panelProps} section='navigation' />
            )}
            {page === 'TTS' && <TTSPanel {...panelProps} />}
            {page === 'Language' && <LangPanel {...panelProps} />}
            {page === 'Application' && (
              <>
                <ApplicationPanel />
                <ControlPanel key='application' {...panelProps} section='application' />
              </>
            )}
            {page === 'Custom' && <MiscPanel {...panelProps} />}
            {page !== 'Document' && (
              <button
                type='button'
                className='kk-settings-reset'
                onClick={() => resetRef.current?.()}
              >
                {page === 'Application'
                  ? _('Pulihkan izin JavaScript EPUB')
                  : page === 'Appearance'
                    ? _('Pulihkan preferensi e-ink')
                    : _('Pulihkan preferensi {{section}}', {
                        section: _(settingsPageLabels[page]).toLowerCase(),
                      })}
              </button>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
