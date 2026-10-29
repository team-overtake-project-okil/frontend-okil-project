import {
  togglerIds,
  lockedTogglerIds,
  defaultTogglers,
  buildAssessmentWeights,
  sameWeights,
  weightsSearch,
  type TogglerStates,
  type TogglerState,
  type AssessmentWeights,
} from "../lib/assessmentWeights";
import { TogglerCard } from "./TogglerCard";
import { MapboxMap } from "./MapboxMap";
import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetcher } from "../lib/fetcher";
import { AddressSearch } from "./AddressSearch";
import type { AddressSuggestion } from "../services/geocoding";

export type Hexagon = {
  h3_id: string;
  overall_rating: number;
};

type CategoryRating = {
  category: string;
  score: number;
  enabled: boolean;
  weight: number;
  adjusted_score: number | null;
};

type HexagonAssessment = {
  h3_id: string;
  overall_rating: number;
  categories: CategoryRating[];
};

const categoryLabels = [
  ["mobility", "Мобільність"],
  ["daily", "Щоденні потреби"],
  ["health", "Здоров'я"],
  ["study", "Освіта"],
  ["enjoyment", "Дозвілля"],
  ["sport", "Спорт"],
  ["security", "Безпека"],
] as const;

interface MapProps {
  clearSelectionKey: number;
  searchedLocation: AddressSuggestion | null;
  onAddressChange: (address: AddressSuggestion | null) => void;
}

