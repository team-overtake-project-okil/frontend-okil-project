import { useRef } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { ClearChatHistoryControls } from "./ClearChatHistory";
import "./ClearChatHistoryButton.scss";

export function ClearChatHistoryButton({
  visible,
  ...controls
}: ClearChatHistoryControls & { visible: boolean }) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog.Root
      open={controls.confirmationRequired}
      onOpenChange={(open) => {
        if (open) controls.requestClear();
        else controls.cancel();
      }}
    >
      {visible && (
        <div className="chat-history-toolbar">
          <AlertDialog.Trigger
            className="chat-history-trigger"
            disabled={controls.disabled}
          >
            <TrashIcon aria-hidden="true" />
            <span>Очистити чат</span>
          </AlertDialog.Trigger>
        </div>
      )}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="chat-clear-backdrop" />
        <AlertDialog.Popup
          className="chat-clear-dialog"
          initialFocus={cancelRef}
          onKeyDown={(event) => event.stopPropagation()}
          aria-busy={controls.clearing}
        >
          <span className="chat-clear-mark">
            <TrashIcon aria-hidden="true" />
          </span>
          <AlertDialog.Title className="chat-clear-title">
            Очистити історію чату?
          </AlertDialog.Title>
          <AlertDialog.Description className="chat-clear-description">
            Усі повідомлення цієї розмови буде видалено. Відновити їх не
            вдасться, але ти зможеш одразу почати нову розмову.
          </AlertDialog.Description>
          {controls.error && (
            <p className="chat-clear-error" role="alert">
              {controls.error}
            </p>
          )}
          <div className="chat-clear-actions">
            <AlertDialog.Close ref={cancelRef} disabled={controls.clearing}>
              Залишити чат
            </AlertDialog.Close>
            <button
              type="button"
              className="chat-clear-confirm"
              disabled={controls.disabled}
              onClick={() => void controls.confirm()}
            >
              {controls.clearing && (
                <ArrowPathIcon
                  className="chat-clear-spinner"
                  aria-hidden="true"
                />
              )}
              {controls.clearing ? "Очищуємо…" : "Очистити"}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
