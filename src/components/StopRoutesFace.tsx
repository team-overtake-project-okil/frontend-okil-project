import { motion } from "motion/react";
import type { HexStopProperties } from "../lib/useStopsByHex";
import { groupStopRoutes, routesCountLabel } from "../lib/stopRoutes";

const chipEase = [0.16, 0.84, 0.3, 1] as const;

interface StopRoutesFaceProps {
  stop: HexStopProperties;
  onClose: () => void;
}

export function StopRoutesFace({ stop, onClose }: StopRoutesFaceProps) {
  const groups = groupStopRoutes(stop.routes);
  const total = groups.reduce((count, group) => count + group.plates.length, 0);
  const showLabels = groups.length > 1 || groups[0]?.kind !== "other";
  let chipIndex = 0;

  return (
    <>
      <div className="panel-heading">
        <div>
          <div className="text-block eyebrow">ЗУПИНКА</div>
          <div role="heading" aria-level={3} className="heading-3">
            {stop.name?.trim() || "Зупинка"}
          </div>
        </div>
        <button
          type="button"
          className="stop-panel-close"
          aria-label="Повернути пріоритети"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="text-block panel-intro">
        {total === 0
          ? "На цій зупинці немає маршрутів."
          : routesCountLabel(total)}
      </div>
      <div className="stop-panel-routes" key={stop.id}>
        {groups.map((group) => (
          <div className="stop-panel-group" key={group.kind}>
            {showLabels && (
              <motion.div
                className="stop-popup-kind"
                initial={{ opacity: 0, y: 8, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.42, ease: chipEase }}
              >
                <span>{group.label}</span>
                <span>{group.plates.length}</span>
              </motion.div>
            )}
            {group.plates.map((plate) => {
              const delay = chipIndex * 0.022;
              chipIndex += 1;
              return (
                <motion.span
                  key={`${group.kind}-${plate}-${delay}`}
                  className={
                    group.kind === "other"
                      ? "stop-popup-route"
                      : `stop-popup-route is-${group.kind}`
                  }
                  initial={{ opacity: 0, y: 8, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.42, delay, ease: chipEase }}
                >
                  {plate}
                </motion.span>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
