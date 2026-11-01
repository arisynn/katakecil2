import { describe, expect, it } from 'vitest';
import { resolveSettingsPage } from '@/components/settings/navigation';
import { splitNavigationLabel, tocPageNumber } from '@/app/reader/utils/navigationLabel';

describe('settings navigation compatibility', () => {
  it('routes existing panel requests and exact command anchors without migrating saved values', () => {
    expect(resolveSettingsPage('Font')).toBe('Font');
    expect(resolveSettingsPage('Language', 'settings.wordlens.enabled')).toBe('Language');
    expect(resolveSettingsPage('Theme', 'settings.color.backgroundTexture')).toBe('Theme');
    expect(resolveSettingsPage('Control', 'settings.control.einkMode')).toBe('Appearance');
    expect(resolveSettingsPage('Control', 'settings.control.allowJavascript')).toBe('Application');
    expect(resolveSettingsPage('Control', 'settings.control.swipeToPaginate')).toBe('Control');
    expect(resolveSettingsPage('AI')).toBeNull();
    expect(resolveSettingsPage('unknown')).toBeNull();
  });
});

describe('EPUB outline display', () => {
  it('separates adjacent episode captions without changing the title or href', () => {
    expect(splitNavigationLabel('Episode 0Suara Mesin yang Tidak Pernah Tidur')).toEqual({
      caption: 'Episode 0',
      title: 'Suara Mesin yang Tidak Pernah Tidur',
    });
    expect(splitNavigationLabel('Episode 12 — Jalan pulang')).toEqual({
      caption: 'Episode 12',
      title: 'Jalan pulang',
    });
    expect(splitNavigationLabel('Bab tentang rumah')).toEqual({
      caption: null,
      title: 'Bab tentang rumah',
    });
    expect(splitNavigationLabel('Kata Kecil')).toEqual({ caption: null, title: 'Kata Kecil' });
  });
  it('never presents EPUB byte offsets as pages; preserves PDF page indices', () => {
    expect(tocPageNumber({ index: 12 })).toBeNull();
    expect(tocPageNumber({ index: 12 }, true)).toBe(13);
    expect(tocPageNumber({ index: 12, location: { current: 47 } })).toBeNull();
    expect(tocPageNumber({ index: 12, location: { current: 47 } }, true)).toBe(13);
    expect(tocPageNumber({ location: { current: NaN } })).toBeNull();
    expect(tocPageNumber({ location: { current: -1 } })).toBeNull();
  });
});
