import { describe, expect, it } from 'vitest';
import { validatePublication } from '../../../supabase/functions/katakecil-publisher/validation';

const publication = () => ({
  book: {
    id: 'contoh',
    title: 'Contoh',
    author: 'Penulis',
    language: 'id',
    synopsis: '',
    status: 'ongoing',
    is_published: false,
  },
  sections: [
    {
      id: '42f00000-0000-5000-8000-000000000001',
      position: 0,
      title: 'Pengantar',
      content_html: '<p>Halo</p>',
      release_at: '2030-01-01T19:00:00+07:00',
      is_enabled: true,
    },
  ],
  kinds: { '42f00000-0000-5000-8000-000000000001': 'page' },
  expected_updated_at: null,
  request_id: 'a'.repeat(64),
});

describe('terminal publisher boundary', () => {
  it('accepts drafts and retains the page classification', () => {
    const result = validatePublication(publication());
    expect(result.book.is_published).toBe(false);
    expect(Object.values(result.kinds)).toEqual(['page']);
  });
  it('rejects malformed book IDs, dates and duplicate sections', () => {
    const badId = publication();
    badId.book.id = '../outside';
    expect(() => validatePublication(badId)).toThrow('ID');
    const noZone = publication();
    noZone.sections[0]!.release_at = '2030-01-01T19:00:00';
    expect(() => validatePublication(noZone)).toThrow('date');
    const duplicate = publication();
    duplicate.sections.push({ ...duplicate.sections[0]!, position: 1 });
    expect(() => validatePublication(duplicate)).toThrow('ID');
  });
  it('rejects oversized sections and incorrect ordering', () => {
    const large = publication();
    large.sections[0]!.content_html = 'x'.repeat(3_000_001);
    expect(() => validatePublication(large)).toThrow('content');
    const order = publication();
    order.sections[0]!.position = 4;
    expect(() => validatePublication(order)).toThrow('order');
  });
  it('does not forward unrecognized book or section fields to the database', () => {
    const input = publication();
    Object.assign(input.book, { owner: 'other', arbitrary_sql: 'drop table' });
    Object.assign(input.sections[0]!, { book_id: 'other' });
    const result = validatePublication(input);
    expect(result.book).not.toHaveProperty('owner');
    expect(result.sections[0]).not.toHaveProperty('book_id');
  });
});
