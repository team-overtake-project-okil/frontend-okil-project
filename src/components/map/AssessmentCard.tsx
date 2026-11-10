import { ChevronDownIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { ApiError } from "../../lib/fetcher";
import type { CategoryRating } from "../../lib/hexagonAssessment";

interface AssessmentCardProps {
  selectedHexId: string | null;
  assessmentData:
    { overall_rating: number; categories: CategoryRating[] } | undefined;
  showAssessmentSkeleton: boolean;
  isAssessmentError: boolean;
  assessmentError: unknown;
  chatOpen: boolean;
  assessmentExpanded: boolean;
  setChatOpen: (open: boolean) => void;
  setSelectedHexId: (id: string | null) => void;
  setAssessmentExpanded: (open: boolean) => void;
  onAddressChange: (address: null) => void;
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
  assessmentExpanded,
  setChatOpen,
  setSelectedHexId,
  setAssessmentExpanded,
  onAddressChange,
  refetchAssessment,
  setChatHost,
}: AssessmentCardProps) {
  return (
    <aside
      className={chatOpen ? "assessment-card with-chat" : "assessment-card"}
      aria-label="Помічник Окіл"
    >
      <header className="assistant-panel-heading">
        <SparklesIcon aria-hidden="true" />
        <h2>Помічник Окіл</h2>
        <button
          type="button"
          aria-label="Закрити чат"
          onClick={() => {
            setChatOpen(false);
            setSelectedHexId(null);
            onAddressChange(null);
          }}
        >
          ✕
        </button>
      </header>
      <div className="assessment-summary" hidden={!selectedHexId}>
        {selectedHexId ? (
          <>
            <div className="panel-heading">
              <span className="selected-area-label">Вибрана ділянка</span>
              <button
                aria-label="Прибрати вибрану ділянку"
                onClick={() => {
                  setSelectedHexId(null);
                  onAddressChange(null);
                }}
              >
                ✕
              </button>
            </div>
            {showAssessmentSkeleton ? (
              <div className="text-block" role="status">
                Розраховуємо оцінку…
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
                  Оцінка комфорту
                  <br />з 100
                </div>
              </div>
            )}
            <button
              type="button"
              className="assessment-details-toggle"
              aria-label="Оцінки категорій"
              aria-expanded={assessmentExpanded && chatOpen}
              onClick={() => {
                setAssessmentExpanded(!assessmentExpanded || !chatOpen);
                setChatOpen(true);
              }}
            >
              <span>Оцінки категорій</span>
              <ChevronDownIcon aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      <div
        ref={setChatHost}
        className="assessment-chat-host"
        hidden={!chatOpen}
      />
    </aside>
  );
}
