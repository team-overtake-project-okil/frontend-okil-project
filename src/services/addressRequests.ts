const cache = new Map<string, { expiresAt: number; data: unknown }>();
const CACHE_TTL = 60_000;
const CACHE_LIMIT = 50;

export function clearAddressRequestCache() {
  cache.clear();
}

export async function requestAddressJson<T>(url: string, service: string, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data as T;
  cache.delete(url);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Не вдалося виконати пошук ${service} (HTTP ${response.status}).`);
  const data: T = await response.json();
  signal?.throwIfAborted();
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(url, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
}

export function waitForGeocoding(signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, 600);
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}
