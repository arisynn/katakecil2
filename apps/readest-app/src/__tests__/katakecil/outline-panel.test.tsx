import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { StaticListRow, CurrentPositionRow } from '@/app/reader/components/sidebar/TOCItem';
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (text: string) => text }));
afterEach(cleanup);
describe('real outline rows', () => {
  it('separates the published EPUB episode caption from its title', () => {
    render(
      <StaticListRow
        bookKey='book'
        flatItem={{
          item: {
            id: 0,
            index: 12,
            href: 'chapter.xhtml',
            label: 'Episode 0Suara Mesin di Balik Terpal',
          },
          depth: 0,
          index: 0,
        }}
        activeHref='chapter.xhtml'
        onToggleExpand={() => {}}
        onItemClick={() => {}}
      />,
    );
    expect(screen.getByText('Episode 0')).toBeTruthy();
    expect(screen.getByText('Suara Mesin di Balik Terpal')).toBeTruthy();
    expect(screen.getByText('Sedang dibaca')).toBeTruthy();
  });
  it('does not label an EPUB spine index as page thirteen', () => {
    render(
      <StaticListRow
        bookKey='book'
        flatItem={{
          item: { id: 0, index: 12, href: 'chapter.xhtml', label: 'Pembuka' },
          depth: 0,
          index: 0,
        }}
        activeHref={null}
        onToggleExpand={() => {}}
        onItemClick={() => {}}
      />,
    );
    expect(screen.queryByText('13')).toBeNull();
    expect(screen.queryByText('Hlm. 13')).toBeNull();
  });
  it('offers the saved position as an accessible action, without an ambiguous raw page', () => {
    const click = vi.fn();
    render(<CurrentPositionRow depth={0} page={0} onClick={click} />);
    fireEvent.keyDown(screen.getByRole('treeitem', { name: 'Posisi Saat Ini' }), { key: ' ' });
    expect(click).toHaveBeenCalledOnce();
    expect(screen.queryByText('0')).toBeNull();
  });
});
