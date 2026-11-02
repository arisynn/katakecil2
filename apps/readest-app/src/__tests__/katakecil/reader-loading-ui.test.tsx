import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import ReaderLoadScreen from '@/app/reader/components/ReaderLoadScreen';
import ReaderTitle from '@/app/reader/components/ReaderTitle';

vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (text: string) => text }));
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Recoverable reader loading', () => {
  it('keeps the book title visible and offers retry without losing the back action', () => {
    const retry = vi.fn();
    const back = vi.fn();
    render(<ReaderLoadScreen title='Masa Panen' error onRetry={retry} onBack={back} />);
    expect(screen.getByTitle('Masa Panen')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Posisi baca dan anotasi');
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go to Library' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(back).toHaveBeenCalledOnce();
  });
  it('cancels the slow loading timer on close', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <ReaderLoadScreen title='Masa Panen' onRetry={vi.fn()} onBack={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: 'Coba lagi' })).toBeNull();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('reserves equal space for asymmetric controls in a narrow book pane', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.hasAttribute('data-title-start')) return { left: 16, right: 60 } as DOMRect;
      if (this.hasAttribute('data-title-end')) return { left: 273, right: 344 } as DOMRect;
      return { left: 0, right: 360 } as DOMRect;
    });
    const headerRef = createRef<HTMLDivElement>();
    const { container } = render(
      <div ref={headerRef}>
        <div data-title-start />
        <ReaderTitle title='Judul yang panjang' headerRef={headerRef} />
        <div data-title-end />
      </div>,
    );
    expect(
      container.querySelector<HTMLElement>('.kk-reader-centered-title')!.style.insetInline,
    ).toBe('95px');
  });
});

it('offers retry and a return to the shelf when loading stays pending', async () => {
  vi.useFakeTimers();
  render(<ReaderLoadScreen title='Masa Panen' onRetry={vi.fn()} onBack={vi.fn()} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(8000);
  });
  expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Kembali ke rak' })).toBeTruthy();
});
