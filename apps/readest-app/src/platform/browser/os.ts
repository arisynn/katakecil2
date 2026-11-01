export const type = () => {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  return /Android/i.test(ua)
    ? 'android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'ios'
      : /Win/i.test(ua)
        ? 'windows'
        : /Mac/i.test(ua)
          ? 'macos'
          : /Linux/i.test(ua)
            ? 'linux'
            : 'unknown';
};
export const version = () => '';
export const arch = () => 'unknown';
export const hostname = () => 'Browser';
