/** A passive visual mirror. Custom reader elements and document scripts never run twice. */
export function mirrorReaderPage(source: HTMLElement): {
  element: HTMLElement;
  ready: Promise<void>;
} {
  const pending: Promise<void>[] = [];
  const scrolls: (() => void)[] = [];
  const copy = (node: Node): Node => {
    if (!(node instanceof Element)) return node.cloneNode(true);
    if (node.tagName === 'SCRIPT') return document.createTextNode('');
    if (node instanceof HTMLIFrameElement) {
      const doc = node.contentDocument;
      if (!doc?.documentElement) throw new Error('Page preview is unavailable for this document.');
      const frame = node.cloneNode(false) as HTMLIFrameElement;
      frame.removeAttribute('src');
      [...frame.attributes]
        .filter((attribute) => attribute.name.startsWith('on'))
        .forEach((attribute) => frame.removeAttribute(attribute.name));
      // Keep local book resources readable, but never execute document scripts.
      frame.setAttribute('sandbox', 'allow-same-origin');
      frame.tabIndex = -1;
      const html = doc.documentElement.cloneNode(true) as HTMLElement;
      html.querySelectorAll('script').forEach((script) => script.remove());
      const position = { x: doc.defaultView?.scrollX || 0, y: doc.defaultView?.scrollY || 0 };
      pending.push(
        new Promise<void>((resolve) => {
          frame.addEventListener(
            'load',
            () => {
              frame.contentWindow?.scrollTo(position.x, position.y);
              resolve();
            },
            { once: true },
          );
        }),
      );
      frame.srcdoc = '<!doctype html>' + html.outerHTML;
      return frame;
    }
    const custom = node.localName.includes('-');
    const clone = custom ? document.createElement('div') : (node.cloneNode(false) as Element);
    if (custom) {
      [...node.attributes]
        .filter((attribute) => !attribute.name.startsWith('on'))
        .forEach((attribute) => clone.setAttribute(attribute.name, attribute.value));
      const style = getComputedStyle(node);
      for (const property of Array.from(style))
        (clone as HTMLElement).style.setProperty(property, style.getPropertyValue(property));
    }
    if (node.getAttribute('aria-hidden') !== 'true') {
      if (node.shadowRoot) {
        const shadow = clone.attachShadow({ mode: 'open' });
        shadow.adoptedStyleSheets = [...(node.shadowRoot.adoptedStyleSheets || [])];
        node.shadowRoot.childNodes.forEach((child) => shadow.append(copy(child)));
      } else node.childNodes.forEach((child) => clone.append(copy(child)));
    } else if (node instanceof HTMLElement && clone instanceof HTMLElement) {
      // Offscreen preloaded chapters remain spacers, without another EPUB document.
      clone.style.width = `${node.offsetWidth}px`;
      clone.style.height = `${node.offsetHeight}px`;
      clone.style.flexShrink = '0';
    }
    if (node instanceof HTMLCanvasElement && clone instanceof HTMLCanvasElement) {
      clone.width = node.width;
      clone.height = node.height;
      clone.getContext('2d')?.drawImage(node, 0, 0);
    }
    if (node instanceof HTMLElement)
      scrolls.push(() => {
        (clone as HTMLElement).scrollLeft = node.scrollLeft;
        (clone as HTMLElement).scrollTop = node.scrollTop;
      });
    return clone;
  };
  const element = copy(source) as HTMLElement;
  return {
    element,
    ready: Promise.all(pending).then(() => {
      scrolls.forEach((restore) => restore());
    }),
  };
}
