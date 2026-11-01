import { unsupported } from './unsupported';
export const exit = unsupported<void>;
export const relaunch = async () => window.location.reload();
