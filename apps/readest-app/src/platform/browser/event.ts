export type UnlistenFn = () => void;
export interface Event<T> {
  event: string;
  id: number;
  payload: T;
}
export async function listen<T>(
  name: string,
  callback: (event: Event<T>) => void,
): Promise<UnlistenFn> {
  const listener = (event: globalThis.Event) =>
    callback({ event: name, id: 0, payload: (event as CustomEvent<T>).detail });
  window.addEventListener(name, listener);
  return () => window.removeEventListener(name, listener);
}
export async function emit<T>(name: string, payload?: T): Promise<void> {
  window.dispatchEvent(new CustomEvent(name, { detail: payload }));
}
export const emitTo = <T>(_target: unknown, name: string, payload?: T) => emit(name, payload);
export enum TauriEvent {
  WINDOW_CLOSE_REQUESTED = 'window-close-requested',
  WINDOW_DESTROYED = 'window-destroyed',
  WINDOW_FOCUS = 'window-focus',
  WINDOW_BLUR = 'window-blur',
}
