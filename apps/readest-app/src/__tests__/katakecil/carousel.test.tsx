import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CoverCarousel from '@/app/library/components/CoverCarousel';
import { libraryPresentation } from '@/services/katakecil/presentation';
import type { Book } from '@/types/book';

vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (text: string) => text }));
const one = { hash: 'hash1', title: 'One', kataKecil: { id: 'one' } } as Book;
const two = { hash: 'hash2', title: 'Two', kataKecil: { id: 'two' } } as Book;
const scrollTo = vi.fn();
beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 260,
  } as DOMRect);
  HTMLElement.prototype.scrollTo = scrollTo;
  scrollTo.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const props = {
  storageKey: 'default',
  renderItem: (book: Book | { id: string }) => (
    <button>{'title' in book ? book.title : book.id}</button>
  ),
};

describe('One-cover library', () => {
  it('adopts carousel for old settings and respects an explicit grid/list choice', () => {
    expect(libraryPresentation({ libraryViewMode: 'grid' })).toBe('carousel');
    expect(libraryPresentation({ libraryViewMode: 'list', libraryCarouselEnabled: false })).toBe(
      'list',
    );
    expect(libraryPresentation({ libraryViewMode: 'grid' }, 'list')).toBe('list');
  });
  it('restores the same book after a content hash change and a reordered catalog', () => {
    sessionStorage.setItem('katakecil:carousel:default', 'two');
    const { unmount } = render(<CoverCarousel {...props} items={[one, two]} />);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 284, behavior: 'instant' });
    expect(screen.getByText('2 / 2')).toBeTruthy();
    unmount();
    render(<CoverCarousel {...props} items={[{ ...two, hash: 'new-content' }, one]} />);
    expect(screen.getByText('1 / 2')).toBeTruthy();
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'instant' });
  });
  it('saves the swiped book and supports keyboard movement without opening it', () => {
    render(<CoverCarousel {...props} items={[one, two]} />);
    const list = screen.getByLabelText('Scroll books');
    fireEvent.scroll(list, { target: { scrollLeft: 284 } });
    expect(sessionStorage.getItem('katakecil:carousel:default')).toBe('two');
    expect(screen.getByText('2 / 2')).toBeTruthy();
    fireEvent.keyDown(list, { key: 'Home' });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
  });
  it('does not duplicate a single book or show unnecessary navigation', () => {
    render(<CoverCarousel {...props} items={[one]} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByLabelText('Next books')).toBeNull();
  });
  it('uses the matching direction in RTL and respects reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(<CoverCarousel {...props} items={[one, two]} />);
    const list = screen.getByLabelText('Scroll books');
    list.style.direction = 'rtl';
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: -284, behavior: 'instant' });
  });
});
