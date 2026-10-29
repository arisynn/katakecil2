import { zipSync, strToU8 } from 'fflate';
import sanitizeHtml from 'sanitize-html';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

export interface EpubBook {
  id: string;
  title: string;
  author: string;
  language: string;
}
export interface EpubSection {
  id: string;
  title: string;
  content_html: string;
}
const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );

export function cleanContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'div',
      'span',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'blockquote',
      'br',
      'hr',
      'ol',
      'ul',
      'li',
      'a',
      'img',
      'figure',
      'figcaption',
      'sup',
      'sub',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'pre',
      'code',
    ],
    allowedAttributes: {
      '*': ['id', 'lang', 'dir'],
      a: ['href', 'title'],
      img: ['src', 'alt', 'width', 'height'],
    },
    allowedSchemes: ['data'],
    allowedSchemesByTag: { img: ['data'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attrs) => ({
        tagName: 'a',
        attribs:
          attrs['href'] && /^(#[\w:.-]+|section-[\w-]+\.xhtml(?:#[\w:.-]+)?)$/.test(attrs['href'])
            ? attrs
            : {},
      }),
      img: (_tag, attrs) => ({
        tagName: 'img',
        attribs: /^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=]+$/i.test(attrs['src'] || '')
          ? attrs
          : { alt: attrs['alt'] || '' },
      }),
    },
  });
}

export function makeEpub(book: EpubBook, sections: EpubSection[]): Uint8Array {
  if (!sections.length || sections.length > 600) throw Error('No published content');
  const xml = (s: string) => strToU8('<?xml version="1.0" encoding="UTF-8"?>' + s);
  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': xml(
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    ),
  };
  const manifest: string[] = [],
    spine: string[] = [],
    toc: string[] = [];
  let total = 0;
  for (const [index, section] of sections.entries()) {
    if (!/^[a-f\d-]{36}$/i.test(section.id)) throw Error('Invalid section ID');
    const name = `section-${section.id}.xhtml`,
      item = `s${index}`;
    const html = cleanContent(section.content_html);
    total += html.length;
    if (total > 30000000) throw Error('Publication too large');
    const doc = new DOMParser().parseFromString(
      `<html xmlns="http://www.w3.org/1999/xhtml" lang="${escapeXml(book.language)}"><head><title>${escapeXml(section.title)}</title><style>body{line-height:1.7}img{max-width:100%;height:auto}p{margin:0 0 1em}h1,h2,h3{break-after:avoid}</style></head><body>${html}</body></html>`,
      'text/html',
    );
    files[`OEBPS/${name}`] = xml(new XMLSerializer().serializeToString(doc));
    manifest.push(`<item id="${item}" href="${name}" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="${item}"/>`);
    toc.push(`<li><a href="${name}">${escapeXml(section.title)}</a></li>`);
  }
  files['OEBPS/nav.xhtml'] = xml(
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Daftar Isi</title></head><body><nav epub:type="toc" id="toc"><ol>${toc.join('')}</ol></nav></body></html>`,
  );
  files['OEBPS/content.opf'] = xml(
    `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:katakecil:${escapeXml(book.id)}</dc:identifier><dc:title>${escapeXml(book.title)}</dc:title><dc:creator>${escapeXml(book.author)}</dc:creator><dc:language>${escapeXml(book.language)}</dc:language><meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>${manifest.join('')}</manifest><spine>${spine.join('')}</spine></package>`,
  );
  const bytes = zipSync(files, { level: 6, mtime: new Date('2020-01-01T00:00:00Z') });
  if (bytes.length > 18000000) throw Error('EPUB too large');
  return bytes;
}
