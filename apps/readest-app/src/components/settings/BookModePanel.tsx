import React, { useEffect } from 'react';
import { useState } from 'react';
import {
  MAX_ZOOM_LEVEL,
  MIN_ZOOM_LEVEL,
  ZOOM_STEP,
  MAX_CONTRAST,
  MIN_CONTRAST,
  CONTRAST_STEP,
} from '@/services/constants';
import { useEnv } from '@/context/EnvContext';
import { useReaderStore } from '@/store/readerStore';
import { useBookDataStore } from '@/store/bookDataStore';
import { useTranslation } from '@/hooks/useTranslation';
import { getStyles } from '@/utils/style';
import { getScrollGapAttr } from '@/utils/webtoon';
import { applyPageTurnAttributes } from '@/app/reader/hooks/useCapturedTurn';
import { eventDispatcher } from '@/utils/event';
import { getMaxInlineSize } from '@/utils/config';
import { saveViewSettings } from '@/helpers/settings';
import { setCoverSpread } from '@/utils/spread';
import { BoxedList, SettingsRow, SettingsSelect, SettingsSwitchRow } from './primitives';
import NumberInput from './NumberInput';

interface BookModePanelProps {
  bookKey: string;
}

const BookModePanel: React.FC<BookModePanelProps> = ({ bookKey }) => {
  const _ = useTranslation();
  const { envConfig, appService } = useEnv();
  const { getBookData } = useBookDataStore();
  const { getView, getViewSettings, setViewSettings, recreateViewer } = useReaderStore();
  const bookData = getBookData(bookKey)!;
  const viewSettings = getViewSettings(bookKey)!;

  const [isScrolledMode, setScrolledMode] = useState(viewSettings!.scrolled);
  const [scrolledDirection, setScrolledDirection] = useState(
    viewSettings!.scrolledDirection ?? 'vertical',
  );
  const [webtoonMode, setWebtoonMode] = useState(viewSettings!.webtoonMode ?? false);
  const [lockHorizontalPan, setLockHorizontalPan] = useState(
    viewSettings!.lockHorizontalPan ?? false,
  );
  const [isParagraphMode, setParagraphMode] = useState(
    viewSettings?.paragraphMode?.enabled ?? false,
  );
  const [zoomLevel, setZoomLevel] = useState(viewSettings!.zoomLevel!);
  const [contrast, setContrast] = useState(viewSettings!.contrast ?? 100);
  const [zoomMode, setZoomMode] = useState(viewSettings!.zoomMode!);
  const [spreadMode, setSpreadMode] = useState(viewSettings!.spreadMode!);
  const [keepCoverSpread, setKeepCoverSpread] = useState(viewSettings!.keepCoverSpread!);
  const [applyThemeToPDF, setApplyThemeToPDF] = useState(viewSettings!.applyThemeToPDF!);
  const [rtlSpread, setRtlSpread] = useState(bookData?.bookDoc?.dir === 'rtl');

  const toggleScrolledMode = () => setScrolledMode(!isScrolledMode);
  const toggleWebtoonMode = () => setWebtoonMode(!webtoonMode);
  const toggleLockHorizontalPan = () => setLockHorizontalPan(!lockHorizontalPan);
  const toggleParagraphMode = () => {
    setParagraphMode(!isParagraphMode);
    eventDispatcher.dispatch('toggle-paragraph-mode', { bookKey });
  };

  useEffect(() => {
    if (scrolledDirection === (viewSettings.scrolledDirection ?? 'vertical')) return;
    saveViewSettings(envConfig, bookKey, 'scrolledDirection', scrolledDirection, true, false);
    viewSettings.scrolledDirection = scrolledDirection;
    getView(bookKey)?.renderer.setAttribute('scroll-direction', scrolledDirection);
    setViewSettings(bookKey, viewSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrolledDirection]);

  useEffect(() => {
    if (isScrolledMode === viewSettings!.scrolled) return;
    saveViewSettings(envConfig, bookKey, 'scrolled', isScrolledMode, false, false);
    viewSettings!.scrolled = isScrolledMode;
    if (!isScrolledMode && webtoonMode) setWebtoonMode(false);
    getView(bookKey)?.renderer.setAttribute('flow', isScrolledMode ? 'scrolled' : 'paginated');
    getView(bookKey)?.renderer.setAttribute(
      'max-inline-size',
      `${getMaxInlineSize(viewSettings)}px`,
    );
    getView(bookKey)?.renderer.setStyles?.(getStyles(viewSettings!));
    // `scrolled` decides which engine owns a swipe: leaving it stale keeps the
    // paginator's `turn-style` / cleared `no-swipe` from scroll flow, so the
    // paginator animates the swipe itself while the touch interceptor — which
    // recomputes eligibility live — runs a captured turn over the top, and
    // three pages slide at once.
    const view = getView(bookKey);
    if (view) applyPageTurnAttributes(view, viewSettings!, !!bookData?.isFixedLayout);
    setViewSettings(bookKey, viewSettings!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrolledMode]);

  useEffect(() => {
    if (webtoonMode === viewSettings.webtoonMode) return;
    saveViewSettings(envConfig, bookKey, 'webtoonMode', webtoonMode, false, false);
    viewSettings.webtoonMode = webtoonMode;
    getView(bookKey)?.renderer.setAttribute('scroll-gap', getScrollGapAttr(webtoonMode));
    if (webtoonMode) {
      // Webtoon Mode implies scrolled flow + fit-width (scale-factor 100) so pages
      // fill the width without horizontal overflow/clipping. Reuse the existing
      // scrolled / zoomLevel effects rather than duplicating their renderer wiring.
      if (!isScrolledMode) setScrolledMode(true);
      if (zoomLevel !== 100) setZoomLevel(100);
      if (scrolledDirection !== 'vertical') setScrolledDirection('vertical');
      saveViewSettings(envConfig, bookKey, 'scrolled', true, false, false);
    }
    setViewSettings(bookKey, viewSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webtoonMode]);

  useEffect(() => {
    if (lockHorizontalPan === (viewSettings.lockHorizontalPan ?? false)) return;
    saveViewSettings(envConfig, bookKey, 'lockHorizontalPan', lockHorizontalPan, true, false);
    viewSettings.lockHorizontalPan = lockHorizontalPan;
    getView(bookKey)?.renderer.toggleAttribute('lock-pan-x', lockHorizontalPan);
    setViewSettings(bookKey, viewSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockHorizontalPan]);

  useEffect(() => {
    if (zoomLevel === viewSettings.zoomLevel) return;
    saveViewSettings(envConfig, bookKey, 'zoomLevel', zoomLevel, true, true);
    if (bookData.bookDoc?.rendition?.layout === 'pre-paginated') {
      getView(bookKey)?.renderer.setAttribute('scale-factor', zoomLevel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomLevel]);

  useEffect(() => {
    if (contrast === viewSettings.contrast) return;
    saveViewSettings(envConfig, bookKey, 'contrast', contrast, true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contrast]);

  useEffect(() => {
    if (applyThemeToPDF === viewSettings.applyThemeToPDF) return;
    saveViewSettings(envConfig, bookKey, 'applyThemeToPDF', applyThemeToPDF, true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyThemeToPDF]);

  useEffect(() => {
    if (zoomMode === viewSettings.zoomMode) return;
    saveViewSettings(envConfig, bookKey, 'zoomMode', zoomMode, true, false);
    viewSettings.zoomMode = zoomMode;
    getView(bookKey)?.renderer.setAttribute('zoom', zoomMode);
    setViewSettings(bookKey, viewSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomMode]);

  useEffect(() => {
    if (spreadMode === viewSettings.spreadMode) return;
    saveViewSettings(envConfig, bookKey, 'spreadMode', spreadMode, true, false);
    viewSettings.spreadMode = spreadMode;
    getView(bookKey)?.renderer.setAttribute('spread', spreadMode);
    setViewSettings(bookKey, viewSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadMode]);

  useEffect(() => {
    if (keepCoverSpread === viewSettings.keepCoverSpread) return;
    if (!bookData?.bookDoc?.sections?.length) return;
    saveViewSettings(envConfig, bookKey, 'keepCoverSpread', keepCoverSpread, true, false);
    viewSettings.keepCoverSpread = keepCoverSpread;
    setCoverSpread(bookData.bookDoc, keepCoverSpread);
    getView(bookKey)?.renderer.setAttribute('spread', spreadMode);
    setViewSettings(bookKey, viewSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keepCoverSpread]);

  useEffect(() => {
    const bookDoc = bookData?.bookDoc;
    if (!bookDoc || rtlSpread === (bookDoc.dir === 'rtl')) return;
    // Writing mode is per-book only (no global fallback), and horizontal-rl is
    // what flips both the spread order and the page progression, so the toggle
    // rides the same setting the Layout panel edits instead of a new one.
    const writingMode = rtlSpread ? 'horizontal-rl' : 'horizontal-tb';
    viewSettings.vertical = false;
    saveViewSettings(envConfig, bookKey, 'writingMode', writingMode, true).then(() => {
      const view = getView(bookKey);
      if (view) view.book.dir = rtlSpread ? 'rtl' : 'ltr';
      recreateViewer(envConfig, bookKey);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rtlSpread]);

  return (
    <div className='my-4 space-y-6'>
      {bookData.isFixedLayout && (
        <BoxedList title={_('Halaman tetap')}>
          <NumberInput
            label={_('Zoom Level')}
            value={zoomLevel}
            min={MIN_ZOOM_LEVEL}
            max={MAX_ZOOM_LEVEL}
            step={ZOOM_STEP}
            onChange={setZoomLevel}
          />
          <NumberInput
            label={_('Contrast')}
            value={contrast}
            min={MIN_CONTRAST}
            max={MAX_CONTRAST}
            step={CONTRAST_STEP}
            onChange={setContrast}
          />
          <SettingsRow label={_('Zoom Mode')}>
            <SettingsSelect
              value={zoomMode}
              ariaLabel={_('Zoom Mode')}
              onChange={(e) => {
                const value = e.target.value;
                if (
                  value === 'fit-page' ||
                  value === 'fit-width' ||
                  value === 'original-size' ||
                  value === 'custom'
                )
                  setZoomMode(value);
              }}
              options={[
                { value: 'fit-page', label: _('Fit Page') },
                { value: 'fit-width', label: _('Fit Width') },
                { value: 'original-size', label: _('Ukuran asli') },
                { value: 'custom', label: 'Kustom' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label={_('Susunan halaman')}>
            <SettingsSelect
              value={
                isScrolledMode ? scrolledDirection : spreadMode === 'none' ? 'single' : 'spread'
              }
              ariaLabel={_('Susunan halaman')}
              options={[
                { value: 'single', label: _('Single Page') },
                { value: 'spread', label: _('Auto Spread') },
                { value: 'vertical', label: _('Vertical Scrolling') },
                { value: 'horizontal', label: _('Horizontal Scrolling') },
              ]}
              onChange={(e) => {
                const mode = e.target.value;
                if (mode === 'single' || mode === 'spread') {
                  setSpreadMode(mode === 'single' ? 'none' : 'auto');
                  setScrolledMode(false);
                } else {
                  if (mode === 'horizontal' && webtoonMode) setWebtoonMode(false);
                  setScrolledDirection(mode === 'horizontal' ? 'horizontal' : 'vertical');
                  setScrolledMode(true);
                }
              }}
            />
          </SettingsRow>
          <SettingsSwitchRow
            label={_('Separate Cover Page')}
            checked={keepCoverSpread}
            onChange={() => setKeepCoverSpread(!keepCoverSpread)}
            disabled={spreadMode === 'none'}
          />
          <SettingsSwitchRow
            label={_('Right-to-Left Pages')}
            checked={rtlSpread}
            onChange={() => setRtlSpread(!rtlSpread)}
          />
          <SettingsSwitchRow
            label={_('Lock Horizontal Panning')}
            checked={lockHorizontalPan}
            onChange={toggleLockHorizontalPan}
            disabled={isScrolledMode && scrolledDirection === 'horizontal'}
          />
          <SettingsSwitchRow
            label={_('Webtoon Mode')}
            checked={webtoonMode}
            onChange={toggleWebtoonMode}
          />
          {bookData.book?.format === 'PDF' && appService?.supportsCanvasContext2DFilter && (
            <SettingsSwitchRow
              label={_('Apply Theme Colors')}
              checked={applyThemeToPDF}
              onChange={() => setApplyThemeToPDF(!applyThemeToPDF)}
            />
          )}
        </BoxedList>
      )}
      {!bookData.isFixedLayout && (
        <BoxedList title={_('Alur teks')}>
          <SettingsSwitchRow
            label={_('Scrolled Mode')}
            checked={isScrolledMode}
            onChange={toggleScrolledMode}
          />
          <SettingsSwitchRow
            label={_('Paragraph Mode')}
            checked={isParagraphMode}
            onChange={toggleParagraphMode}
          />
        </BoxedList>
      )}
      <p className='kk-settings-note'>
        {_(
          'Zoom, kontras, susunan, dan arah halaman mengikuti dokumen ini. Mode gulir dan mode webtoon\n        memakai cakupan preferensi bacaan. Gulir otomatis dan baca cepat tersedia di Alat baca.',
        )}
      </p>
    </div>
  );
};
export default BookModePanel;
