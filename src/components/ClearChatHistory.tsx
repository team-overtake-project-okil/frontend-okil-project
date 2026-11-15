import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ClearChatHistoryControls = {
  disabled: boolean;
  confirmationRequired: boolean;
  clearing: boolean;
  error: string | null;
  requestClear: () => void;
  cancel: () => void;
  confirm: () => Promise<void>;
};

function useClearChatHistory({
  clear,
  disabled,
}: {
  clear: () => Promise<void>;
  disabled: boolean;
}): ClearChatHistoryControls {
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  const requestClear = useCallback(() => {
    if (disabled || pending.current) return;
    setError(null);
    setConfirmationRequired(true);
  }, [disabled]);

  const cancel = useCallback(() => {
    if (!pending.current) setConfirmationRequired(false);
  }, []);

  const confirm = useCallback(async () => {
    if (!confirmationRequired || disabled || pending.current) return;
    pending.current = true;
    setClearing(true);
    setError(null);
    try {
      await clear();
      setConfirmationRequired(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не вдалося очистити історію.");
    } finally {
      pending.current = false;
      setClearing(false);
    }
  }, [clear, confirmationRequired, disabled]);

  return {
    disabled: disabled || clearing,
    confirmationRequired,
    clearing,
    error,
    requestClear,
    cancel,
    confirm,
  };
}

/** Headless confirmation flow. Renders only the UI supplied by its caller. */
export function ClearChatHistory({
  clear,
  disabled,
  children,
}: {
  clear: () => Promise<void>;
  disabled: boolean;
  children?: (controls: ClearChatHistoryControls) => ReactNode;
}) {
  const controls = useClearChatHistory({ clear, disabled });
  return children?.(controls) ?? null;
}
