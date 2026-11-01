import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReaderPageFrame from '@/app/reader/components/ReaderPageFrame';

vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (text: string) => text }));
vi.mock('@/app/reader/utils/pagePreview', () => ({
  mirrorReaderPage: () => ({ element: document.createElement('div'), ready: Promise.resolve() }),
}));
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.classList.contains('header-bar')
      ? 56
      : this.classList.contains('footer-bar')
        ? 64
        : 300;
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const shell = (active: boolean, panel: boolean, onResume = vi.fn()) => (
  <div>
    <div className='header-bar' />
    <ReaderPageFrame
      active={active}
      panelKey={panel ? 'font' : ''}
      captureKey='page-one'
      onResume={onResume}
    >
      <div data-testid='live-page'>The same live EPUB page</div>
    </ReaderPageFrame>
    <div className='footer-bar'>
      <div className={`kk-reader-sheet ${panel ? '' : 'invisible'}`} />
    </div>
  </div>
);
const scale = (container: HTMLElement) =>
  Number(
    container
      .querySelector<HTMLElement>('.kk-reader-page-frame')!
      .style.transform.match(/scale\(([^)]+)\)/)?.[1],
  );

describe('Reader page overview', () => {
  it('shrinks a passive page preview and makes room for an open sheet while the engine stays unchanged', async () => {
    const { container, rerender } = render(shell(false, false));
    const livePage = screen.getByTestId('live-page');
    expect(container.querySelector<HTMLElement>('.kk-reader-page-frame')!.style.transform).toBe(
      'none',
    );
    rerender(shell(true, false));
    await waitFor(() => expect(scale(container)).toBeGreaterThan(0));
    const controlsScale = scale(container);
    expect(controlsScale).toBeGreaterThan(0.7);
    expect(controlsScale).toBeLessThan(0.9);
    rerender(shell(true, true));
    expect(scale(container)).toBeLessThan(controlsScale);
    expect(scale(container) * 800).toBeLessThanOrEqual(800 - 56 - 64 - 300);
    expect(screen.getByTestId('live-page')).toBe(livePage);
    expect(livePage.parentElement!.clientWidth).toBe(400);
    expect(livePage.parentElement!.style.transform).toBe('');
  });
  it('offers a touch/keyboard resume action and restores the same page at full size', () => {
    const resume = vi.fn();
    const { container, rerender } = render(shell(true, false, resume));
    const livePage = screen.getByTestId('live-page');
    fireEvent.click(screen.getByRole('button', { name: 'Continue reading' }));
    expect(resume).toHaveBeenCalledOnce();
    rerender(shell(false, false, resume));
    expect(screen.queryByRole('button', { name: 'Continue reading' })).toBeNull();
    expect(container.querySelector<HTMLElement>('.kk-reader-page-frame')!.style.transform).toBe(
      'none',
    );
    expect(screen.getByTestId('live-page')).toBe(livePage);
  });
});
