// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import HexDebug from "./HexDebug";
import { ApiError, fetcher } from "./lib/fetcher";
vi.mock("./lib/fetcher", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/fetcher")>()),
  fetcher: vi.fn(),
}));
vi.mock("./DebugMap", () => ({ default: () => null }));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <HexDebug />
    </QueryClientProvider>,
  );
}
it("restores the session after reload without saving the password or extending expiry", async () => {
  const expires = Date.now() + 900000;
  vi.mocked(fetcher).mockImplementation(async (path) => {
    if (path === "/debug/session")
      return { token: "temporary-token", expires_at: expires / 1000 };
    if (path === "/debug/config") return { types: [], categories: [] };
    return [];
  });
  const first = show();
  fireEvent.change(screen.getByLabelText("Логін"), {
    target: { value: "admin" },
  });
  fireEvent.change(screen.getByLabelText("Пароль"), {
    target: { value: "secret-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Увійти" }));
  await screen.findByRole("button", { name: "Пріоритети" });
  const stored = sessionStorage.getItem("okil.debug.session")!;
  expect(stored).not.toContain("secret-password");
  expect(JSON.parse(stored)).toEqual({
    auth: "Bearer temporary-token",
    expiresAt: expires,
  });
  first.unmount();
  vi.mocked(fetcher).mockClear();
  show();
  await screen.findByRole("button", { name: "Пріоритети" });
  expect(
    vi.mocked(fetcher).mock.calls.some(([path]) => path === "/debug/session"),
  ).toBe(false);
  expect(sessionStorage.getItem("okil.debug.session")).toBe(stored);
});
it("clears an expired saved session and shows the login form", async () => {
  sessionStorage.setItem(
    "okil.debug.session",
    JSON.stringify({ auth: "Bearer expired", expiresAt: Date.now() - 1 }),
  );
  show();
  expect(screen.getByRole("heading", { name: "Вхід" })).toBeDefined();
  expect(screen.getByLabelText("Пароль")).toBeDefined();
  expect(sessionStorage.getItem("okil.debug.session")).toBeNull();
});
it("returns an open page to login when its session expires", async () => {
  const expires = Date.now() + 60000;
  sessionStorage.setItem(
    "okil.debug.session",
    JSON.stringify({ auth: "Bearer expiring", expiresAt: expires }),
  );
  vi.mocked(fetcher).mockImplementation(async (path) =>
    path === "/debug/config" ? { types: [], categories: [] } : [],
  );
  show();
  await screen.findByRole("button", { name: "Пріоритети" });
  vi.spyOn(Date, "now").mockReturnValue(expires);
  fireEvent.focus(window);
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Вхід" })).toBeDefined(),
  );
  expect(sessionStorage.getItem("okil.debug.session")).toBeNull();
});

it("shows a clear message when login attempts are temporarily blocked", async () => {
  vi.mocked(fetcher).mockRejectedValue(new ApiError(429));
  show();
  fireEvent.change(screen.getByLabelText("Логін"), {
    target: { value: "admin" },
  });
  fireEvent.change(screen.getByLabelText("Пароль"), {
    target: { value: "wrong" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Увійти" }));
  expect((await screen.findByRole("alert")).textContent).toContain("15 хвилин");
  expect(sessionStorage.getItem("okil.debug.session")).toBeNull();
});
