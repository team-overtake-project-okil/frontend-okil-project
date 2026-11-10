import { useId, type CSSProperties } from "react";
import { useQueries } from "@tanstack/react-query";
import type { AssessmentWeights } from "../../lib/assessmentWeights";
import {
  categoryLabels,
  comparisonColors,
  comparisonLabels,
  hexagonAssessmentOptions,
} from "../../lib/hexagonAssessment";
import { comfortColor } from "../../lib/palette";
import "./HexagonComparison.css";

interface HexagonComparisonProps {
  ids: readonly string[];
  weights: AssessmentWeights | null;
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
  ids,
  weights,
  open,
  onToggle,
  onRemove,
}: HexagonComparisonProps) {
  const tableId = useId();
  const columns = useQueries({
    queries: open ? ids.map((id) => hexagonAssessmentOptions(id, weights)) : [],
  });

  return (
    <div
      className="hex-comparison"
      data-open={open}
      aria-label="Порівняння ділянок"
    >
      <div className="hex-comparison-controls">
        <div className="inline-text">Порівняння · {ids.length}/3</div>
        <button
          type="button"
          disabled={ids.length < 2}
          aria-expanded={open}
          aria-controls={tableId}
          onClick={onToggle}
        >
          {open ? "Згорнути" : "Порівняти"}
        </button>
      </div>
      <div className="hex-comparison-selection">
        {ids.map((id, index) => (
          <div key={id}>
            <button
              type="button"
              className="comparison-swatch"
              style={
                { "--hex-color": comparisonColors[index] } as CSSProperties
              }
              aria-label={`Прибрати ділянку ${comparisonLabels[index]}`}
              onClick={() => onRemove(id)}
            >
              {comparisonLabels[index]} ×
            </button>
          </div>
        ))}
      </div>
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
                    <span
                      className="comparison-swatch"
                      style={
                        {
                          "--hex-color": comparisonColors[index],
                        } as CSSProperties
                      }
                    >
                      {comparisonLabels[index]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Загальна оцінка</th>
                {columns.map((column, index) => (
                  <td key={ids[index]}>
                    {column.isPending ||
                    (column.isError && column.isFetching) ? (
                      <span role="status">Завантаження…</span>
                    ) : column.isError ? (
                      <>
                        <span role="alert">Оцінка недоступна.</span>
                        <button
                          type="button"
                          onClick={() => void column.refetch()}
                        >
                          Повторити
                        </button>
                      </>
                    ) : (
                      <ComparisonScore value={column.data.overall_rating} />
                    )}
                  </td>
                ))}
              </tr>
              {categoryLabels.map(([category, label]) => (
                <tr key={category}>
                  <th scope="row">{label}</th>
                  {columns.map((column, index) => {
                    const item = column.data?.categories.find(
                      (rating) => rating.category === category,
                    );
                    return (
                      <td key={ids[index]}>
                        {!column.isSuccess ? (
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
    </div>
  );
}
