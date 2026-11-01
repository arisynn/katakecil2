import { describe, expect, it, vi } from 'vitest';
import { KATAKECIL_URL } from '@/services/katakecil/config';

const registration = vi.hoisted(() => ({ options: null as unknown }));
vi.mock('serwist', () => {
  class Strategy {
    constructor(public options: unknown) {}
  }
  return {
    NetworkFirst: Strategy,
    CacheFirst: Strategy,
    ExpirationPlugin: Strategy,
    Serwist: class {
      constructor(options: unknown) {
        registration.options = options;
      }
      addEventListeners() {}
    },
  };
});
import '@/sw';

type Route = {
  matcher: (input: { url: URL }) => boolean;
  handler: {
    options: {
      cacheName: string;
      plugins: { cacheWillUpdate?: (input: { response: Response }) => Promise<Response | null> }[];
    };
  };
};
const route = () =>
  (registration.options as { runtimeCaching: Route[] }).runtimeCaching.find(
    (item) => item.handler.options.cacheName === 'katakecil-published-covers-v2',
  );

describe('Published cover PWA cache', () => {
  it('isolates published cover requests from old generic cached responses', () => {
    const coverRoute = route();
    expect(coverRoute).toBeDefined();
    expect(
      coverRoute!.matcher({
        url: new URL(`${KATAKECIL_URL}/storage/v1/object/public/kk-covers/story/cover.png`),
      }),
    ).toBe(true);
    for (const url of [
      `${KATAKECIL_URL}/functions/v1/katakecil-reader`,
      `${KATAKECIL_URL}/storage/v1/object/public/another-bucket/cover.png`,
      'https://example.com/storage/v1/object/public/kk-covers/story/cover.png',
    ])
      expect(coverRoute!.matcher({ url: new URL(url) })).toBe(false);
  });
  it('caches readable successes and rejects opaque or failed image responses', async () => {
    const validate = route()!.handler.options.plugins.find(
      (plugin) => plugin.cacheWillUpdate,
    )?.cacheWillUpdate;
    const image = new Response('image', { headers: { 'content-type': 'image/png' } });
    expect(await validate!({ response: image })).toBe(image);
    const opaque = new Response('opaque');
    Object.defineProperty(opaque, 'type', { value: 'opaque' });
    expect(await validate!({ response: opaque })).toBeNull();
    expect(await validate!({ response: new Response('missing', { status: 404 }) })).toBeNull();
  });
});
