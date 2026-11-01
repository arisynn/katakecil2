import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { useTranslation } from '@/hooks/useTranslation';
import type { Book, BooksGroup } from '@/types/book';

const identity = (item: Book | BooksGroup) =>
  'hash' in item ? item.kataKecil?.id || item.hash : item.id;

/** One centered cover, using native touch scrolling and CSS scroll snap. */
export default function CoverCarousel({
  items,
  storageKey,
  renderItem,
}: {
  items: (Book | BooksGroup)[];
  storageKey: string;
  renderItem: (item: Book | BooksGroup) => ReactNode;
}) {
  const _ = useTranslation();
  const scroller = useRef<HTMLDivElement>(null);
  const current = useRef(0);
  const step = useRef(0);
  const [active, setActive] = useState(0);
  const ids = items.map(identity);
  const idsKey = JSON.stringify(ids);
  const key = `katakecil:carousel:${storageKey}`;

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(key);
    } catch {
      /* Private storage may be disabled. */
    }
    const index = saved ? items.findIndex((item) => identity(item) === saved) : 0;
    current.current = Math.max(0, index);
    setActive(current.current);
    const measure = () => {
      const card = element.querySelector<HTMLElement>('.kk-carousel-card');
      if (!card) return;
      step.current = card.getBoundingClientRect().width + 24;
      const sign = getComputedStyle(element).direction === 'rtl' ? -1 : 1;
      element.scrollTo({ left: sign * current.current * step.current, behavior: 'instant' });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
    // Only identities matter; refreshed catalog objects should not interrupt a swipe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, idsKey]);

  const go = (index: number) => {
    const element = scroller.current;
    if (!element) return;
    const bounded = Math.max(0, Math.min(items.length - 1, index));
    const sign = getComputedStyle(element).direction === 'rtl' ? -1 : 1;
    const reduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset['eink'] === 'true';
    element.scrollTo({
      left: sign * bounded * step.current,
      behavior: reduced ? 'instant' : 'smooth',
    });
  };

  return (
    <section
      className='kk-cover-carousel'
      aria-label={_('Bookshelf')}
      aria-roledescription={_('Carousel')}
    >
      <div
        ref={scroller}
        className='kk-carousel-scroller no-scrollbar'
        tabIndex={0}
        aria-label={_('Scroll books')}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            go(current.current + ((event.key === 'ArrowRight') !== rtl ? 1 : -1));
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            go(event.key === 'Home' ? 0 : items.length - 1);
          }
        }}
        onScroll={(event) => {
          if (!step.current) return;
          const index = Math.min(
            items.length - 1,
            Math.max(0, Math.round(Math.abs(event.currentTarget.scrollLeft) / step.current)),
          );
          current.current = index;
          setActive(index);
          const id = ids[index];
          if (id)
            try {
              sessionStorage.setItem(key, id);
            } catch {
              /* Reading still works. */
            }
        }}
      >
        {items.map((item, index) => (
          <div
            key={identity(item)}
            className='kk-carousel-card'
            data-active={index === active}
            onFocusCapture={() => {
              if (index !== current.current) go(index);
            }}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className='kk-carousel-navigation'>
          <button
            type='button'
            className='kk-circle-button eink-bordered'
            aria-label={_('Previous books')}
            disabled={active === 0}
            onClick={() => go(current.current - 1)}
          >
            <MdChevronLeft className='rtl:rotate-180' size={24} />
          </button>
          <span className='kk-carousel-count' aria-live='polite' aria-atomic='true'>
            {active + 1} / {items.length}
          </span>
          <button
            type='button'
            className='kk-circle-button eink-bordered'
            aria-label={_('Next books')}
            disabled={active === items.length - 1}
            onClick={() => go(current.current + 1)}
          >
            <MdChevronRight className='rtl:rotate-180' size={24} />
          </button>
        </div>
      )}
    </section>
  );
}
