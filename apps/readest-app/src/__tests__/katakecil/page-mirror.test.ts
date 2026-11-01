import { describe, expect, it } from 'vitest';
import { mirrorReaderPage } from '@/app/reader/utils/pagePreview';

describe('Passive reader preview', () => {
  it('never mounts another reader engine or copies executable scripts', async () => {
    const source = document.createElement('div');
    const engine = document.createElement('foliate-view');
    engine.innerHTML = '<p>Page text</p><script>throw Error("must not run")</script>';
    source.append(engine);
    const snapshot = mirrorReaderPage(source);
    await snapshot.ready;
    expect(snapshot.element.querySelector('foliate-view')).toBeNull();
    expect(snapshot.element.querySelector('script')).toBeNull();
    expect(snapshot.element.textContent).toBe('Page text');
    expect(source.querySelector('foliate-view')).toBe(engine);
  });
  it('leaves offscreen preloaded chapters as empty spacers', async () => {
    const source = document.createElement('div');
    source.innerHTML = '<div aria-hidden="true"><iframe></iframe></div><p>Current page</p>';
    const snapshot = mirrorReaderPage(source);
    await snapshot.ready;
    expect(snapshot.element.querySelector('iframe')).toBeNull();
    expect(snapshot.element.querySelector('[aria-hidden]')).not.toBeNull();
    expect(snapshot.element.textContent).toBe('Current page');
  });
});
