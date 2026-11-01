/** Optional upstream Worker bindings are absent in this Next.js deployment. */
export function getCloudflareContext(): {
  env: Record<string, unknown>;
  ctx: { waitUntil(task: Promise<unknown>): void };
} {
  throw new Error('Worker bindings are not configured for Kata Kecil.');
}
