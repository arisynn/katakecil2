import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkFirst, CacheFirst, ExpirationPlugin, Serwist } from 'serwist';
import { KATAKECIL_URL } from './services/katakecil/config';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
  runtimeCaching: [
    {
      matcher: ({ url, request }) => {
        const clientRoutes = ['/library', '/reader'];
        const isClientRoute = clientRoutes.some((route) => url.pathname.startsWith(route));
        return isClientRoute && request.mode === 'navigate';
      },
      handler: new NetworkFirst({
        cacheName: 'client-pages',
        networkTimeoutSeconds: 3,
        matchOptions: {
          ignoreSearch: true,
        },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
          {
            cacheKeyWillBeUsed: async ({ request }) => {
              const url = new URL(request.url);
              const basePath = url.pathname.split('/')[1];
              const cacheKey = `${url.origin}/${basePath}`;
              return cacheKey;
            },
          },
        ],
      }),
    },
    // Fonts: CacheFirst strategy for maximum performance
    {
      matcher: ({ url, request }) => {
        // Match font files by extension
        const isFontFile = /\.(woff2?|ttf|otf|eot|svg)(\?.*)?$/i.test(url.pathname);
        // Match font requests by destination
        const isFontRequest = request.destination === 'font';
        // Match Google Fonts CSS and font CDNs
        const isFontCDN =
          url.hostname === 'fonts.googleapis.com' ||
          url.hostname === 'fonts.gstatic.com' ||
          url.hostname === 'cdn.jsdelivr.net' ||
          url.hostname === 'cdnjs.cloudflare.com' ||
          url.hostname === 'ik.imagekit.io' ||
          url.hostname === 'db.onlinewebfonts.com';

        return isFontFile || isFontRequest || isFontCDN;
      },
      handler: new CacheFirst({
        cacheName: 'fonts-cache',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200, // More entries for various font files
            maxAgeSeconds: 365 * 24 * 60 * 60 * 2, // 2 years - fonts rarely change
            purgeOnQuotaError: true, // Automatically purge if storage quota exceeded
          }),
        ],
      }),
    },
    // Published covers use CORS and their own cache. Never reuse an opaque
    // entry left in the generic resource cache by an older PWA build.
    {
      matcher: ({ url }) =>
        url.origin === new URL(KATAKECIL_URL).origin &&
        url.pathname.startsWith('/storage/v1/object/public/kk-covers/'),
      handler: new NetworkFirst({
        cacheName: 'katakecil-published-covers-v2',
        networkTimeoutSeconds: 3,
        plugins: [
          {
            cacheWillUpdate: async ({ response }) =>
              response.status === 200 && response.type !== 'opaque' ? response : null,
          },
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 365 * 24 * 60 * 60 }),
        ],
      }),
    },
    // Other external resources
    {
      matcher: ({ url }) => {
        if (url.pathname.startsWith('/api/')) {
          return false;
        }
        return /^https?.*/.test(url.href);
      },
      handler: new NetworkFirst({
        cacheName: 'offline-cache',
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 512,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
