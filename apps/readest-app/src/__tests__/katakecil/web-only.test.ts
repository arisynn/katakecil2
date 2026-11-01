import { describe, expect, it, vi } from 'vitest';
import { isTauriAppPlatform, isWebAppPlatform } from '@/services/environment';
import { invoke } from '@/platform/browser/core';
import { fetch as browserFetch } from '@/platform/browser/http';

describe('web-only runtime', () => {
  it('always selects the browser even if a stale deployment env requests native', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_PLATFORM', 'tauri');
    expect(isTauriAppPlatform()).toBe(false);
    expect(isWebAppPlatform()).toBe(true);
    vi.unstubAllEnvs();
  });
  it('rejects unavailable OS commands instead of reporting a fake success', async () => {
    await expect(invoke('install_package')).rejects.toThrow('unavailable in the browser');
  });
  it('uses browser fetch and never forwards native TLS bypass options', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetcher);
    await browserFetch('https://example.com', {
      method: 'GET',
      danger: { acceptInvalidCerts: true },
      connectTimeout: 1000,
    });
    expect(fetcher).toHaveBeenCalledWith('https://example.com', { method: 'GET' });
    vi.unstubAllGlobals();
  });
});
