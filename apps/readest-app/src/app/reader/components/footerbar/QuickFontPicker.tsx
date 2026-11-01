import { useTranslation } from '@/hooks/useTranslation';
import { useCustomFontStore } from '@/store/customFontStore';
import { useReaderStore } from '@/store/readerStore';
import { useEnv } from '@/context/EnvContext';
import { saveViewSettings } from '@/helpers/settings';
import { SERIF_FONTS, SANS_SERIF_FONTS, NON_FREE_FONTS } from '@/services/constants';
import { getOSPlatform } from '@/utils/misc';

export default function QuickFontPicker({ bookKey }: { bookKey: string }) {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const view = useReaderStore((s) => s.getViewSettings(bookKey));
  const { getFontFamilies } = useCustomFontStore();
  const custom = getFontFamilies();
  const category = view?.defaultFont ?? 'Serif';
  const face = category === 'Sans-serif' ? view?.sansSerifFont : view?.serifFont;
  const allowed = (font: string) =>
    !['android', 'linux'].includes(getOSPlatform()) || !NON_FREE_FONTS.includes(font);
  const groups = [
    { category: 'Serif', label: 'Serif', fonts: SERIF_FONTS },
    { category: 'Sans-serif', label: _('Sans serif'), fonts: SANS_SERIF_FONTS },
  ];
  const value = `${category}|${face}`;
  return (
    <label className='kk-quick-font'>
      <span>{_('Font')}</span>
      <select
        aria-label={_('Font bacaan')}
        value={value}
        onChange={async (event) => {
          const [nextCategory, nextFace] = event.target.value.split('|');
          if (!nextCategory || !nextFace) return;
          await saveViewSettings(envConfig, bookKey, 'overrideFont', true);
          await saveViewSettings(
            envConfig,
            bookKey,
            nextCategory === 'Serif' ? 'serifFont' : 'sansSerifFont',
            nextFace,
          );
          await saveViewSettings(envConfig, bookKey, 'defaultFont', nextCategory);
        }}
      >
        <option value={value}>{face || category}</option>
        {groups.map((group) => (
          <optgroup key={group.category} label={group.label}>
            {[...new Set([...custom, ...group.fonts.filter(allowed)])]
              .filter((font) => `${group.category}|${font}` !== value)
              .map((font) => (
                <option key={font} value={`${group.category}|${font}`}>
                  {font}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
