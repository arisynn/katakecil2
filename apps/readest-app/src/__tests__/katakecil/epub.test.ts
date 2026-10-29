import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { makeEpub, cleanContent } from '../../../supabase/functions/katakecil-reader/epub';
const book = { id: 'test', title: 'A & B', author: 'Penulis', language: 'id' };
const section = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Bab 1',
  content_html: '<h1>Bab 1</h1><p>Teks<br>baris<img src="data:image/png;base64,YQ=="></p>',
};
describe('Published EPUB', () => {
  it('produces a valid EPUB container with stable identity and well formed XHTML', () => {
    const bytes = makeEpub(book, [section]);
    const files = unzipSync(bytes);
    expect(strFromU8(files['mimetype']!)).toBe('application/epub+zip');
    expect(bytes[8]).toBe(0); // first ZIP entry (mimetype) is uncompressed
    expect(strFromU8(files['OEBPS/content.opf']!)).toContain('urn:katakecil:test');
    const doc = new DOMParser().parseFromString(
      strFromU8(files[`OEBPS/section-${section.id}.xhtml`]!),
      'application/xml',
    );
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(makeEpub(book, [section])).toEqual(bytes);
  });
  it('strips scripts, handlers, tracking images, styles and remote links', () => {
    const safe = cleanContent(
      '<script>steal()</script><p onclick="steal()">Hello</p><img src="https://tracker.test/p"><a href="javascript:steal()">x</a><style>body{display:none}</style><iframe src="https://bad.test"/>',
    );
    expect(safe).not.toMatch(/steal|tracker|onclick|<script|<style|<iframe|javascript/);
    expect(safe).toContain('Hello');
  });
  it('does not emit an empty publication', () => expect(() => makeEpub(book, [])).toThrow());
});

describe('Readest / Foliate compatibility', () => {
  it('opens the generated EPUB with the actual reader parser and finds its TOC', async () => {
    const { EPUB } = await import('foliate-js/epub.js');
    const files = unzipSync(makeEpub(book, [section]));
    const epub = await new EPUB({
      sha1: undefined,
      entries: Object.keys(files).map(filename => ({ filename })),
      loadText: async (name: string) => files[name] ? strFromU8(files[name]!) : null,
      loadBlob: async (name: string, type: string) => files[name] ? new Blob([files[name]!], { type }) : null,
      getSize: (name: string) => files[name]?.length || 0,
    }).init();
    expect(epub.sections).toHaveLength(1);
    expect(epub.metadata?.title).toBe('A & B');
    expect(epub.toc[0].label).toBe('Bab 1');
    expect(epub.sections?.[0]?.cfi).toContain('epubcfi(');
  });
});
