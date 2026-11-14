// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Chat } from "../components/Chat";
import type { HexChatContext } from "../components/Chat";
import type { ClearChatHistoryControls } from "../components/ClearChatHistory";

vi.mock("../lib/chatUrl", () => ({ chatWebSocketUrl: () => "ws://localhost:8000/ws/chat" }));

class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  url: string;
  constructor(url: string) { this.url = url; Socket.instances.push(this); }
  event(data: object) { act(() => this.onmessage?.({ data: JSON.stringify(data) })); }
}
let host: HTMLDivElement;
let controls: ClearChatHistoryControls;
beforeEach(() => {
  Socket.instances = [];
  vi.stubGlobal("WebSocket", Socket);
  sessionStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
});
afterEach(() => { cleanup(); host.remove(); sessionStorage.clear(); vi.unstubAllGlobals(); vi.useRealTimers(); });

function mount(
  attachedContext: HexChatContext | null = null,
  selectedContext: HexChatContext | null = attachedContext,
  withClearControl = false,
) {
  render(
    <Chat
      open
      onOpenChange={vi.fn()}
      host={host}
      selectedContext={selectedContext}
      attachedContext={attachedContext}
      onContextChange={vi.fn()}
      renderClearHistory={withClearControl ? (state) => { controls = state; return null; } : undefined}
    />,
  );
  const socket = Socket.instances[0];
  act(() => socket.onopen?.());
  socket.event({ type: "session.ready", sessionToken: "test-session", history: [] });
  return socket;
}

it("uses the backend WebSocket, sends the existing envelope, and renders the AI answer", () => {
  const socket = mount();
  expect(socket.url).toBe("ws://localhost:8000/ws/chat");
  expect(JSON.parse(socket.send.mock.calls[0][0])).toEqual({ type: "session.open" });
  fireEvent.change(screen.getByLabelText("Твоє запитання"), { target: { value: "Що таке OKIL?" } });
  fireEvent.click(screen.getByRole("button", { name: "Надіслати запитання" }));
  const sent = JSON.parse(socket.send.mock.calls[1][0]);
  expect(sent).toMatchObject({ type: "message.send", text: "Що таке OKIL?" });
  socket.event({ type: "answer.completed", requestId: sent.requestId, text: "Жива відповідь AI" });
  expect(screen.getByText("Жива відповідь AI")).toBeTruthy();
});

it("includes the attached hex in the message for the server's DB context", () => {
  const socket = mount({ id: "891e7689e8fffff", score: 79, categories: [{ title: "Здоров'я", score: 93 }] });
  fireEvent.change(screen.getByLabelText("Твоє запитання"), { target: { value: "Що тут поруч?" } });
  fireEvent.click(screen.getByRole("button", { name: "Надіслати запитання" }));
  expect(JSON.parse(socket.send.mock.calls[1][0]).text).toBe("Ділянка Львова (H3: 891e7689e8fffff). Оцінка комфорту: 79/100. Категорії: Здоров'я: 93/100.\n\nЩо тут поруч?");
});

it("does not send the selected hex until it is attached to the chat", () => {
  const socket = mount(null, { id: "891e7689e8fffff", score: 79, categories: [] });
  fireEvent.change(screen.getByLabelText("Твоє запитання"), { target: { value: "Що таке OKIL?" } });
  fireEvent.click(screen.getByRole("button", { name: "Надіслати запитання" }));
  expect(JSON.parse(socket.send.mock.calls[1][0]).text).toBe("Що таке OKIL?");
  expect(screen.queryByRole("button", { name: "Прибрати ділянку з контексту" })).toBeNull();
});

