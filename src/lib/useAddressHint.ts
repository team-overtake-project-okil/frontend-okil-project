import { useEffect, type RefObject } from "react";

const examples = [
  "Залізнична 7П",
  "Шевченка 25",
  "Зелена 115",
  "Наукова 12",
  "Данила Апостола 11",
];
export const addressHintStart = "Наприклад: ";
const addressHintFocused = "Введіть вулицю або адресу";

export function useAddressHint(
  ref: RefObject<HTMLInputElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const input = ref.current;
    if (!input || !enabled) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    let index = 0;
    let length = 0;
    let deleting = false;

    const paint = () => {
      input.placeholder = addressHintStart + examples[index].slice(0, length);
    };
    const clear = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    const running = () =>
      visible &&
      !document.hidden &&
      !media.matches &&
      document.activeElement !== input &&
      !input.value;
    const tick = () => {
      if (!running()) {
        clear();
        return;
      }
      const text = examples[index];
      length += deleting ? -1 : 1;
      paint();
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
      clear();
      if (input.value) return;
      if (document.activeElement === input) {
        input.placeholder = addressHintFocused;
        return;
      }
      if (media.matches) {
        index = 0;
        length = examples[0].length;
        deleting = true;
        input.placeholder = addressHintStart + examples[0];
        return;
      }
      paint();
      if (!running()) return;
      const text = examples[index];
      const delay =
        length === text.length ? 1100 : length === 0 ? 280 : deleting ? 45 : 85;
      timer = setTimeout(tick, delay);
    };
    const onFocus = () => {
      clear();
      input.placeholder = addressHintFocused;
    };
    const onBlur = () => {
      timer = setTimeout(resume, 0);
    };
    const onVisibility = () => {
      if (document.hidden) clear();
      else resume();
    };

    paint();
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) resume();
      else clear();
    });
    observer.observe(input);
    input.addEventListener("focus", onFocus);
    input.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    media.addEventListener("change", resume);
    return () => {
      clear();
      observer.disconnect();
      input.removeEventListener("focus", onFocus);
      input.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      media.removeEventListener("change", resume);
    };
  }, [ref, enabled]);
}
