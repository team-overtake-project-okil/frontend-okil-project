// Фокус розгорнутої карти: прокрутка, сусіди секції і пастка Tab
import { useEffect, useRef, type RefObject } from "react";

interface UseExpandedMapFocusArgs {
  expanded: boolean;
  onEscape: () => void;
}

export function useExpandedMapFocus({
  expanded,
  onEscape,
}: UseExpandedMapFocusArgs): {
  sectionRef: RefObject<HTMLDivElement | null>;
  expandRef: RefObject<HTMLButtonElement | null>;
} {
  const sectionRef = useRef<HTMLDivElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!expanded) return;
    const returnFocus = expandRef.current;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let node: HTMLElement | null = sectionRef.current;
    while (node?.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node && sibling instanceof HTMLElement) {
          siblings.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      node = node.parentElement;
    }
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscapeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = [
        ...sectionRef.current!.querySelectorAll<HTMLElement>(
          'button,input,a[href],[tabindex="0"]',
        ),
      ].filter(
        (element) =>
          element.getClientRects().length &&
          !element.hasAttribute("disabled") &&
          !element.closest("[inert]"),
      );
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      document.documentElement.style.overflow = previous;
      siblings.forEach(({ element, inert }) => (element.inert = inert));
      window.removeEventListener("keydown", key);
      returnFocus?.focus();
    };
  }, [expanded]);

  return { sectionRef, expandRef };
}
