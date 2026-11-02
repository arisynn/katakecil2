import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Reserve equal space on both sides, including safe-area padding and controls. */
export default function ReaderTitle({
  title,
  headerRef,
}: {
  title: string;
  headerRef: RefObject<HTMLDivElement | null>;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [inset, setInset] = useState(112);
  useLayoutEffect(() => {
    const header = headerRef.current ?? element.current?.parentElement;
    if (!header) return;
    const start = header.querySelector<HTMLElement>('[data-title-start]');
    const end = header.querySelector<HTMLElement>('[data-title-end]');
    const measure = () => {
      const rect = header.getBoundingClientRect();
      const left = start?.getBoundingClientRect();
      const right = end?.getBoundingClientRect();
      setInset(
        Math.ceil(
          Math.max(left ? left.right - rect.left : 0, right ? rect.right - right.left : 0),
        ) + 8,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    [header, start, end].forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, [headerRef]);
  return (
    <div ref={element} className='kk-reader-centered-title' style={{ insetInline: inset }}>
      <span title={title}>{title}</span>
    </div>
  );
}
