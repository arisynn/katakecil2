import { type UnlistenFn } from './event';
export const getCurrent = async (): Promise<string[] | null> => null;
export const onOpenUrl =
  async (_handler: (urls: string[]) => void): Promise<UnlistenFn> =>
  () => {};
