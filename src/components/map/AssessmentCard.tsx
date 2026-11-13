import type { ReactNode } from "react";
import { ChatBubbleLeftRightIcon, CheckIcon, ChevronDownIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { ApiError } from "../../lib/fetcher";
import { categoryLabels, type CategoryRating } from "../../lib/hexagonAssessment";
import { Skeleton } from "../ui/skeleton";

interface AssessmentCardProps {
  selectedHexId: string | null;
  assessmentData:
    { overall_rating: number; categories: CategoryRating[] } | undefined;
  showAssessmentSkeleton: boolean;
  isAssessmentError: boolean;
  assessmentError: unknown;
  chatOpen: boolean;
  isHexAttached: boolean;
  details: ReactNode;
  assessmentExpanded: boolean;
  setChatOpen: (open: boolean) => void;
  setAssessmentExpanded: (open: boolean) => void;
  refetchAssessment: () => unknown;
  setChatHost: (host: HTMLDivElement | null) => void;
}
export function AssessmentCard({
  selectedHexId,
  assessmentData,
  showAssessmentSkeleton,
  isAssessmentError,
  assessmentError,
  chatOpen,
  isHexAttached,
  details,
  assessmentExpanded,
  setChatOpen,
  setAssessmentExpanded,
  refetchAssessment,
  setChatHost,
}: AssessmentCardProps)
{
  const askButton = (
    <button
      type="button"
      className={`assessment-ask assessment-ask-inline${isHexAttached ? " is-attached" : ""}`}
      aria-label={isHexAttached ? "Гексагон додано" : "Запитати за цей гексагон"}
      disabled={isHexAttached || showAssessmentSkeleton || isAssessmentError || !assessmentData}
      onClick={() => setChatOpen(true)}
    >
      {isHexAttached ? <CheckIcon aria-hidden="true" /> : <ChatBubbleLeftRightIcon aria-hidden="true" />}
      {isHexAttached ? "Додано" : "Запитати"}
    </button>
  );
  return (
    <aside
      className={chatOpen ? "assessment-card with-chat" : "assessment-card"}
      aria-label={chatOpen ? "Помічник Окіл" : "Оцінка гексагону"}
    >
      <header className="assistant-panel-heading">
        <SparklesIcon aria-hidden="true" />
        <h2>{chatOpen ? "Помічник Окіл" : "Оцінка гексагону"}</h2>
        <button
          type="button"
          aria-label={chatOpen ? "Закрити чат" : "Закрити оцінки"}
          onClick={() => setChatOpen(false)}
        >
          ✕
        </button>
      </header>
      <div className="assessment-summary" hidden={!selectedHexId}>
        {selectedHexId ? (
          <>
            {showAssessmentSkeleton ? (
              <div className="assessment-score-skeleton" role="status" aria-label="Завантаження оцінки">
                <Skeleton className="assessment-placeholder assessment-placeholder-number" aria-hidden="true" />
                <div className="assessment-placeholder-caption" aria-hidden="true">
                  <Skeleton className="assessment-placeholder" />
                  <Skeleton className="assessment-placeholder" />
                  <Skeleton className="assessment-placeholder" />
                </div>
              </div>
            ) : isAssessmentError ? (
              <div role="alert">
                <div className="text-block">
                  {assessmentError instanceof ApiError &&
                  assessmentError.status === 404
                    ? "Для цієї ділянки немає даних у базі. Оберіть іншу ділянку."
                    : "Оцінка недоступна."}
                </div>
                <button onClick={() => void refetchAssessment()}>
                  Спробувати знову
                </button>
              </div>
            ) : (
              <div className="score">
                <div className="score-value">
                  {assessmentData?.overall_rating ?? "—"}
                </div>
                <div className="inline-text">
                  Індекс комфорту
                  <br />зі 100
                </div>
              </div>
            )}
            {askButton}
          </>
        ) : null}
      </div>
      {!chatOpen && selectedHexId && (
        <div id="assessment-category-content" className="assessment-content">
          {showAssessmentSkeleton && assessmentExpanded ? (
            <div className="assessment-categories-skeleton" role="status" aria-label="Завантаження категорій">
              {categoryLabels.map(([key]) => (
                <div key={key} className="assessment-category-skeleton" aria-hidden="true">
                  <div className="assessment-category-skeleton-heading">
                    <Skeleton className="assessment-placeholder assessment-placeholder-title" />
                    <Skeleton className="assessment-placeholder assessment-placeholder-value" />
                  </div>
                  <Skeleton className="assessment-placeholder assessment-placeholder-bar" />
                </div>
              ))}
            </div>
          ) : details}
        </div>
      )}
      {!chatOpen && selectedHexId && (
        <button
          type="button"
          className="assessment-details-toggle"
          aria-label="Категорії"
          aria-controls="assessment-category-content"
          aria-expanded={assessmentExpanded}
          onClick={() => setAssessmentExpanded(!assessmentExpanded)}
        >
          <span>{assessmentExpanded ? "Згорнути категорії" : "Показати категорії"}</span>
          <ChevronDownIcon aria-hidden="true" />
        </button>
      )}
      <div
        ref={setChatHost}
        className="assessment-chat-host"
        hidden={!chatOpen}
      />
    </aside>
  );
}
