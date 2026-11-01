import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import BookCover from '@/components/BookCover';
import type { Book } from '@/types/book';

vi.mock('@/services/environment', () => ({ getInitializedAppService: () => null }));
vi.mock('@/hooks/useDefaultBookshelfCovers', () => ({
  useDefaultBookshelfCovers: () => ({ hideCovers: false }),
}));
vi.mock('@/store/libraryStore', () => ({
  useLibraryStore: (select: (state: { coverThumbnails: Map<string, never> }) => unknown) =>
    select({ coverThumbnails: new Map<string, never>() }),
}));

const book = {
  hash: 'story',
  title: 'Story',
  author: 'Writer',
  format: 'EPUB',
  createdAt: 1,
  updatedAt: 1,
  coverImageUrl: 'blob:local-cover',
  metadata: { coverImageUrl: 'blob:expired-metadata' },
  kataKecil: {
    id: 'story',
    revision: 'one',
    sectionIds: ['one'],
    coverUrl: 'https://example.com/cover.jpg',
  },
} as Book;
afterEach(cleanup);

describe('Published book covers', () => {
  it('uses the durable catalog cover before stale imported metadata', () => {
    render(<BookCover book={book} />);
    expect(screen.getByRole('img').getAttribute('src')).toBe('https://example.com/cover.jpg');
  });
  it('tries each available source once and retries when the cover changes', () => {
    const { rerender } = render(<BookCover book={book} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img').getAttribute('src')).toBe('blob:expired-metadata');
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img').getAttribute('src')).toBe('blob:local-cover');
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).toBeNull();
    rerender(
      <BookCover
        book={{
          ...book,
          updatedAt: 2,
          kataKecil: { ...book.kataKecil!, coverUrl: 'https://example.com/new.jpg' },
        }}
      />,
    );
    expect(screen.getByRole('img').getAttribute('src')).toBe('https://example.com/new.jpg');
  });
});
