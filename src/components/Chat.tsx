import { useEffect, useRef, useState } from "react";
import {
  PaperAirplaneIcon,
  ArrowPathIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import "./Chat.css";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { chatWebSocketUrl } from "../lib/chatUrl";

export type HexChatContext = {
  id: string;
  score: number;
  categories: { title: string; score: number }[];
};

const TOKEN_KEY = "okil.chat.token";
const CHAT_URL = chatWebSocketUrl();

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
  selectedContext,
  details,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  host: HTMLDivElement | null;
  selectedContext: HexChatContext | null;
  details: ReactNode;
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
  // A draft pins its context. A later map click only changes the next draft.
  const [draftContext, setDraftContext] = useState<{
    value: HexChatContext | null;
  } | null>(null);
  const [pendingContext, setPendingContext] = useState<{
    value: HexChatContext | null;
  } | null>(null);
  const context = draftContext
    ? draftContext.value
    : waiting && pendingContext
      ? pendingContext.value
      : selectedContext;

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

  const showingDetails = Boolean(details);
  useEffect(() => {
    if (showingDetails && messagesRef.current)
      messagesRef.current.scrollTop = 0;
  }, [showingDetails, selectedContext?.id]);

  function closePanel() {
    setOpen(false);
    if (host) {
      host
        .closest(".map-section")
        ?.querySelector<HTMLButtonElement>(".map-chat-toggle")
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
    setPendingContext({ value: context });
    setDraftContext(null);
    setWaiting(true);
    setStatus("Надсилаємо…");
  }

  const disconnected = !ready && !waiting && status.startsWith("Зв’язок");
  const showError =
    Boolean(CHAT_URL) &&
    ![
      "Підключаємося…",
      "Чат готовий",
      "Запит прийнято",
      "Готуємо відповідь…",
      "Створюємо нову сесію…",
      "Надсилаємо…",
    ].includes(status);
  const panel = (
    <section
      id="okil-chat"
      className="chat-panel"
      role="region"
      aria-label="Чат із помічником"
      hidden={!open}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          closePanel();
        }
      }}
    >
      <div className={showError ? "chat-connection" : "sr-only"} role="status">
        <span>{CHAT_URL ? status : ""}</span>
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
        {details}
        {turns.length === 0 && !showingDetails && (
          <div className="chat-welcome">
            <div className="chat-ai-mark">
              <span className="chat-ai-icon">
                <SparklesIcon aria-hidden="true" />
              </span>
              <span>AI-помічник Окіл</span>
            </div>
            <h3>Запитай про місто</h3>
            <p>
              Про райони, транспорт і місця поруч. Вибрана на мапі ділянка
              додається до запитання.
            </p>
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
        {context && (
          <div className="chat-context">
            <div>
              <strong title={context.id}>
                Про цю ділянку · {context.score}/100
              </strong>
              <small>{context.id}</small>
            </div>
            <button
              type="button"
              aria-label="Прибрати ділянку з контексту"
              onClick={() => setDraftContext({ value: null })}
            >
              ✕
            </button>
            {draftContext && context.id !== selectedContext?.id && (
              <span className="chat-context-note">
                Контекст цього запитання збережено
              </span>
            )}
            <p>Дані цієї ділянки буде додано до запитання.</p>
          </div>
        )}
        <div className="chat-input-row">
          <textarea
            id="chat-question"
            aria-label="Твоє запитання"
            ref={inputRef}
            placeholder="Напиши запитання…"
            rows={1}
            value={text}
            maxLength={4000}
            onChange={(event) => {
              const nextText = event.target.value;
              if (!nextText) setDraftContext(null);
              else if (!draftContext) setDraftContext({ value: context });
              setText(nextText);
            }}
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
      </form>
    </section>
  );
  return host ? createPortal(panel, host) : null;
}
