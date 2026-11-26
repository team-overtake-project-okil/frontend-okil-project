import type { MobilityAnchor } from "../../lib/mobilityAnchors";
import { useId, type CSSProperties } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  categoryLabels,
  comparisonColors,
  comparisonLabels,
  type HexagonAssessment,
} from "../../lib/hexagonAssessment";
import { comfortColor } from "../../lib/palette";
import { Chip } from "../Chip/Chip";
import "./HexagonComparison.scss";

interface HexagonComparisonProps {
  selectedId: string | null;
  onAdd: () => void;
  onExit: () => void;
  replacementPending: boolean;
  onCancelReplacement: () => void;
  onConfirmReplacement: () => void;
  ids: readonly string[];
  comparison: UseQueryResult<HexagonAssessment[]>;
  anchorIndex: number;
  onAnchorChange: (index: number) => void;
  anchors?: readonly MobilityAnchor[];
  open: boolean;
  onToggle: () => void;
  onRemove: (id: string) => void;
}

function ComparisonScore({ value }: { value: number }) {
  return (
    <div className="comparison-score">
      <div className="inline-text">{value}</div>
      <meter
        min={0}
        max={100}
        value={value}
        aria-hidden="true"
        style={{ "--score-color": comfortColor(value) } as CSSProperties}
      />
    </div>
  );
}

export function HexagonComparison({
  selectedId,
  onAdd,
  onExit,
  replacementPending,
  onCancelReplacement,
  onConfirmReplacement,
  ids,
  comparison,
  anchorIndex,
  onAnchorChange,
  anchors,
  open,
  onToggle,
  onRemove,
}: HexagonComparisonProps) {
  const tableId = useId();
  const columns = ids.map((id) =>
    comparison.data?.find((item) => item.h3_id === id),
  );

  return (
    <div
      className="hex-comparison"
      data-open={open}
      aria-label="Порівняння ділянок"
    >
      <div className="hex-comparison-controls">
        <div className="inline-text">Порівняння · {ids.length}/3</div>
        {open ? (
          <button type="button" onClick={onExit}>
            Завершити
          </button>
        ) : (
          <button
            type="button"
            disabled={ids.length < 2}
            aria-expanded={open}
            aria-controls={tableId}
            onClick={onToggle}
          >
            Порівняти
          </button>
        )}
      </div>
      {open && (
        <button
          type="button"
          className="comparison-add-selected"
          aria-controls={tableId}
          aria-expanded={open}
          onClick={onToggle}
        >
          Згорнути
        </button>
      )}
      {replacementPending && (
        <div className="comparison-replacement">
          <p role="status">
            У порівнянні вже три ділянки. Замінити третю на вибрану?
          </p>
          <div>
            <button type="button" onClick={onConfirmReplacement}>
              Замінити третю
            </button>
            <button type="button" onClick={onCancelReplacement}>
              Скасувати
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="comparison-add-selected"
        disabled={
          !selectedId ||
          ids.includes(selectedId) ||
          ids.length >= comparisonLabels.length
        }
        onClick={onAdd}
      >
        {selectedId && ids.includes(selectedId)
          ? "Вибрану ділянку вже додано"
          : ids.length >= comparisonLabels.length
            ? "Вибрано максимум ділянок"
            : "Додати вибрану ділянку"}
      </button>
      {!selectedId && (
        <p>Виберіть ділянку на мапі, щоб додати її до порівняння.</p>
      )}
      {!open && (
        <div className="hex-comparison-selection">
          {ids.map((id, index) => (
            <button
              key={id}
              type="button"
              className="comparison-selection-tag"
              style={
                { "--hex-color": comparisonColors[index] } as CSSProperties
              }
              aria-label={`Прибрати ділянку ${comparisonLabels[index]}`}
              title={`Прибрати ділянку ${comparisonLabels[index]}`}
              onClick={() => onRemove(id)}
            >
              <span className="comparison-selection-dot" aria-hidden="true" />
              <span>{comparisonLabels[index]}</span>
              <span className="comparison-selection-remove" aria-hidden="true">
                ×
              </span>
            </button>
          ))}
        </div>
      )}
      {ids.length === 1 && (
        <div className="text-block">Додайте ще одну ділянку на карті.</div>
      )}
      <div
        id={tableId}
        className="hex-comparison-scroll"
        hidden={!open}
        tabIndex={open ? 0 : undefined}
        role="region"
        aria-label="Таблиця оцінок ділянок"
      >
        {open && (
          <table>
            <thead>
              <tr>
                <th scope="col">Показник</th>
                {ids.map((id, index) => (
                  <th scope="col" key={id}>
                    <Chip
                      label={comparisonLabels[index]}
                      color={comparisonColors[index]}
                      onRemove={() => onRemove(id)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Загальна оцінка</th>
                {columns.map((column, index) => (
                  <td key={ids[index]}>
                    {comparison.isPending ||
                    (comparison.isError && comparison.isFetching) ? (
                      <span role="status">Завантаження…</span>
                    ) : comparison.isError || !column ? (
                      <>
                        <span role="alert">Оцінка недоступна.</span>
                        <button
                          type="button"
                          onClick={() => void comparison.refetch()}
                        >
                          Повторити
                        </button>
                      </>
                    ) : (
                      <ComparisonScore value={column.overall_rating} />
                    )}
                  </td>
                ))}
              </tr>
              {categoryLabels.map(([category, label]) => (
                <tr key={category}>
                  <th scope="row">{label}</th>
                  {columns.map((column, index) => {
                    const item = column?.categories.find(
                      (rating) => rating.category === category,
                    );
                    return (
                      <td key={ids[index]}>
                        {!comparison.isSuccess ? (
                          "—"
                        ) : !item ? (
                          "Немає даних"
                        ) : item.enabled ? (
                          <ComparisonScore value={item.score} />
                        ) : (
                          "Вимкнено"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open && anchors && anchors.length > 0 && (
        <div className="comparison-anchor-picker">
          <div className="comparison-anchor-heading">
            <span>Маршрути до</span>
            <span>
              {anchorIndex + 1} / {anchors.length}
            </span>
          </div>
          <div
            className="comparison-anchor-labels"
            role="group"
            aria-label="Точка призначення"
          >
            {anchors.map((anchor, index) => (
              <button
                key={anchor.id}
                type="button"
                aria-pressed={anchorIndex === index}
                onClick={() => onAnchorChange(index)}
              >
                <span className="comparison-anchor-dot" aria-hidden="true" />
                <span>{anchor.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