export const Map = ({
  searchedLocation,
  onAddressChange,
  clearSelectionKey,
}: MapProps) => {
  const [togglers, setTogglers] = useState(defaultTogglers);
  // null means the user has not applied weights yet, so the API defaults stay.
  const [appliedTogglers, setAppliedTogglers] = useState<TogglerStates | null>(
    null,
  );
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
  const assessmentWeights = useMemo(
    () =>
      appliedTogglers === null ? null : buildAssessmentWeights(appliedTogglers),
    [appliedTogglers],
  );
  const {
    data: hexagonsData = [],
    isLoading: isHexagonsLoading,
    isError: isHexagonsError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["hexagons", assessmentWeights],
    placeholderData: keepPreviousData,
    queryFn: ({ queryKey }) => {
      const weights = queryKey[1] as AssessmentWeights | null;
      return fetcher(`/hexagons${weightsSearch(weights)}`) as Promise<
        Hexagon[]
      >;
    },
  });

  const showSkeleton = isHexagonsLoading || (isHexagonsError && isFetching);
  const {
    data: assessmentData,
    isLoading: isAssessmentLoading,
    isError: isAssessmentError,
    isFetching: isAssessmentFetching,
    refetch: refetchAssessment,
  } = useQuery({
    queryKey: ["hexagon-assessment", selectedHexId, assessmentWeights],
    enabled: selectedHexId !== null,
    queryFn: ({ queryKey }) => {
      const hexId = queryKey[1] as string | null;
      const weights = queryKey[2] as AssessmentWeights | null;
      if (hexId === null) {
        throw new Error(
          "A hexagon must be selected to request its assessment.",
        );
      }

      return fetcher(
        `/hexagons/${encodeURIComponent(hexId)}${weightsSearch(weights)}`,
      ) as Promise<HexagonAssessment>;
    },
  });
  const showAssessmentSkeleton =
    isAssessmentLoading || (isAssessmentError && isAssessmentFetching);

  const [panelOpen, setPanelOpen] = useState(false);
  const [routesEnabled, setRoutesEnabled] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!panelOpen) return;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanelOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [panelOpen]);
  const dirty = !sameWeights(
    buildAssessmentWeights(togglers),
    assessmentWeights ?? buildAssessmentWeights(defaultTogglers()),
  );
  const updateToggler = (id: string, patch: Partial<TogglerState>) =>
    setTogglers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  // state + handlers for one card
  const togglerProps = (id: string) => ({
    id,
    locked: lockedTogglerIds.has(id),
    value: togglers[id].value,
    on: togglers[id].on,
    onValueChange: (value: number) => updateToggler(id, { value }),
    onOnChange: (on: boolean) => updateToggler(id, { on }),
  });

  const handleApply = () => {
    const nextAppliedTogglers = { ...togglers };
    const nextWeights = buildAssessmentWeights(nextAppliedTogglers);
    const weightsUnchanged = sameWeights(assessmentWeights, nextWeights);

    setAppliedTogglers(nextAppliedTogglers);
    if (weightsUnchanged) {
      void refetch();
      if (selectedHexId) void refetchAssessment();
    }
  };

  const handleReset = () => setTogglers(defaultTogglers());
  const closePanel = () => {
    setPanelOpen(false);
    toggleRef.current?.focus();
  };
  return (
    <section id="map" className="map-section" aria-labelledby="map-heading">
      <div className="map-heading">
        <div>
          <p className="eyebrow">ДОСЛІДЖУЙТЕ МІСТО</p>
          <h2 id="map-heading">Ваш Львів. Ваші пріоритети.</h2>
        </div>
        <p>Знайдіть адресу або виберіть ділянку на карті.</p>
      </div>
      <div className="map-toolbar">
        <AddressSearch
          selectedAddress={searchedLocation}
          onLocationChange={onAddressChange}
        />
        <button
          ref={toggleRef}
          className="secondary-button"
          aria-expanded={panelOpen}
          aria-controls="weights-panel"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          Налаштувати пріоритети{" "}
          {dirty && <span aria-label="Є незастосовані зміни">•</span>}
        </button>
        <label className="route-toggle">
          <input
            type="checkbox"
            checked={routesEnabled}
            onChange={(e) => setRoutesEnabled(e.target.checked)}
          />{" "}
          Маршрути транспорту
        </label>
      </div>
      <div className="map-workspace">
        <div className="map-canvas">
          <MapboxMap
            hexagons={hexagonsData}
            clearSelectionKey={clearSelectionKey}
            searchedLocation={searchedLocation}
            onHexSelect={setSelectedHexId}
            routesEnabled={routesEnabled}
          />
          {showSkeleton && (
            <div className="map-data-status" role="status">
              Завантажуємо оцінки…
            </div>
          )}
          {isHexagonsError && !isFetching && (
            <div className="map-data-status" role="alert">
              <p>Не вдалося завантажити оцінки. Карта доступна без них.</p>
              <button
                className="secondary-button"
                onClick={() => void refetch()}
              >
                Спробувати знову
              </button>
            </div>
          )}
        </div>
        {panelOpen && (
          <aside
            ref={panelRef}
            id="weights-panel"
            className="weights-panel"
            aria-label="Пріоритети"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">ПЕРСОНАЛЬНА ОЦІНКА</p>
                <h3>Що для вас важливо</h3>
              </div>
              <button aria-label="Закрити налаштування" onClick={closePanel}>
                ✕
              </button>
            </div>
            <p className="panel-intro">
              Змініть важливість категорій. Карта оновиться після застосування.
            </p>
            <div className="weights-list">
              {categoryLabels.map(([, title], i) => (
                <TogglerCard
                  key={togglerIds[i]}
                  {...togglerProps(togglerIds[i])}
                  title={title}
                  description={
                    [
                      "Зупинки та транспорт",
                      "Повсякденні послуги",
                      "Медична інфраструктура",
                      "Навчальні заклади",
                      "Місця для відпочинку",
                      "Спортивна інфраструктура",
                      "Завжди враховується",
                    ][i]
                  }
                />
              ))}
            </div>
            <div className="panel-actions">
              <p role="status">
                {dirty ? "Є незастосовані зміни" : "Пріоритети застосовано"}
              </p>
              <div>
                <button className="secondary-button" onClick={handleReset}>
                  Скинути
                </button>
                <button className="primary-button" onClick={handleApply}>
                  Застосувати
                </button>
              </div>
            </div>
          </aside>
        )}
        {selectedHexId && (
          <aside className="assessment-card" aria-label="Оцінка ділянки">
            <div className="panel-heading">
              <p className="eyebrow">ВИБРАНА ДІЛЯНКА · ЛЬВІВ</p>
              <button
                aria-label="Скасувати вибір"
                onClick={() => onAddressChange(null)}
              >
                ✕
              </button>
            </div>
            {showAssessmentSkeleton ? (
              <p role="status">Розраховуємо оцінку…</p>
            ) : isAssessmentError ? (
              <div role="alert">
                <p>Оцінка недоступна.</p>
                <button onClick={() => void refetchAssessment()}>
                  Спробувати знову
                </button>
              </div>
            ) : (
              <>
                <div className="score">
                  <strong>{assessmentData?.overall_rating ?? "—"}</strong>
                  <span>
                    Оцінка комфорту
                    <br />з 100
                  </span>
                </div>
                <details key={selectedHexId}>
                  <summary>Докладніше про оцінку</summary>
                  <div className="assessment-details">
                    {categoryLabels.map(([key, title]) => {
                      const item = assessmentData?.categories.find(
                        (c) => c.category === key,
                      );
                      return (
                        <div className="category-score" key={key}>
                          <div>
                            <span>{title}</span>
                            <strong>
                              {!item
                                ? "Немає даних"
                                : !item.enabled
                                  ? "Вимкнено"
                                  : item.score}
                            </strong>
                          </div>
                          <meter
                            min="0"
                            max="100"
                            value={item?.enabled ? item.score : 0}
                            aria-label={title}
                          />
                          {item?.enabled && (
                            <small>
                              Частка в оцінці: {Math.round(item.weight * 100)}%
                            </small>
                          )}
                        </div>
                      );
                    })}
                    <p className="data-note">
                      Нуль — значення, повернене сервісом. Сервіс також
                      прирівнює відсутні дані до нуля.
                    </p>
                    <small>H3: {selectedHexId}</small>
                  </div>
                </details>
              </>
            )}
          </aside>
        )}
        <div className="map-legend">
          <span>Оцінка комфорту</span>
          <div className="legend-ramp" />
          <div>
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
          <small>Сірий — немає оцінки</small>
        </div>
        {isFetching && !showSkeleton && (
          <p className="map-updating" role="status">
            Оновлюємо оцінки…
          </p>
        )}
      </div>
    </section>
  );
};
