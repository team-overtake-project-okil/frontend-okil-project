import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

const TOKEN_KEY = "okil.chat.token";
const CHAT_URL = import.meta.env.VITE_CHAT_WS_URL;

type Turn = {
  requestId: string;
  question: string;
  answer?: string;
};

type ChatEvent =
  | { type: "session.ready"; sessionToken: string; history: Turn[] }
  | { type: "message.accepted"; requestId: string }
  | { type: "answer.status"; requestId: string; stage: string }
  | { type: "answer.completed"; requestId: string; text: string }
  | { type: "error"; requestId: string | null; code: string; message: string };

export function Chat() {
  const socketRef = useRef<WebSocket | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [status, setStatus] = useState("Підключаємося…");

  useEffect(() => {
    if (!CHAT_URL) return;

    const socket = new WebSocket(CHAT_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      const sessionToken = sessionStorage.getItem(TOKEN_KEY);
      socket.send(JSON.stringify({
        type: "session.open",
        ...(sessionToken ? { sessionToken } : {}),
      }));
    };

    socket.onmessage = ({ data }) => {
      const event = JSON.parse(data) as ChatEvent;

      switch (event.type) {
        case "session.ready":
          sessionStorage.setItem(TOKEN_KEY, event.sessionToken);
          setTurns(event.history);
          setReady(true);
          setStatus("Чат готовий");
          break;

        case "message.accepted":
          setStatus("Запит прийнято");
          break;

        case "answer.status":
          setStatus("Готуємо відповідь…");
          break;

        case "answer.completed":
          setTurns((current) => current.map((turn) =>
            turn.requestId === event.requestId
              ? { ...turn, answer: event.text }
              : turn
          ));
          setWaiting(false);
          setStatus("Чат готовий");
          break;

        case "error":
          setWaiting(false);

          if (event.code === "session_expired") {
            sessionStorage.removeItem(TOKEN_KEY);
            setReady(false);
            setStatus("Створюємо нову сесію…");
            socket.send(JSON.stringify({ type: "session.open" }));
          } else {
            setTurns((current) => current.filter((turn) =>
              turn.requestId !== event.requestId || turn.answer !== undefined
            ));
            setStatus(event.message);
          }
          break;
      }
    };

    socket.onclose = () => {
      setReady(false);
      setWaiting(false);
      setStatus("З’єднання закрито. Онови сторінку, щоб підключитися знову.");
    };

    return () => {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socketRef.current = null;
      socket.close();
    };
  }, []);

  function sendQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const socket = socketRef.current;
    const question = text.trim();

    if (!ready || waiting || !question || socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    const requestId = crypto.randomUUID();
    socket.send(JSON.stringify({ type: "message.send", requestId, text: question }));

    setTurns((current) => [...current, { requestId, question }]);
    setText("");
    setWaiting(true);
    setStatus("Надсилаємо…");
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-3 p-4">
      <h2>Чат</h2>
      <p role="status">{CHAT_URL ? status : "Задай VITE_CHAT_WS_URL у .env.local"}</p>

      {turns.map((turn) => (
        <article key={turn.requestId} className="rounded border p-3">
          <p><strong>Ти:</strong> {turn.question}</p>
          {turn.answer !== undefined && (
            <p className="whitespace-pre-wrap"><strong>Чат:</strong> {turn.answer}</p>
          )}
        </article>
      ))}

      <form onSubmit={sendQuestion} className="flex gap-2">
        <input
          aria-label="Запитання"
          placeholder="Напиши запитання"
          className="min-w-0 flex-1 rounded border p-2"
          value={text}
          maxLength={4000}
          onChange={(event) => setText(event.target.value)}
        />
        <button
          type="submit"
          disabled={!ready || waiting || !text.trim()}
          className="rounded border px-3 disabled:opacity-50"
        >
          Надіслати
        </button>
      </form>
    </section>
  );
}