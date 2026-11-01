import { unsupported } from './unsupported';
export const open = unsupported<string | string[] | null>;
export const save = unsupported<string | null>;
export const ask = async (message: string, _options?: unknown) => window.confirm(message);
