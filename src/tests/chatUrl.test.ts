import { afterEach, expect, it, vi } from "vitest";
import { chatWebSocketUrl } from "../lib/chatUrl";

afterEach(() => vi.unstubAllEnvs());

it.each([
  ["http://localhost:8000/", "ws://localhost:8000/ws/chat"],
  ["https://backend.example/api/", "wss://backend.example/api/ws/chat"],
])("uses the map backend %s", (backend, expected) => {
  vi.stubEnv("VITE_CHAT_WS_URL", "");
  vi.stubEnv("VITE_BACKEND_URL", backend);
  expect(chatWebSocketUrl()).toBe(expected);
});

it("preserves an explicit endpoint", () => {
  vi.stubEnv("VITE_CHAT_WS_URL", " wss://chat.example/ws/chat ");
  expect(chatWebSocketUrl()).toBe("wss://chat.example/ws/chat");
});

it("supports the legacy API URL", () => {
  vi.stubEnv("VITE_CHAT_WS_URL", "");
  vi.stubEnv("VITE_BACKEND_URL", "");
  vi.stubEnv("VITE_API_URL", "http://localhost:8000");
  expect(chatWebSocketUrl()).toBe("ws://localhost:8000/ws/chat");
});

it("does not invent a URL for missing configuration", () => {
  vi.stubEnv("VITE_CHAT_WS_URL", "");
  vi.stubEnv("VITE_BACKEND_URL", "");
  vi.stubEnv("VITE_API_URL", "");
  expect(chatWebSocketUrl()).toBeUndefined();
});
