import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FooterBar from '@/app/reader/components/footerbar/FooterBar';
import type { FooterBarChildProps } from '@/app/reader/components/footerbar/types';
import { useReaderStore } from '@/store/readerStore';
import { useBookDataStore } from '@/store/bookDataStore';
const env = vi.hoisted(() => ({ appService: { isMobile: true } }));
vi.mock('@/context/EnvContext', () => ({ useEnv: () => env }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => (text: string) => text }));
vi.mock('@/app/reader/hooks/useSpatialNavigation', () => ({ useSpatialNavigation: () => {} }));
vi.mock('@/app/reader/hooks/useWindowFocusRestore', () => ({
  useWindowFocusRestore: () => () => false,
}));
vi.mock('@/app/reader/components/tts/TTSControl', () => ({ default: () => null }));
vi.mock('@/app/reader/components/rsvp', () => ({ RSVPControl: () => null }));
vi.mock('@/app/reader/components/footerbar/DesktopFooterBar', () => ({ default: () => null }));
vi.mock('@/app/reader/components/footerbar/MobileFooterBar', () => ({
  default: ({ actionTab, onSetActionTab }: FooterBarChildProps) => (
    <>
      <button onClick={() => onSetActionTab('font')}>Tampilan</button>
      {actionTab === 'font' && <span>Quick settings open</span>}
    </>
  ),
}));
beforeEach(() => {
  env.appService.isMobile = true;
  useReaderStore.setState({
    hoveredBookKey: 'book',
    bottomBarTab: '',
    viewStates: {},
    bookKeys: [],
  });
  useBookDataStore.setState({ booksData: {} });
  vi.stubGlobal('innerWidth', 768);
  vi.stubGlobal('innerHeight', 1024);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const setup = () => {
  render(
    <FooterBar
      bookKey='book'
      bookFormat='EPUB'
      isHoveredAnim={false}
      gridInsets={{ top: 0, left: 0, right: 0, bottom: 0 }}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Tampilan' }));
  expect(screen.getByText('Quick settings open')).toBeTruthy();
};
describe('touch controls on wide Android screens', () => {
  it('keeps quick settings open after a tablet synthetic mouseleave', () => {
    setup();
    fireEvent.mouseLeave(screen.getByRole('contentinfo'));
    expect(useReaderStore.getState().hoveredBookKey).toBe('book');
    expect(screen.getByText('Quick settings open')).toBeTruthy();
  });
  it('keeps phone quick settings open too', () => {
    vi.stubGlobal('innerWidth', 393);
    setup();
    fireEvent.mouseLeave(screen.getByRole('contentinfo'));
    expect(screen.getByText('Quick settings open')).toBeTruthy();
  });
  it('retains pointer dismissal on desktop', () => {
    env.appService.isMobile = false;
    setup();
    fireEvent.mouseLeave(screen.getByRole('contentinfo'));
    expect(screen.queryByText('Quick settings open')).toBeNull();
  });
});
