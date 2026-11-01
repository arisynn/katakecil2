import { describe, it, expect } from 'vitest';
import {
  publicationLabel,
  migrateLocation,
  nextRelease,
  validateCatalog,
} from '@/services/katakecil/model';

describe('Kata Kecil publication and stable progress', () => {
  it('never confuses finishing the current EPUB with a completed serial', () => {
    expect(publicationLabel('ongoing')).toBe('Ongoing');
    expect(publicationLabel('hiatus')).toBe('Hiatus');
    expect(publicationLabel('completed')).toBe('Tamat');
  });
  it('keeps a text anchor when an earlier chapter is inserted', () => {
    expect(migrateLocation('epubcfi(/6/4!/4/2/1:12)', ['a', 'b'], ['x', 'a', 'b'])).toBe(
      'epubcfi(/6/6!/4/2/1:12)',
    );
  });
  it('falls back to the nearest surviving chapter if the current one was removed', () => {
    expect(migrateLocation('epubcfi(/6/4!/4/2/1:12)', ['a', 'b', 'c'], ['a', 'c'])).toBe(
      'epubcfi(/6/2!/4/2)',
    );
  });
  it('does not promise a release in the past or an invalid date', () => {
    expect(nextRelease('2026-01-01', Date.parse('2026-10-29'))).toBeNull();
    expect(nextRelease('bad date', 0)).toBeNull();
    expect(nextRelease('2026-10-30T12:00:00Z', Date.parse('2026-10-29'))).toBe(
      '2026-10-30T12:00:00Z',
    );
  });
  it('rejects a malformed catalog instead of caching broken entries', () => {
    expect(() => validateCatalog({ books: [{ id: 'a', title: null }] })).toThrow();
  });
});
