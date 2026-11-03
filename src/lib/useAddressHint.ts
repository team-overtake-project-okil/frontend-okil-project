import { useEffect, type RefObject } from "react";

const examples = ["Залізнична 7П", "Шевченка 25", "Зелена 115", "Наукова 12"];
export function useAddressHint(
  ref: RefObject<HTMLInputElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const input = ref.current;
    if (!input || !enabled) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false,
      index = 0,
      length = 0,
      deleting = false;
    const fallback = "Введіть вулицю або адресу";
    const stop = () => {
      clearTimeout(timer);
      input.placeholder = fallback;
    };
    const tick = () => {
      if (
        !visible ||
        document.hidden ||
        media.matches ||
        document.activeElement === input ||
        input.value
      ) {
        stop();
        return;
      }
      const text = examples[index];
      length += deleting ? -1 : 1;
      input.placeholder = "Наприклад: " + text.slice(0, length);
      let delay = deleting ? 45 : 85;
      if (!deleting && length === text.length) {
        deleting = true;
        delay = 1100;
      } else if (deleting && length === 0) {
        deleting = false;
        index = (index + 1) % examples.length;
        delay = 350;
      }
      timer = setTimeout(tick, delay);
    };
    const resume = () => {
      stop();
      length = 0;
      deleting = false;
      if (
        visible &&
        !document.hidden &&
        !media.matches &&
        document.activeElement !== input &&
        !input.value
      )
        timer = setTimeout(tick, 600);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    observer.observe(input);
    input.addEventListener("focus", stop);
    input.addEventListener("blur", resume);
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", resume);
    return () => {
      stop();
      observer.disconnect();
      input.removeEventListener("focus", stop);
      input.removeEventListener("blur", resume);
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", resume);
    };
  }, [ref, enabled]);
}
