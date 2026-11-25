import { useCallback, useEffect, useRef } from "react";

// Keep native dialogs mounted and modal until their exit transition finishes.
export function useAnimatedDialog(open: boolean) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingClose = useRef<(() => void) | null>(null);
  const cleanupClose = useRef<(() => void) | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    return () => {
      cleanupClose.current?.();
      cleanupClose.current = null;
      pendingClose.current = null;
    };
  }, [open]);

  const closeDialog = useCallback((onClosed: () => void) => {
    if (pendingClose.current) return;
    const dialog = dialogRef.current;
    if (
      !dialog?.open ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      dialog?.close();
      onClosed();
      return;
    }
    pendingClose.current = onClosed;
    const finish = () => {
      const callback = pendingClose.current;
      if (!callback) return;
      cleanupClose.current?.();
      cleanupClose.current = null;
      pendingClose.current = null;
      dialog.close();
      dialog.removeAttribute("data-closing");
      callback();
    };
    const onAnimationEnd = (event: AnimationEvent) => {
      if (
        event.target === dialog &&
        event.animationName === "anchor-dialog-out"
      )
        finish();
    };
    dialog.addEventListener("animationend", onAnimationEnd);
    // Fallback covers interrupted animations or styles changing during an exit.
    const timeout = window.setTimeout(finish, 240);
    cleanupClose.current = () => {
      window.clearTimeout(timeout);
      dialog.removeEventListener("animationend", onAnimationEnd);
    };
    const currentStyle = getComputedStyle(dialog);
    dialog.style.setProperty("--dialog-exit-opacity", currentStyle.opacity);
    dialog.style.setProperty("--dialog-exit-transform", currentStyle.transform);
    dialog.setAttribute("data-closing", "");
  }, []);

  return { dialogRef, closeDialog };
}
