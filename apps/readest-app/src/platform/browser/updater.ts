import { unsupported } from './unsupported';
export interface Update {
  currentVersion: string;
  version: string;
  body?: string;
  date?: string;
  downloadAndInstall(
    handler?: (event: {
      event: 'Started' | 'Progress' | 'Finished';
      data: { contentLength?: number; chunkLength: number };
    }) => void,
  ): Promise<void>;
}
export const check = async (_options?: unknown): Promise<Update | null> => null;
export const install = unsupported<void>;
