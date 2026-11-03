export async function fetcher(url: string, init?: RequestInit) {
  // Older local setups use VITE_API_URL; keep them compatible.
  const base = (
    import.meta.env.VITE_BACKEND_URL?.trim() ||
    import.meta.env.VITE_API_URL?.trim()
  )?.replace(/\/+$/, "");
  if (!base)
    throw new Error("Не налаштовано адресу сервісу оцінок (VITE_BACKEND_URL).");
  const response = await fetch(base + url, init);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      "Сервіс оцінок повернув некоректну відповідь. Перевірте адресу API.",
    );
  }
  return response.json();
}
