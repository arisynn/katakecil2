import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useThemeStore } from '@/store/themeStore';
import { mirrorReaderPage } from '../utils/pagePreview';

/** The live engine stays full size; only its passive visual mirror is scaled. */
export default function ReaderPageFrame({
  active,
  panelKey,
  captureKey,
  onResume,
  children,
}: {
  active: boolean;
  panelKey: string;
  captureKey: string;
  onResume: () => void;
  children: ReactNode;
}) {
  const _ = useTranslation();
  const stage = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLDivElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((state) => state.themeCode);
  const [ready, setReady] = useState(false);
  const [viewport, setViewport] = useState('');

  useLayoutEffect(() => {
    const target = mirror.current;
    if (!target || !live.current) return;
    if (!active) {
      target.replaceChildren();
      setReady(false);
      return;
    }
    let cancelled = false;
    let captured: HTMLElement | undefined;
    const timer = window.setTimeout(
      () => {
        try {
          const snapshot = mirrorReaderPage(live.current!);
          captured = snapshot.element;
          captured.dataset['pending'] = 'true';
          captured.style.opacity = '0';
          target.append(captured);
          void snapshot.ready.then(() => {
            if (cancelled || !captured) return;
            captured.dataset['pending'] = 'false';
            captured.style.opacity = '1';
            [...target.children].forEach((child) => {
              if (child !== captured) child.remove();
            });
            setReady(true);
          });
        } catch {
          // An inaccessible embedded document keeps the original full-size view.
          target.replaceChildren();
          setReady(false);
        }
      },
      target.children.length ? 100 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (captured?.dataset['pending'] === 'true') captured.remove();
    };
  }, [active, captureKey, theme, viewport]);
  const [preview, setPreview] = useState({ scale: 0.82, offset: 0 });

  useLayoutEffect(() => {
    const element = stage.current;
    const cell = element?.parentElement;
    if (!active || !element || !cell) return;
    const header = cell.querySelector<HTMLElement>('.header-bar');
    const footer = cell.querySelector<HTMLElement>('.footer-bar');
    const panels = [...cell.querySelectorAll<HTMLElement>('.kk-reader-sheet:not(.invisible)')];
    const measure = () => {
      const height = element.clientHeight;
      const width = element.clientWidth;
      if (!height || !width) return;
      setViewport(`${width}x${height}`);
      // offset sizes ignore the bars' entrance animation, so the card heads
      // straight for the final free space rather than following a moving panel.
      const inset = header ? Number.parseFloat(getComputedStyle(header).marginTop) || 0 : 0;
      const top = Math.max(56, (header?.offsetHeight || 44) + inset) + 16;
      const panelHeight = Math.max(0, ...panels.map((panel) => panel.offsetHeight));
      const bottom = Math.max(top + 48, height - (footer?.offsetHeight || 64) - panelHeight - 16);
      const scale = Math.min(0.84, Math.max(0.1, (bottom - top) / height), (width - 32) / width);
      const offset = (top + bottom) / 2 - height / 2;
      setPreview((previous) =>
        previous.scale === scale && previous.offset === offset ? previous : { scale, offset },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    [element, header, footer, ...panels].forEach((target) => target && observer.observe(target));
    return () => observer.disconnect();
  }, [active, panelKey]);

  return (
    <div
      ref={stage}
      className='kk-reader-preview-stage'
      data-preview-active={active}
      data-preview-ready={active && ready}
    >
      <div ref={live} className='kk-reader-live-page'>
        {children}
      </div>
      <div
        ref={mirror}
        aria-hidden='true'
        className='kk-reader-page-frame'
        style={{
          transform:
            active && ready ? `translateY(${preview.offset}px) scale(${preview.scale})` : 'none',
        }}
      />
      {active && (
        <button
          type='button'
          className='kk-reader-resume-layer'
          aria-label={_('Continue reading')}
          onClick={onResume}
        />
      )}
    </div>
  );
}
