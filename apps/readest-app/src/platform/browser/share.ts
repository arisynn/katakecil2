import { unsupported } from './unsupported';
export const shareFile = unsupported<void>;
export const shareText = async (text: string, _options?: unknown) => {
  if (navigator.share) await navigator.share({ text });
  else await navigator.clipboard.writeText(text);
};
