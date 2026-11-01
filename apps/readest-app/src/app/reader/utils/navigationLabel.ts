/** Normalize display only: EPUB hrefs, hierarchy, and stored metadata stay intact. */
export function splitNavigationLabel(label: string | undefined) {
  const title = label?.trim() ?? '';
  const match = title.match(/^(Episode|Bab|Chapter)\s+(\d+)(?:\s*[—–:.-]\s*|\s*)(.*)$/i);
  return match && match[3]
    ? { caption: `${match[1]} ${match[2]}`, title: match[3].trim() }
    : { caption: null, title };
}
export function tocPageNumber(
  item: { location?: { current: number }; index?: number },
  fixedPages = false,
) {
  // EPUB location.current is a byte-based reference, not a page number.
  const current = fixedPages ? (item.index ?? item.location?.current) : undefined;
  return current !== undefined && Number.isFinite(current) && current >= 0 ? current + 1 : null;
}
export function navigationLabel(label: string | undefined) {
  const { caption, title } = splitNavigationLabel(label);
  return caption ? `${caption} · ${title}` : title;
}
