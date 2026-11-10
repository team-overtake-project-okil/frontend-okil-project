// Картка вибраної ділянки: загальна оцінка, порівняння і розбивка по категоріях
import Expand from "../../icons/arrows-pointing-out";
import XMark from "../../icons/x-mark";
import { ApiError } from "../../lib/fetcher";
import {
  categoryLabels,
  type CategoryRating,
} from "../../lib/hexagonAssessment";
import { CategoryScore } from "../CategoryScore";

interface AssessmentData {
  overall_rating: number;
  categories: CategoryRating[];
}

interface OpenCategory {
  hexId: string;
  category: string;
}

interface AssessmentCardProps {
  hexId: string;
  data: AssessmentData | undefined;
  showSkeleton: boolean;
  isError: boolean;
  error: unknown;
  expanded: boolean;
  detailsOpen: boolean;
  openCategory: OpenCategory | null;
  canAdd: boolean;
  added: boolean;
  atLimit: boolean;
  onClear: () => void;
  onRetry: () => void;
  onAdd: () => void;
  onToggleDetails: () => void;
  onExpandForDetails: () => void;
  onToggleCategory: (category: string) => void;
}

export function AssessmentCard({
  hexId,
  data,
  showSkeleton,
  isError,
  error,
  expanded,
  detailsOpen,
  openCategory,
  canAdd,
  added,
  atLimit,
  onClear,
  onRetry,
  onAdd,
  onToggleDetails,
  onExpandForDetails,
  onToggleCategory,
}: AssessmentCardProps) {
  return (
    <aside className="assessment-card" aria-label="Оцінка ділянки">
      <div className="panel-heading">
        <div className="text-block eyebrow">ВИБРАНА ДІЛЯНКА · ЛЬВІВ</div>
        <button type="button" aria-label="Скасувати вибір" onClick={onClear}>
          <XMark aria-hidden="true" />
        </button>
      </div>
      {showSkeleton ? (
        <div className="text-block" role="status">
          Розраховуємо оцінку…
        </div>
      ) : isError ? (
        <div role="alert">
          <div className="text-block">
            {error instanceof ApiError && error.status === 404
              ? "Для цієї ділянки немає даних у базі. Оберіть іншу ділянку."
              : "Оцінка недоступна."}
          </div>
          <button onClick={onRetry}>Спробувати знову</button>
        </div>
      ) : (
        <div className="score">
          <div className="score-value">{data?.overall_rating ?? "—"}</div>
          <div className="inline-text">
            Оцінка комфорту
            <br />з 100
          </div>
        </div>
      )}
      <button
        type="button"
        className="comparison-add"
        disabled={!canAdd}
        onClick={() => {
          if (canAdd) onAdd();
        }}
      >
        {added
          ? "Ділянку додано"
          : atLimit
            ? "Вибрано максимум ділянок"
            : "Додати до порівняння"}
      </button>
      {!showSkeleton &&
        !isError &&
        (expanded ? (
          <>
            <button
              type="button"
              className="assessment-more"
              aria-expanded={detailsOpen}
              onClick={onToggleDetails}
            >
              Докладніше про оцінку
            </button>
            {detailsOpen && (
              <div className="assessment-details">
                <div className="text-block category-description">
                  Відстані по прямій від центру гексагону.
                </div>
                {categoryLabels.map(([key, title]) => {
                  const item = data?.categories.find(
                    (category) => category.category === key,
                  );
                  return (
                    <CategoryScore
                      key={key}
                      title={title}
                      item={item}
                      open={
                        openCategory?.hexId === hexId &&
                        openCategory.category === key
                      }
                      onToggle={() => onToggleCategory(key)}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <button
            className="inline-assessment-details"
            onClick={onExpandForDetails}
          >
            Докладніше про оцінку <Expand aria-hidden="true" />
          </button>
        ))}
    </aside>
  );
}
