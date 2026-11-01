/** Legacy Readest capability calls terminate here; no native runtime is shipped. */
export function unsupported<T = never>(..._args: unknown[]): Promise<T> {
  return Promise.reject(new Error('This capability is unavailable in the browser.'));
}
export type UnlistenFn = () => void;