it("shows a client-readable failure and allows another request", () => {
  const socket = mount();
  fireEvent.change(screen.getByLabelText("Твоє запитання"), { target: { value: "OKIL" } });
  fireEvent.click(screen.getByRole("button", { name: "Надіслати запитання" }));
  const sent = JSON.parse(socket.send.mock.calls[1][0]);
  socket.event({ type: "error", requestId: sent.requestId, code: "ai_failed", message: "AI тимчасово недоступний" });
  expect(screen.getByText("AI тимчасово недоступний")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Твоє запитання"), { target: { value: "Спроба знову" } });
  expect((screen.getByRole("button", { name: "Надіслати запитання" }) as HTMLButtonElement).disabled).toBe(false);
});

it("restores a session and opens a new one when it expired", () => {
  sessionStorage.setItem("okil.chat.token", "previous-session");
  const socket = mount();
  expect(JSON.parse(socket.send.mock.calls[0][0])).toEqual({ type: "session.open", sessionToken: "previous-session" });
  socket.event({ type: "error", requestId: null, code: "session_expired", message: "Expired" });
  expect(sessionStorage.getItem("okil.chat.token")).toBeNull();
  expect(JSON.parse(socket.send.mock.calls.at(-1)![0])).toEqual({ type: "session.open" });
});

function restoreHistory(socket: Socket) {
  socket.event({ type: "session.ready", sessionToken: "old-token", history: [
    { requestId: "old-request", question: "Старе питання", answer: "Стара відповідь" },
  ] });
}

function beginClear(socket: Socket) {
  act(() => controls.requestClear());
  act(() => { void controls.confirm(); });
  return JSON.parse(socket.send.mock.calls.at(-1)![0]);
}

it("renders no clear button by default", () => {
  mount();
  expect(screen.queryByRole("button", { name: /очист/i })).toBeNull();
});

it("requires confirmation, allows cancellation and prevents double submission", async () => {
  const socket = mount(null, null, true);
  await act(async () => controls.confirm());
  expect(socket.send).toHaveBeenCalledTimes(1);
  act(() => controls.requestClear());
  expect(controls.confirmationRequired).toBe(true);
  act(() => controls.cancel());
  await act(async () => controls.confirm());
  expect(socket.send).toHaveBeenCalledTimes(1);
  const sent = beginClear(socket);
  act(() => { void controls.confirm(); });
  expect(socket.send).toHaveBeenCalledTimes(2);
  expect(controls.clearing).toBe(true);
  await act(async () => socket.event({ type: "session.cleared", requestId: sent.requestId, deleted: true }));
  expect(controls.confirmationRequired).toBe(false);
});

it("waits for matching acknowledgement, removes old history and token, and starts a fresh session", async () => {
  const socket = mount(null, null, true);
  restoreHistory(socket);
  fireEvent.change(screen.getByLabelText("Твоє запитання"), { target: { value: "Чернетка" } });
  const sent = beginClear(socket);
  expect(sent).toMatchObject({ type: "session.clear", sessionToken: "old-token" });
  expect(screen.getByText("Стара відповідь")).toBeTruthy();
  expect(sessionStorage.getItem("okil.chat.token")).toBe("old-token");
  socket.event({ type: "session.cleared", requestId: "different-request", deleted: true });
  expect(controls.clearing).toBe(true);
  await act(async () => socket.event({ type: "session.cleared", requestId: sent.requestId, deleted: true }));
  expect(screen.queryByText("Старе питання")).toBeNull();
  expect(screen.queryByText("Стара відповідь")).toBeNull();
  expect((screen.getByLabelText("Твоє запитання") as HTMLTextAreaElement).value).toBe("");
  expect(sessionStorage.getItem("okil.chat.token")).toBeNull();
  expect(JSON.parse(socket.send.mock.calls.at(-1)![0])).toEqual({ type: "session.open" });
  socket.event({ type: "answer.completed", requestId: "old-request", text: "Стара відповідь" });
  socket.event({ type: "session.ready", sessionToken: "fresh-token", history: [] });
  expect(sessionStorage.getItem("okil.chat.token")).toBe("fresh-token");
  expect(screen.queryByText("Стара відповідь")).toBeNull();
  fireEvent.change(screen.getByLabelText("Твоє запитання"), { target: { value: "Нове питання" } });
  fireEvent.click(screen.getByRole("button", { name: "Надіслати запитання" }));
  expect(JSON.parse(socket.send.mock.calls.at(-1)![0])).toMatchObject({ type: "message.send", text: "Нове питання" });
});

it("preserves history and token on deletion failure and exposes an error for retry", async () => {
  const socket = mount(null, null, true);
  restoreHistory(socket);
  const sent = beginClear(socket);
  await act(async () => socket.event({ type: "error", requestId: sent.requestId, code: "storage_unavailable", message: "Redis недоступний" }));
  expect(controls.error).toBe("Redis недоступний");
  expect(controls.clearing).toBe(false);
  expect(screen.getByText("Стара відповідь")).toBeTruthy();
  expect(sessionStorage.getItem("okil.chat.token")).toBe("old-token");
  act(() => { void controls.confirm(); });
  const retry = JSON.parse(socket.send.mock.calls.at(-1)![0]);
  expect(retry.requestId).not.toBe(sent.requestId);
  await act(async () => socket.event({ type: "session.cleared", requestId: retry.requestId, deleted: false }));
  expect(screen.queryByText("Стара відповідь")).toBeNull();
});

it("rejects a pending clear on disconnect without losing local history", async () => {
  const socket = mount(null, null, true);
  restoreHistory(socket);
  beginClear(socket);
  await act(async () => socket.onclose?.());
  expect(controls.clearing).toBe(false);
  expect(controls.error).toContain("Зв’язок втрачено");
  expect(sessionStorage.getItem("okil.chat.token")).toBe("old-token");
  expect(screen.getByText("Стара відповідь")).toBeTruthy();
});

it("times out unacknowledged deletion and disconnects before reconciling on reconnect", async () => {
  vi.useFakeTimers();
  const socket = mount(null, null, true);
  restoreHistory(socket);
  beginClear(socket);
  await act(async () => { vi.advanceTimersByTime(10_000); });
  expect(controls.error).toContain("Немає підтвердження");
  expect(socket.close).toHaveBeenCalled();
  expect(sessionStorage.getItem("okil.chat.token")).toBe("old-token");
});
