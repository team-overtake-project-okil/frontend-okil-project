// Бічна панель карти: ваги категорій і, замість них, маршрути вибраної зупинки
import type { Ref } from "react";
import { motion, MotionConfig } from "motion/react";
import XMark from "../../icons/x-mark";
import {
  lockedTogglerIds,
  togglerIds,
  type TogglerState,
  type TogglerStates,
} from "../../lib/assessmentWeights";
import { categoryLabels } from "../../lib/hexagonAssessment";
import type { HexStopProperties } from "../../lib/useStopsByHex";
import { StopRoutesFace } from "./StopRoutesFace";
import { TogglerCard } from "./TogglerCard";

const faceEase = [0.22, 0.82, 0.24, 1] as const;
const faceTransition = {
  x: { duration: 0.5, ease: faceEase },
  scale: { duration: 0.5, ease: faceEase },
  opacity: { duration: 0.38, ease: "easeOut" },
  filter: { duration: 0.38, ease: "easeOut" },
} as const;

const categoryDescriptions = [
  "Зупинки та транспорт",
  "Повсякденні послуги",
  "Медична інфраструктура",
  "Навчальні заклади",
  "Місця для відпочинку",
  "Спортивна інфраструктура",
  "Заклади харчування",
  "Завжди враховується",
];

interface WeightsPanelProps {
  panelRef: Ref<HTMLDivElement>;
  stop: HexStopProperties | null;
  faceStop: HexStopProperties | null;
  dirty: boolean;
  togglers: TogglerStates;
  onTogglerChange: (id: string, patch: Partial<TogglerState>) => void;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  onStopClose: () => void;
}

export function WeightsPanel({
  panelRef,
  stop,
  faceStop,
  dirty,
  togglers,
  onTogglerChange,
  onClose,
  onReset,
  onApply,
  onStopClose,
}: WeightsPanelProps) {
  return (
    <div
      ref={panelRef}
      id="weights-panel"
      className={`weights-panel ${stop ? "is-stop" : ""}`}
      aria-label={stop ? "Маршрути зупинки" : "Пріоритети"}
    >
      <MotionConfig reducedMotion="user">
        <div className="panel-deck">
          <motion.div
            className="panel-face weights-face"
            initial={false}
            animate={
              stop
                ? { x: "-14%", scale: 0.96, opacity: 0, filter: "blur(3px)" }
                : { x: "0%", scale: 1, opacity: 1, filter: "blur(0px)" }
            }
            transition={faceTransition}
            inert={Boolean(stop)}
            style={{ pointerEvents: stop ? "none" : "auto" }}
          >
            <div className="panel-heading">
              <div>
                <div className="text-block eyebrow uppercase">
                  персональна оцінка
                </div>
                <div role="heading" aria-level={3} className="heading-3">
                  Що для вас важливо
                </div>
              </div>
              <button
                type="button"
                className="weights-close"
                aria-label="Закрити налаштування"
                onClick={onClose}
              >
                <XMark aria-hidden="true" />
              </button>
            </div>
            <div className="text-block panel-intro">
              Змініть важливість категорій. Карта оновиться після застосування
            </div>
            <div className="weights-list">
              {categoryLabels.map(([, title], index) => {
                const id = togglerIds[index];
                return (
                  <TogglerCard
                    key={id}
                    id={id}
                    locked={lockedTogglerIds.has(id)}
                    value={togglers[id].value}
                    on={togglers[id].on}
                    title={title}
                    description={categoryDescriptions[index]}
                    onValueChange={(value) => onTogglerChange(id, { value })}
                    onOnChange={(on) => onTogglerChange(id, { on })}
                  />
                );
              })}
            </div>
            <div className="panel-actions">
              <div className="text-block" role="status">
                {dirty ? "Є незастосовані зміни" : "Пріоритети застосовано"}
              </div>
              <div>
                <button className="secondary-button" onClick={onReset}>
                  Скинути
                </button>
                <button className="primary-button" onClick={onApply}>
                  Застосувати
                </button>
              </div>
            </div>
          </motion.div>
          <motion.div
            className="panel-face stop-face"
            initial={{
              x: "16%",
              scale: 0.98,
              opacity: 0,
              filter: "blur(3px)",
            }}
            animate={
              stop
                ? { x: "0%", scale: 1, opacity: 1, filter: "blur(0px)" }
                : { x: "16%", scale: 0.98, opacity: 0, filter: "blur(3px)" }
            }
            transition={faceTransition}
            inert={!stop}
            style={{ pointerEvents: stop ? "auto" : "none" }}
          >
            {faceStop && (
              <StopRoutesFace
                key={faceStop.id}
                stop={faceStop}
                onClose={onStopClose}
              />
            )}
          </motion.div>
        </div>
      </MotionConfig>
    </div>
  );
}
