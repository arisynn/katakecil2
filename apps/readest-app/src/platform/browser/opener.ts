export async function openUrl(url: string) {
  const parsed = new URL(url, window.location.href);
  if (!['https:', 'http:', 'mailto:'].includes(parsed.protocol)) throw Error('Unsupported URL');
  window.open(parsed.href, '_blank', 'noopener,noreferrer');
}
