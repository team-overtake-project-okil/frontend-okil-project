import { useId } from "react";
import { useQueries } from "@tanstack/react-query";
import type { AssessmentWeights } from "../lib/assessmentWeights";
import {
  categoryLabels,
  comparisonLabels,
  hexagonAssessmentOptions,
} from "../lib/hexagonAssessment";
import "./HexagonComparison.css";

interface HexagonComparisonProps {
  ids: readonly string[];
  weights: AssessmentWeights | null;
  open: boolean;
  onToggle: () => void;
  onRemove: (id: string) => void;
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
    <aside className="hex-comparison" aria-label="Порівняння ділянок">
      <div className="hex-comparison-controls">
        <strong>Порівняння · {ids.length}/3</strong>
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
      <ul className="hex-comparison-selection" aria-label="Вибрані ділянки">
        {ids.map((id, index) => (
          <li key={id}>
            <button
              type="button"
              aria-label={`Прибрати ділянку ${comparisonLabels[index]}`}
              onClick={() => onRemove(id)}
            >
              {comparisonLabels[index]} ×
            </button>
          </li>
        ))}
      </ul>
      {ids.length === 1 && <p>Додайте ще одну ділянку на карті.</p>}
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
                    Ділянка {comparisonLabels[index]}
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
                      column.data.overall_rating
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
                        {!column.isSuccess
                          ? "—"
                          : !item
                            ? "Немає даних"
                            : item.enabled
                              ? item.score
                              : "Вимкнено"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </aside>
  );
}
