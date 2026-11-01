import { unsupported } from './unsupported';
export const join = async (...parts: string[]) =>
  parts.filter(Boolean).join('/').replace(/\/+/g, '/');
export const basename = async (path: string) => path.replace(/\\/g, '/').split('/').pop() || '';
export const documentDir = unsupported<string>;
export const desktopDir = unsupported<string>;
export const appDataDir = unsupported<string>;
export const appConfigDir = unsupported<string>;
export const appCacheDir = unsupported<string>;
export const appLogDir = unsupported<string>;
export const tempDir = unsupported<string>;
export const dataDir = unsupported<string>;
