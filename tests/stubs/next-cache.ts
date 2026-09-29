// The real unstable_cache needs the Next.js incremental cache and throws outside a Next server.
// This stand-in runs the function directly and records how it was called.

export type CacheCall = { keyParts?: string[]; options?: { revalidate?: number | false } };

// On globalThis: tests call vi.resetModules(), which would otherwise give every load its own list.
const store = globalThis as { __nextCacheCalls?: CacheCall[] };

export function cacheCalls(): CacheCall[] {
  store.__nextCacheCalls ??= [];
  return store.__nextCacheCalls;
}

export function unstable_cache<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts?: string[],
  options?: { revalidate?: number | false },
): (...args: A) => Promise<R> {
  return (...args: A) => {
    cacheCalls().push({ keyParts, options });
    return fn(...args);
  };
}
