import { useEffect, useRef, type RefObject } from 'react';

/** One reversible history entry lets Android's browser Back dismiss an overlay.
 * Focus stays in the visible panel; a nested modal owns its own keyboard. */
export function useOverlayNavigation(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onBack: () => void,
  dialogAncestor = false,
) {
  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    if (!active) return;
    const root = dialogAncestor ? ref.current?.closest('dialog') : ref.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    const marker = `kk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    history.pushState({ ...history.state, kkOverlay: marker }, '', location.href);
    const onPop = () => {
      if (history.state?.kkOverlay !== marker) backRef.current();
    };
    const focusable = () =>
      [
        ...root.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length > 0);
    const onKey = (event: KeyboardEvent) => {
      const dialogs = [...document.querySelectorAll('dialog[open]')];
      if (dialogs.some((dialog) => dialog !== root && !dialog.contains(root))) return;
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      if (
        !root.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    const timer = setTimeout(() => {
      if (!root.contains(document.activeElement)) focusable()[0]?.focus();
    }, 120);
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey, true);
      if (history.state?.kkOverlay === marker) history.back();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [active, ref, dialogAncestor]);
}
