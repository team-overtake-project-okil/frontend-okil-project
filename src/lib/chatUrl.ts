/** Prefer an explicit WS endpoint; otherwise use the same backend as the map. */
export function chatWebSocketUrl(): string | undefined {
  const explicit = import.meta.env.VITE_CHAT_WS_URL?.trim();
  if (explicit) return explicit;
  const backend =
    import.meta.env.VITE_BACKEND_URL?.trim() ||
    import.meta.env.VITE_API_URL?.trim();
  if (!backend) return undefined;
  try {
    const url = new URL(backend);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/ws/chat`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}
