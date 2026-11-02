export async function fetcher(url: string, init?: RequestInit) {
  const response = await fetch(import.meta.env.VITE_BACKEND_URL + url, init);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}
