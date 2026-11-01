import { useTranslation } from '@/hooks/useTranslation';
import { useState } from 'react';
import { BoxedList, SettingsSwitchRow } from './primitives';
export default function MaterialSettings() {
  const _ = useTranslation();
  const [solid, setSolid] = useState(() => document.documentElement.dataset['kkSolid'] === 'true');
  return (
    <BoxedList
      title={_('Material kontrol')}
      description={_(
        'Panel teks selalu pekat. Tampilan solid membantu perangkat yang terasa berat saat memakai blur.',
      )}
    >
      <SettingsSwitchRow
        label={_('Kontrol solid')}
        checked={solid}
        onChange={() => {
          const next = !solid;
          setSolid(next);
          document.documentElement.dataset['kkSolid'] = String(next);
          try {
            localStorage.setItem('katakecil:solid-ui', String(next));
          } catch {
            /* Session preference remains active. */
          }
        }}
      />
    </BoxedList>
  );
}
