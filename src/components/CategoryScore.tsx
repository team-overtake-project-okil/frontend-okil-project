import { useId, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { comfortColor } from "../lib/palette";
import ChevronRight from "../icons/chevron-right";
import { categoryExplanation, type CategoryRating } from "../lib/hexagonAssessment";

type Props = {
  title: string;
  item: CategoryRating | undefined;
  open: boolean;
  onToggle: () => void;
};

export function CategoryScore({ title, item, open, onToggle }: Props) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  return (
    <div className="category-score">
      <button type="button" className="category-toggle" id={`${id}-trigger`}
        aria-label={`Пояснення: ${title}`} aria-expanded={open}
        aria-controls={`${id}-panel`} onClick={onToggle}>
        <span className="category-summary">
          <span className="inline-text category-title">
            {title}
            <motion.span className="category-chevron" aria-hidden="true"
              initial={false} animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}>
              <ChevronRight strokeWidth={2} />
            </motion.span>
          </span>
          <strong>{!item ? "Немає даних" : !item.enabled ? "Вимкнено" : item.score}</strong>
        </span>
        <meter min="0" max="100" value={item?.enabled ? item.score : 0}
          aria-label={title} style={{ "--score-color": comfortColor(item?.score ?? 0) } as CSSProperties} />
      </button>
      <motion.div className="category-panel" id={`${id}-panel`}
        role="region" aria-labelledby={`${id}-trigger`} aria-hidden={!open} inert={!open}
        initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ height: { duration: reduceMotion ? 0 : 0.22, ease: [0.22, 0.8, 0.25, 1] },
          opacity: { duration: reduceMotion ? 0 : 0.14 } }}>
        <div className="text-block category-description">
          {categoryExplanation(item)}
          {item && !item.enabled && <p>Не враховується в загальній оцінці.</p>}
        </div>
      </motion.div>
    </div>
  );
}
