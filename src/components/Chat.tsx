import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import {
  PaperAirplaneIcon,
  ArrowPathIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import "./Chat.css";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { chatWebSocketUrl } from "../lib/chatUrl";
import { ClearChatHistory } from "./ClearChatHistory";
import type { ClearChatHistoryControls } from "./ClearChatHistory";

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
  | { type: "session.cleared"; requestId: string; deleted: boolean }
  | { type: "message.accepted"; requestId: string }
  | { type: "answer.status"; requestId: string; stage: string }
  | { type: "answer.completed"; requestId: string; text: string }
  | { type: "error"; requestId: string | null; code: string; message: string };

export function Chat({
  open,
  onOpenChange: setOpen,
  host,
  selectedContext,
  attachedContext: context,
  onContextChange,
  renderClearHistory,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  host: HTMLDivElement | null;
  selectedContext: HexChatContext | null;
  attachedContext: HexChatContext | null;
  onContextChange: (context: HexChatContext | null) => void;
  renderClearHistory?: (controls: ClearChatHistoryControls) => ReactNode;
}) {
  const [attempt, setAttempt] = useState(0);
  const [started, setStarted] = useState(false);
  if (open && !started) setStarted(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const clearRef = useRef<{
    requestId: string;
    resolve: () => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  useLayoutEffect(() =>
  {
    const input = inputRef.current;
    if (!open || !input) return;
    const resize = () =>
    {
      input.style.height = "auto";
      input.style.height = Math.min(128, Math.max(32, input.scrollHeight)) + "px";
      input.style.overflowY = input.scrollHeight > 128 ? "auto" : "hidden";
    };
    resize();
    if (typeof ResizeObserver === "undefined") return;
    let width = input.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) =>
    {
      if (entry.contentRect.width === width) return;
      width = entry.contentRect.width;
      resize();
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, [text, open, host]);
  const [ready, setReady] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [status, setStatus] = useState("Підключаємося…");
  const resetContext = useEffectEvent(() => onContextChange(null));

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

      if (event.type === "session.cleared") {
        const pending = clearRef.current;
        if (!pending || event.requestId !== pending.requestId) return;
        clearTimeout(pending.timer);
        clearRef.current = null;
        sessionStorage.removeItem(TOKEN_KEY);
        setTurns([]);
        setText("");
        resetContext();
        setWaiting(false);
        setClearing(false);
        setReady(false);
        setStatus("Створюємо нову сесію…");
        pending.resolve();
        socket.send(JSON.stringify({ type: "session.open" }));
        return;
      }

      if (clearRef.current) {
        if (event.type === "error" && event.requestId === clearRef.current.requestId) {
          const pending = clearRef.current;
          clearTimeout(pending.timer);
          clearRef.current = null;
          setClearing(false);
          setStatus(event.message);
          pending.reject(new Error(event.message));
          return;
        }
      }

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
            setTurns([]);
            setText("");
            resetContext();
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
      rejectClear("Зв’язок втрачено. Перепідключися та спробуй ще раз.");
      setReady(false);
      setWaiting(false);
      setStatus("Зв’язок втрачено. Спробуй підключитися знову.");
    };

    return () => {
      rejectClear("Чат відключено. Спробуй ще раз після підключення.");
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socketRef.current = null;
      socket.close();
    };
  }, [attempt, started]);

  function rejectClear(message: string) {
    const pending = clearRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    clearRef.current = null;
    setClearing(false);
    pending.reject(new Error(message));
  }

  function clearHistory(): Promise<void> {
    const socket = socketRef.current;
    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (!ready || !sessionToken || clearRef.current || socket?.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Чат ще не готовий до очищення."));
    }
    const requestId = crypto.randomUUID();
    setClearing(true);
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        rejectClear("Немає підтвердження очищення. Перепідключися та спробуй ще раз.");
        setReady(false);
        socket.close();
      }, 10_000);
      clearRef.current = { requestId, resolve, reject, timer };
      try {
        socket.send(JSON.stringify({ type: "session.clear", requestId, sessionToken }));
      } catch {
        rejectClear("Не вдалося надіслати запит очищення. Спробуй ще раз.");
      }
    });
  }

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
      clearing ||
      clearRef.current ||
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
      <ClearChatHistory clear={clearHistory} disabled={!ready || clearing}>
        {renderClearHistory}
      </ClearChatHistory>
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
        {turns.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-ai-mark">
              <span className="chat-ai-icon">
                <SparklesIcon aria-hidden="true" />
              </span>
              <span>AI-помічник Окіл</span>
            </div>
            <h3>Запитай про місто</h3>
            <p>
              {context
                ? "Запитай про оцінки й особливості прикріпленої ділянки."
                : "Про райони, транспорт і місця поруч. Для запитання про ділянку скористайся кнопкою «Запитати про цю ділянку»."}
            </p>
            <div className="chat-suggestions" aria-label="Приклади запитань">
              {(context
                ? [
                    "Що найбільше впливає на цю оцінку?",
                    "Які слабкі сторони цієї ділянки?",
                    "Наскільки збалансовані оцінки категорій?",
                  ]
                : ["Як обрати ділянку для життя?", "Що означають оцінки категорій?"]
              ).map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={waiting}
                  onClick={() =>
                  {
                    setText(question);
                    inputRef.current?.focus();
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
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
                Про цей гексагон: {context.score}/100
              </strong>
              <small>{context.id}</small>
            </div>
            <button
              type="button"
              aria-label="Прибрати ділянку з контексту"
              onClick={() => onContextChange(null)}
            >
              ✕
            </button>
            {context.id !== selectedContext?.id && (
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
            disabled={!ready || waiting || clearing || !text.trim()}
          >
            <PaperAirplaneIcon aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
  return host ? createPortal(panel, host) : null;
}
