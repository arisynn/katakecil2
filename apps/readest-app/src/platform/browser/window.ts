import { PhysicalPosition, PhysicalSize } from './dpi';
import { listen, type Event, type UnlistenFn } from './event';
import { unsupported } from './unsupported';
export { PhysicalPosition, PhysicalSize, LogicalPosition, LogicalSize } from './dpi';
export enum ScrollBarStyle {
  Default = 'default',
  FluentOverlay = 'fluentOverlay',
  Overlay = 'overlay',
}
export type DragDropEvent = {
  type: 'enter' | 'over' | 'drop' | 'leave';
  paths: string[];
  position: PhysicalPosition;
};
export class BrowserWindow {
  label: string;
  constructor(label = 'main', _options?: unknown) {
    this.label = label;
  }
  async setTitle(title: string) {
    document.title = title;
  }
  async isFullscreen() {
    return !!document.fullscreenElement;
  }
  async setFullscreen(value: boolean) {
    if (value) await document.documentElement.requestFullscreen();
    else if (document.fullscreenElement) await document.exitFullscreen();
  }
  async isMaximized() {
    return false;
  }
  async isMinimized() {
    return false;
  }
  async isVisible() {
    return !document.hidden;
  }
  async isFocused() {
    return document.hasFocus();
  }
  async isAlwaysOnTop() {
    return false;
  }
  async scaleFactor() {
    return window.devicePixelRatio || 1;
  }
  async innerPosition() {
    return new PhysicalPosition(0, 0);
  }
  async outerPosition() {
    return new PhysicalPosition(window.screenX, window.screenY);
  }
  async innerSize() {
    return new PhysicalSize(window.innerWidth, window.innerHeight);
  }
  async outerSize() {
    return new PhysicalSize(window.outerWidth, window.outerHeight);
  }
  async theme(): Promise<'dark' | 'light'> {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  async show() {
    window.focus();
  }
  async setFocus() {
    window.focus();
  }
  async onFocusChanged(handler: (event: Event<boolean>) => void): Promise<UnlistenFn> {
    const focus = () => handler({ event: 'focus', id: 0, payload: true });
    const blur = () => handler({ event: 'blur', id: 0, payload: false });
    window.addEventListener('focus', focus);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('focus', focus);
      window.removeEventListener('blur', blur);
    };
  }
  async onThemeChanged(handler: (event: Event<'dark' | 'light'>) => void): Promise<UnlistenFn> {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const change = () =>
      handler({ event: 'theme', id: 0, payload: media.matches ? 'dark' : 'light' });
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }
  onResized(handler: (event: Event<PhysicalSize>) => void) {
    const change = () =>
      handler({
        event: 'resize',
        id: 0,
        payload: new PhysicalSize(window.innerWidth, window.innerHeight),
      });
    window.addEventListener('resize', change);
    return Promise.resolve(() => window.removeEventListener('resize', change));
  }
  onMoved(_handler: (event: Event<PhysicalPosition>) => void) {
    return Promise.resolve(() => {});
  }
  onScaleChanged(_handler: (event: Event<{ scaleFactor: number; size: PhysicalSize }>) => void) {
    return Promise.resolve(() => {});
  }
  onCloseRequested(_handler: (event: { preventDefault(): void }) => void) {
    return Promise.resolve(() => {});
  }
  onDragDropEvent(_handler: (event: Event<DragDropEvent>) => void) {
    return Promise.resolve(() => {});
  }
  listen<T>(name: string, handler: (event: Event<T>) => void) {
    return listen(name, handler);
  }
  once<T>(name: string, handler: (event: Event<T>) => void): Promise<UnlistenFn> {
    return this.listen(name, handler);
  }
  minimize = unsupported;
  maximize = unsupported;
  unmaximize = unsupported;
  unminimize = unsupported;
  toggleMaximize = unsupported;
  setAlwaysOnTop = unsupported;
  setSize = unsupported;
  setPosition = unsupported;
  startDragging = unsupported;
  startResizeDragging = unsupported;
  setDecorations = unsupported;
  setShadow = unsupported;
  close = unsupported;
  destroy = unsupported;
}
const current = new BrowserWindow();
export const getCurrentWindow = () => current;
export const getAllWindows = async () => [current];
