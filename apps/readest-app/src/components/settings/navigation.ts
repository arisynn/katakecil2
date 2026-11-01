import { stubTranslation as _ } from '@/utils/misc';
/** UI routes only. Saved settings and legacy command IDs remain unchanged. */
export const settingsGroups = [
  {
    title: _('Teks & halaman'),
    description: _('Huruf, paragraf, dan tata letak'),
    pages: ['Font', 'Layout'],
  },
  {
    title: _('Tema & tampilan'),
    description: _('Warna, kaca, dan layar e-ink'),
    pages: ['Theme', 'Appearance'],
  },
  {
    title: _('Navigasi & kontrol'),
    description: _('Gestur, tombol, dan anotasi'),
    pages: ['Control', 'Document'],
  },
  {
    title: _('Suara & bahasa'),
    description: _('Dengarkan, terjemahkan, dan kamus'),
    pages: ['TTS', 'Language'],
  },
  {
    title: _('Data & aplikasi'),
    description: _('Koleksi, keamanan, dan CSS'),
    pages: ['Application', 'Custom'],
  },
] as const;
export type SettingsPage = (typeof settingsGroups)[number]['pages'][number];
export const settingsPageLabels: Record<SettingsPage, string> = {
  Document: _('Mode dokumen'),
  Font: _('Huruf'),
  Layout: _('Tata letak halaman'),
  Theme: _('Tema & warna'),
  Appearance: _('Layar & material'),
  Control: _('Gestur & alat baca'),
  TTS: _('Suara & pembacaan'),
  Language: _('Bahasa & terjemahan'),
  Application: _('Data & aplikasi'),
  Custom: _('CSS khusus'),
};
const appearanceIds = new Set([
  'device',
  'einkMode',
  'colorEinkMode',
  'autoFullRefresh',
  'hideBookshelfPageButtons',
]);
const appIds = new Set(['allowJavascript', 'telemetry', 'checkUpdates', 'nightlyChannel']);
export function resolveSettingsPage(
  panel: string | null,
  itemId?: string | null,
): SettingsPage | null {
  const panelFromId = itemId?.split('.')[1];
  const candidate = panelFromId
    ? (
        {
          font: 'Font',
          layout: 'Layout',
          theme: 'Theme',
          color: 'Theme',
          control: 'Control',
          tts: 'TTS',
          language: 'Language',
          wordlens: 'Language',
          custom: 'Custom',
        } as Record<string, string>
      )[panelFromId]
    : panel;
  if (candidate === 'Control') {
    const id = itemId?.split('.')[2] ?? '';
    if (appearanceIds.has(id)) return 'Appearance';
    if (appIds.has(id)) return 'Application';
  }
  return candidate && Object.hasOwn(settingsPageLabels, candidate)
    ? (candidate as SettingsPage)
    : null;
}
