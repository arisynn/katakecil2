import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
// Exercise the real selectors against rendered-like DOM instead of string snapshots.
const css = readFileSync('src/styles/katakecil-glass.css', 'utf8');
describe('Glass surfaces', () => {
  it('matches actual reader controls and excludes book content', () => {
    document.body.innerHTML =
      '<div class="header-bar"></div><div class="footer-bar"></div><div class="modal-box"></div><div class="sidebar-container"></div><iframe class="foliate-view"></iframe>';
    const root = postcss.parse(css);
    const blurRules: string[] = [];
    root.walkRules((rule) => {
      if (
        rule.nodes.some(
          (node) =>
            node.type === 'decl' && node.prop === 'backdrop-filter' && node.value.includes('24px'),
        )
      )
        blurRules.push(rule.selector);
    });
    for (const name of ['header-bar', 'footer-bar', 'modal-box', 'sidebar-container']) {
      expect(
        blurRules.some((selector) => !!document.querySelector(`.${name}`)?.matches(selector)),
      ).toBe(true);
    }
    expect(
      blurRules.some((selector) => !!document.querySelector('iframe')?.matches(selector)),
    ).toBe(false);
  });
});
