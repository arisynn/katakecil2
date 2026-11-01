import { listen, type UnlistenFn } from './event';
import { unsupported } from './unsupported';

export const invoke = <T>(...args: unknown[]): Promise<T> => unsupported<T>(...args);
export const convertFileSrc = (path: string, _protocol?: string) => path;
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
export interface PluginListener {
  unregister(): Promise<void>;
}
export async function addPluginListener<T>(
  plugin: string,
  event: string,
  handler: (payload: T) => void,
): Promise<PluginListener> {
  const stop = await listen<T>(`${plugin}:${event}`, (event) => handler(event.payload));
  return { unregister: async () => stop() };
}
export class Channel<T = unknown> {
  onmessage: (message: T) => void = () => {};
}
export type { UnlistenFn };
