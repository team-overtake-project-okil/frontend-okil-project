import type { CSSProperties } from "react";
import { comfortColor } from "../lib/palette";
import BusIcon from "../icons/bus";
import Expand from "../icons/arrows-pointing-out";
import Minimize2 from "../icons/arrows-pointing-in";
import SlidersHorizontal from "../icons/adjustments-horizontal";
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
  description?: string | null;
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
  ["food", "Їжа"],
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
  const [assessmentExpanded, setAssessmentExpanded] = useState(false);
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
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const returnFocus = expandRef.current;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    let node: HTMLElement | null = sectionRef.current;
    while (node?.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node && sibling instanceof HTMLElement) {
          siblings.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      node = node.parentElement;
    }
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        setPanelOpen(false);
      }
      if (event.key === "Tab") {
        const elements = [
          ...sectionRef.current!.querySelectorAll<HTMLElement>(
            'button,input,summary,a[href],[tabindex="0"]',
          ),
        ].filter(
          (e) => e.getClientRects().length && !e.hasAttribute("disabled"),
        );
        const first = elements[0],
          last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      document.documentElement.style.overflow = previous;
      siblings.forEach(({ element, inert }) => (element.inert = inert));
      window.removeEventListener("keydown", key);
      returnFocus?.focus();
    };
  }, [expanded]);
  const [routesEnabled, setRoutesEnabled] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!panelOpen) return;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !expanded) {
        setPanelOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [panelOpen, expanded]);
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
    <section
      ref={sectionRef}
      id="map"
      className={`map-section ${expanded ? "map-expanded" : ""} ${panelOpen ? "panel-open" : ""}`}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? true : undefined}
      aria-labelledby="map-heading"
    >
      <div className="map-heading">
        <div>
          <div className="text-block eyebrow">ДОСЛІДЖУЙТЕ МІСТО</div>
          <div
            role="heading"
            aria-level={2}
            className="heading-2"
            id="map-heading"
          >
            Знайдіть місце за своїми пріоритетами.
          </div>
        </div>
        <div className="text-block">
          Досліджуйте окіл: від щоденних потреб до транспорту й відпочинку.
          Натисніть на ділянку, щоб побачити оцінку
        </div>
      </div>
      <div className="map-workspace">
        <div className="map-toolbar">
          {!expanded && (
            <div className="inline-map-info">
              <strong>Індекс комфорту, Львів</strong>
              <div className="inline-text">
                Оберіть комірку, щоб побачити деталі
              </div>
            </div>
          )}
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
            <SlidersHorizontal
              width={16}
              height={16}
              style={{ width: 16, height: 16 }}
              aria-hidden="true"
            />{" "}
            Пріоритети{" "}
            {dirty && (
              <div className="inline-text" aria-label="Є незастосовані зміни">
                •
              </div>
            )}
          </button>
          <label className="route-toggle">
            <input
              type="checkbox"
              checked={routesEnabled}
              onChange={(e) => setRoutesEnabled(e.target.checked)}
            />{" "}
            <BusIcon className="size-4" aria-hidden="true" /> Маршрути
            транспорту
          </label>
          <button
            ref={expandRef}
            className={`expand-map-button ${expanded ? "map-exit" : ""}`}
            aria-label={
              expanded ? "Повернутися до сторінки" : "Розгорнути карту"
            }
            title={expanded ? "Повернутися до сторінки" : "Розгорнути карту"}
            aria-expanded={expanded}
            onClick={() => {
              setExpanded(!expanded);
              setPanelOpen(!expanded);
            }}
          >
            {expanded ? (
              <Minimize2
                width={17}
                height={17}
                style={{ width: 17, height: 17 }}
              />
            ) : (
              <Expand
                width={17}
                height={17}
                style={{ width: 17, height: 17 }}
              />
            )}{" "}
            {!expanded && "Розгорнути карту"}
          </button>
        </div>
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
              <div className="text-block">
                Не вдалося завантажити оцінки. Карта доступна без них.
              </div>
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
                <div className="text-block eyebrow">ПЕРСОНАЛЬНА ОЦІНКА</div>
                <div role="heading" aria-level={3} className="heading-3">
                  Що для вас важливо
                </div>
              </div>
              <button aria-label="Закрити налаштування" onClick={closePanel}>
                ✕
              </button>
            </div>
            <div className="text-block panel-intro">
              Змініть важливість категорій. Карта оновиться після застосування.
            </div>
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
                      "Заклади харчування",
                      "Завжди враховується",
                    ][i]
                  }
                />
              ))}
            </div>
            <div className="panel-actions">
              <div className="text-block" role="status">
                {dirty ? "Є незастосовані зміни" : "Пріоритети застосовано"}
              </div>
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
              <div className="text-block eyebrow">ВИБРАНА ДІЛЯНКА · ЛЬВІВ</div>
              <button
                aria-label="Скасувати вибір"
                onClick={() => onAddressChange(null)}
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
                <div className="text-block">Оцінка недоступна.</div>
                <button onClick={() => void refetchAssessment()}>
                  Спробувати знову
                </button>
              </div>
            ) : (
              <>
                <div className="score">
                  <strong>{assessmentData?.overall_rating ?? "—"}</strong>
                  <div className="inline-text">
                    Оцінка комфорту
                    <br />з 100
                  </div>
                </div>
                {expanded ? (
                  <details
                    open={assessmentExpanded}
                    onToggle={(event) => {
                      if (event.target === event.currentTarget)
                        setAssessmentExpanded(event.currentTarget.open);
                    }}
                  >
                    <summary>Докладніше про оцінку</summary>
                    <div className="assessment-details">
                      {categoryLabels.map(([key, title]) => {
                        const item = assessmentData?.categories.find(
                          (c) => c.category === key,
                        );
                        return (
                          <details className="category-score" key={key}>
                            <summary aria-label={`Пояснення: ${title}`}>
                              <div>
                                <div className="inline-text">{title}</div>
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
                                style={
                                  {
                                    "--score-color": comfortColor(
                                      item?.score ?? 0,
                                    ),
                                  } as CSSProperties
                                }
                              />
                            </summary>
                            <div className="text-block category-description">
                              {item?.description ||
                                "Пояснення оцінки ще не додано."}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </details>
                ) : (
                  <button
                    className="inline-assessment-details"
                    onClick={() => {
                      setAssessmentExpanded(true);
                      setExpanded(true);
                      setPanelOpen(false);
                    }}
                  >
                    Докладніше про оцінку{" "}
                    <Expand
                      width={14}
                      height={14}
                      style={{ width: 14, height: 14 }}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </>
            )}
          </aside>
        )}
        <div className="map-legend">
          <div className="inline-text">Оцінка комфорту</div>
          <div className="legend-ramp" />
          <div>
            <div className="inline-text">0</div>
            <div className="inline-text">50</div>
            <div className="inline-text">100</div>
          </div>
        </div>
        {isFetching && !showSkeleton && (
          <div className="text-block map-updating" role="status">
            Оновлюємо оцінки…
          </div>
        )}
      </div>
    </section>
  );
};
