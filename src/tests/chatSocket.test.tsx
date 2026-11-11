// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Chat } from "../components/Chat";

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
beforeEach(() => {
  Socket.instances = [];
  vi.stubGlobal("WebSocket", Socket);
  sessionStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
});
afterEach(() => { cleanup(); host.remove(); sessionStorage.clear(); vi.unstubAllGlobals(); });

function mount(context: { id: string; score: number; categories: { title: string; score: number }[] } | null = null) {
  render(<Chat open onOpenChange={vi.fn()} host={host} selectedContext={context} details={null} />);
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

it("includes the selected hex in the message for the server's DB context", () => {
  const socket = mount({ id: "891e7689e8fffff", score: 79, categories: [{ title: "Здоров'я", score: 93 }] });
  fireEvent.change(screen.getByLabelText("Твоє запитання"), { target: { value: "Що тут поруч?" } });
  fireEvent.click(screen.getByRole("button", { name: "Надіслати запитання" }));
  expect(JSON.parse(socket.send.mock.calls[1][0]).text).toBe("Ділянка Львова (H3: 891e7689e8fffff). Оцінка комфорту: 79/100. Категорії: Здоров'я: 93/100.\n\nЩо тут поруч?");
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
