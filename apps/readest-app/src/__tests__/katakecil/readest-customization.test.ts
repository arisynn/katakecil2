import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { themes, themeVariables } from '@/styles/themes';
import { getBookContextMenuItemIds } from '@/app/library/utils/libraryUtils';
import type { Book } from '@/types/book';

describe('Readest customization', () => {
  it('adds glass palettes to the existing theme selector', () => {
    for (const name of ['white-glass', 'black-glass']) {
      const theme = themes.find((theme) => theme.name === name);
      expect(theme, name).toBeDefined();
      expect(themeVariables(theme!.colors.light, 'light')['--color-base-100']).toMatch(/^#/);
      expect(themeVariables(theme!.colors.dark, 'dark')['color-scheme']).toBe('dark');
    }
    expect(themes.find((theme) => theme.name === 'sepia')).toBeDefined();
    expect(themes[0]?.name).toBe('default');
  });

  it('does not replace the selected native palette through the glass stylesheet', () => {
    document.documentElement.dataset['theme'] = 'sepia-light';
    const overrides: string[] = [];
    postcss.parse(readFileSync('src/styles/katakecil-glass.css', 'utf8')).walkRules((rule) => {
      if (!document.documentElement.matches(rule.selector)) return;
      rule.walkDecls((declaration) => {
        if (declaration.prop.startsWith('--color-')) overrides.push(declaration.prop);
      });
    });
    expect(overrides).toEqual([]);
  });

  it('does not route catalog book actions to Readest accounts or cloud uploads', () => {
    const book = {
      hash: 'a'.repeat(32),
      format: 'EPUB',
      title: 'Story',
      author: 'Author',
      createdAt: 1,
      updatedAt: 1,
      downloadedAt: 1,
      kataKecil: { id: 'story', revision: 'v1', sectionIds: ['one'] },
    } as Book;
    const actions = getBookContextMenuItemIds(book);
    expect(actions).toContain('showDetails');
    expect(actions).toContain('group');
    expect(actions).not.toContain('upload');
    expect(actions).not.toContain('share');
  });
});
