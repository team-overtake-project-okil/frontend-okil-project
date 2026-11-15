import { useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { comfortColor } from "./lib/palette";

export default function DebugAccordion({
  title,
  value,
  score,
  open,
  onToggle,
  children,
  className = "",
}: {
  title: string;
  value: number;
  score?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  const contentId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  function keepHeadingVisible() {
    const heading = trigger.current;
    const panel = heading?.closest<HTMLElement>(".debug-inspector");
    if (!heading || !panel || heading.getAttribute("aria-expanded") !== "true")
      return;
    const offset =
      heading.getBoundingClientRect().top - panel.getBoundingClientRect().top;
    if (offset < 12)
      panel.scrollTo({
        top: panel.scrollTop + offset - 12,
        behavior: reducedMotion ? "instant" : "smooth",
      });
  }
  const reducedMotion = useReducedMotion();
  return (
    <div className={`debug-accordion ${className}`}>
      <button
        ref={trigger}
        className="debug-accordion-trigger"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={onToggle}
      >
        <span className="debug-accordion-heading">
          <span className="debug-accordion-title">
            {title}
            <ChevronRightIcon aria-hidden="true" />
          </span>
          <span className="debug-accordion-value">{value}</span>
        </span>
        {score !== undefined && (
          <span className="debug-category-track" aria-hidden="true">
            <span
              style={{
                width: `${score}%`,
                backgroundColor: comfortColor(score),
              }}
            />
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0 : 0.24,
              ease: [0.22, 0.82, 0.24, 1],
            }}
            className="debug-accordion-content"
            onAnimationComplete={keepHeadingVisible}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
