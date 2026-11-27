import { ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useId, type CSSProperties } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  categoryLabels,
  comparisonColors,
  comparisonLabels,
  type HexagonAssessment,
} from "../../lib/hexagonAssessment";
import { comfortColor } from "../../lib/palette";
import CompareHexagonsIcon from "../../icons/compare-hexagons";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import "./HexagonComparison.scss";

interface HexagonComparisonProps {
  onExit: () => void;
  onClear: () => void;
  ids: readonly string[];
  comparison: UseQueryResult<HexagonAssessment[]>;
  showRouteControls: boolean;
  routeOriginId: string | null;
  onRouteOriginChange: (id: string) => void;
  routePending: boolean;
  routeError?: string;
  open: boolean;
  onToggle: () => void;
  onRemove: (id: string) => void;
}

function ComparisonScoreSkeleton() {
  return (
    <div className="comparison-score comparison-score-skeleton" aria-hidden="true">
      <Skeleton className="assessment-placeholder assessment-placeholder-value" />
      <Skeleton className="assessment-placeholder assessment-placeholder-bar" />
    </div>
  );
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
  onExit,
  onClear,
  ids,
  comparison,
  showRouteControls,
  routeOriginId,
  onRouteOriginChange,
  routePending,
  routeError,
  open,
  onToggle,
  onRemove,
}: HexagonComparisonProps) {
  const tableId = useId();
  const columns = ids.map((id) =>
    comparison.data?.find((item) => item.h3_id === id),
  );

  const loading = comparison.isPending || (comparison.isError && comparison.isFetching);
  const selectedCount = (
    <span className="anchor-count" aria-label={`${ids.length} із ${comparisonLabels.length} ділянок`}>
      {ids.length}/{comparisonLabels.length}
    </span>
  );
  const selectionTag = (id: string, index: number) => (
    <button
      type="button"
      className="comparison-selection-tag"
      style={{ "--hex-color": comparisonColors[index] } as CSSProperties}
      aria-label={`Прибрати ділянку ${comparisonLabels[index]}`}
      title={`Прибрати ділянку ${comparisonLabels[index]}`}
      onClick={() => onRemove(id)}
    >
      <span className="comparison-selection-hexagon" aria-hidden="true" />
      <span>{comparisonLabels[index]}</span>
      <XMarkIcon className="comparison-selection-remove" aria-hidden="true" />
    </button>
  );

  return (
    <div
      className="hex-comparison"
      data-open={open}
      style={{ "--comparison-count": ids.length } as CSSProperties}
      aria-label="Порівняння ділянок"
    >
      <header className="assistant-panel-heading">
        <CompareHexagonsIcon aria-hidden="true" />
        <h2>Порівняти гексагони</h2>
        <button type="button" aria-label="Завершити порівняння" onClick={onExit}>
          ✕
        </button>
      </header>
      <p className="comparison-hint">
        {open
          ? "Оцінки комфорту вибраних гексагонів за категоріями."
          : "Додайте 2–3 гексагони з мапи, щоб порівняти їхні оцінки й маршрути."}
      </p>
      {!open && ids.length > 0 && (
        <div className="hex-comparison-selection">
          {ids.map((id, index) => (
            <div key={id}>{selectionTag(id, index)}</div>
          ))}
          {selectedCount}
        </div>
      )}
      <div
        id={tableId}
        className="hex-comparison-scroll"
        hidden={!open}
        tabIndex={open ? 0 : undefined}
        role="region"
        aria-label="Таблиця оцінок ділянок"
        aria-busy={open && loading}
      >
        {open && (
          <table>
            <colgroup>
              <col className="comparison-label-column" />
              <col span={ids.length} className="comparison-score-column" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Категорія</th>
                {ids.map((id, index) => (
                  <th scope="col" key={id}>
                    {selectionTag(id, index)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Загальна оцінка</th>
                {columns.map((column, index) => (
                  <td key={ids[index]}>
                    {loading ? (
                      <ComparisonScoreSkeleton />
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
              {categoryLabels.map(([category, label]) => {
                const items = columns.map((column) =>
                  column?.categories.find((rating) => rating.category === category),
                );

                return (
                  <tr key={category}>
                    <th scope="row">{label}</th>
                    {items.map((item, index) => (
                      <td key={ids[index]}>
                        {loading ? (
                          <ComparisonScoreSkeleton />
                        ) : !comparison.isSuccess ? (
                          "—"
                        ) : !item ? (
                          "Немає даних"
                        ) : item.enabled ? (
                          <ComparisonScore value={item.score} />
                        ) : (
                          <div className="comparison-score comparison-disabled">Вимкнено</div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            {showRouteControls && (
              <tfoot>
                <tr>
                  <th scope="row">
                    <div className="comparison-route-heading">
                      Маршрути
                      {routeError && (
                        <TooltipProvider delay={200}>
                          <Tooltip>
                            <TooltipTrigger
                              type="button"
                              className="comparison-route-error"
                              aria-label={routeError}
                            >
                              <ExclamationCircleIcon aria-hidden="true" />
                            </TooltipTrigger>
                            <TooltipContent>{routeError}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </th>
                  {ids.map((id, index) => (
                    <td key={id}>
                      <button
                        type="button"
                        className="comparison-route-origin"
                        aria-label={`Маршрути з гексагону ${comparisonLabels[index]}`}
                        aria-pressed={routeOriginId === id}
                        disabled={loading || routePending}
                        aria-busy={routePending && routeOriginId === id}
                        onClick={() => onRouteOriginChange(id)}
                      >
                        <span
                          className="comparison-selection-hexagon"
                          style={{ "--hex-color": comparisonColors[index] } as CSSProperties}
                          aria-hidden="true"
                        />
                        {comparisonLabels[index]}
                      </button>
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
      <div className="hex-comparison-controls">
        {ids.length > 0 && (
          <button type="button" className="secondary-button comparison-clear" onClick={onClear}>
            Очистити
          </button>
        )}
        <button
          type="button"
          className="comparison-run"
          disabled={ids.length < 2}
          aria-expanded={open}
          aria-controls={tableId}
          onClick={onToggle}
        >
          {open ? "Згорнути" : "Порівняти"}
        </button>
      </div>
    </div>
  );
}
