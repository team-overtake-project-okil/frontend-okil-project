import { useEffect, useRef, useState } from "react";
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import "./Chat.css";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";

export type HexChatContext = {
  id: string;
  score: number;
  categories: { title: string; score: number }[];
};

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

export function Chat({
  open,
  onOpenChange: setOpen,
  host,
  context,
  onRemoveContext,
  onAddContext,
  canAddContext,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  host: HTMLDivElement | null;
  context: HexChatContext | null;
  onRemoveContext: () => void;
  onAddContext: () => void;
  canAddContext: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [started, setStarted] = useState(false);
  if (open && !started) setStarted(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [status, setStatus] = useState("Підключаємося…");

  useEffect(() => {
    if (!CHAT_URL || !started) return;

    const socket = new WebSocket(CHAT_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      const sessionToken = sessionStorage.getItem(TOKEN_KEY);
      socket.send(
        JSON.stringify({
          type: "session.open",
          ...(sessionToken ? { sessionToken } : {}),
        }),
      );
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
          setTurns((current) =>
            current.map((turn) =>
              turn.requestId === event.requestId
                ? { ...turn, answer: event.text }
                : turn,
            ),
          );
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
            setTurns((current) =>
              current.filter(
                (turn) =>
                  turn.requestId !== event.requestId ||
                  turn.answer !== undefined,
              ),
            );
            setStatus(event.message);
          }
          break;
      }
    };

    socket.onclose = () => {
      setReady(false);
      setWaiting(false);
      setStatus("Зв’язок втрачено. Спробуй підключитися знову.");
    };

    return () => {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socketRef.current = null;
      socket.close();
    };
  }, [attempt, started]);

  useEffect(() => {
    if (open && host && !host.closest("[hidden]")) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [open, host]);

  useEffect(() => {
    if (open && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [open, turns, waiting]);

  function closePanel() {
    setOpen(false);
    if (host) {
      host.parentElement
        ?.querySelector<HTMLButtonElement>(".assessment-tabs button")
        ?.focus();
    }
  }

  function reconnect() {
    setReady(false);
    setWaiting(false);
    setStatus("Підключаємося…");
    setAttempt((value) => value + 1);
  }

  function sendQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const socket = socketRef.current;
    const question = text.trim();

    if (
      !ready ||
      waiting ||
      !question ||
      socket?.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const requestId = crypto.randomUUID();
    const contextText = context
      ? `Ділянка Львова (H3: ${context.id}). Оцінка комфорту: ${context.score}/100. Категорії: ${context.categories.map((item) => `${item.title}: ${item.score}/100`).join("; ")}.\n\n`
      : "";
    const message = contextText + question;
    if (message.length > 4000) {
      setStatus(
        "Запитання разом із даними ділянки перевищує 4000 символів. Скороти текст.",
      );
      return;
    }
    socket.send(
      JSON.stringify({ type: "message.send", requestId, text: message }),
    );

    setTurns((current) => [...current, { requestId, question: message }]);
    setText("");
    setWaiting(true);
    setStatus("Надсилаємо…");
  }

  const disconnected = !ready && !waiting && status.startsWith("Зв’язок");
  const panel = (
    <section
      id="okil-chat"
      className="chat-panel"
      role="region"
      aria-labelledby="chat-title"
      hidden={!open}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          closePanel();
        }
      }}
    >
      <header className="chat-header">
        <span className="chat-avatar">
          <ChatBubbleLeftRightIcon aria-hidden="true" />
        </span>
        <div>
          <p className="chat-eyebrow">Помічник Окіл</p>
          <h2 id="chat-title">Поговорімо про місто</h2>
        </div>
        <button
          type="button"
          className="chat-icon-button"
          aria-label="Закрити чат"
          onClick={closePanel}
        >
          <XMarkIcon aria-hidden="true" />
        </button>
      </header>

      <div className="chat-connection" role="status">
        <span className={ready ? "chat-dot is-ready" : "chat-dot"} />
        <span>{!CHAT_URL ? "Чат тимчасово недоступний" : status}</span>
        {disconnected && (
          <button type="button" onClick={reconnect} className="chat-reconnect">
            <ArrowPathIcon aria-hidden="true" /> Перепідключити
          </button>
        )}
      </div>

      <div
        ref={messagesRef}
        className="chat-messages"
        role="log"
        aria-label="Історія розмови"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {turns.length === 0 && (
          <div className="chat-welcome">
            <span className="chat-welcome-icon">
              <ChatBubbleLeftRightIcon aria-hidden="true" />
            </span>
            <h3>Місто починається з питання</h3>
            <p>Напиши, що тебе цікавить про райони та міське середовище.</p>
            <span className="chat-welcome-note">
              Твоя розмова залишиться тут, якщо закриєш панель.
            </span>
          </div>
        )}
        {turns.map((turn) => (
          <div key={turn.requestId} className="chat-turn">
            <div className="chat-message chat-message-user">
              <span className="chat-author">Ти</span>
              <p>{turn.question}</p>
            </div>
            {turn.answer !== undefined && (
              <div className="chat-message chat-message-assistant">
                <span className="chat-author">Помічник Окіл</span>
                <p>{turn.answer}</p>
              </div>
            )}
          </div>
        ))}
        {waiting && (
          <div className="chat-typing">
            <span />
            <span />
            <span />
            <span className="chat-typing-label">Готуємо відповідь…</span>
          </div>
        )}
      </div>

      <form onSubmit={sendQuestion} className="chat-composer">
        {host && (
          <button
            type="button"
            className="chat-attach"
            disabled={!canAddContext}
            onClick={onAddContext}
          >
            <span aria-hidden="true">＋</span>{" "}
            {context ? "Оновити ділянку в контексті" : "Додати цю ділянку"}
          </button>
        )}
        {context && (
          <div className="chat-context">
            <div>
              <strong>Ділянка · {context.score}/100</strong>
              <small>{context.id}</small>
            </div>
            <button
              type="button"
              aria-label="Прибрати ділянку з контексту"
              onClick={onRemoveContext}
            >
              ✕
            </button>
            <p>Дані цієї ділянки буде додано до запитання.</p>
          </div>
        )}
        <label htmlFor="chat-question" className="chat-input-label">
          Твоє запитання
        </label>
        <div className="chat-input-row">
          <textarea
            id="chat-question"
            ref={inputRef}
            placeholder="Напиши запитання…"
            rows={2}
            value={text}
            maxLength={4000}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            className="chat-send"
            aria-label="Надіслати запитання"
            disabled={!ready || waiting || !text.trim()}
          >
            <PaperAirplaneIcon aria-hidden="true" />
          </button>
        </div>
        <div className="chat-composer-hint">
          <span>Enter — надіслати · Shift + Enter — новий рядок</span>
          <span>{text.length} / 4000</span>
        </div>
      </form>
    </section>
  );
  return host ? createPortal(panel, host) : null;
}
