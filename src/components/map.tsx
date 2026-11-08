import {
  QueueListIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { Chat } from "./Chat";
import type { HexChatContext } from "./Chat";
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
  type TogglerStates,
  type TogglerState,
  type AssessmentWeights,
} from "../lib/assessmentWeights";
import { TogglerCard } from "./TogglerCard";
import { motion, MotionConfig } from "motion/react";
import { HexagonComparison } from "./HexagonComparison";
import {
  categoryLabels,
  comparisonLabels,
  hexagonAssessmentOptions,
} from "../lib/hexagonAssessment";
import { MapboxMap } from "./MapboxMap";
import { StopRoutesFace } from "./StopRoutesFace";
import type { HexStopProperties } from "../lib/useStopsByHex";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const faceEase = [0.22, 0.82, 0.24, 1] as const;
const faceTransition = {
  x: { duration: 0.5, ease: faceEase },
  scale: { duration: 0.5, ease: faceEase },
  opacity: { duration: 0.38, ease: "easeOut" },
  filter: { duration: 0.38, ease: "easeOut" },
} as const;
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiError } from "../lib/fetcher";
import { getHexagonRatings } from "../lib/hexagonAssessment";
import { CategoryScore } from "./CategoryScore";
import { AddressSearch } from "./AddressSearch";
import type { AddressSuggestion } from "../services/geocoding";

declare const intBrand: unique symbol;

export type int = number & { readonly [intBrand]: true };

function asInt(value: number): int {
  return Math.trunc(value) as int;
}

export type Hexagon = {
  h3_id: string;
  overall_rating: int;
};

function withIntegerRating<T extends { overall_rating: number }>(
  item: T,
): Omit<T, "overall_rating"> & { overall_rating: int } {
  return { ...item, overall_rating: asInt(item.overall_rating) };
}

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
  const [openCategory, setOpenCategory] = useState<{ hexId: string; category: string } | null>(null);
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHost, setChatHost] = useState<HTMLDivElement | null>(null);
  const [chatContext, setChatContext] = useState<HexChatContext | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const canAddToComparison =
    selectedHexId !== null &&
    !comparisonIds.includes(selectedHexId) &&
    comparisonIds.length < comparisonLabels.length;

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
    queryFn: async ({ queryKey, signal }) => {
      const weights = queryKey[1] as AssessmentWeights | null;
      const hexagons = await getHexagonRatings(weights, signal);
      return hexagons.map(withIntegerRating);
    },
  });

  const showSkeleton = isHexagonsLoading || (isHexagonsError && isFetching);
  const {
    data: assessmentData,
    isLoading: isAssessmentLoading,
    isError: isAssessmentError,
    error: assessmentError,
    isFetching: isAssessmentFetching,
    refetch: refetchAssessment,
  } = useQuery(hexagonAssessmentOptions(selectedHexId, assessmentWeights));
  const showAssessmentSkeleton =
    isAssessmentLoading || (isAssessmentError && isAssessmentFetching);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelStop, setPanelStop] = useState<HexStopProperties | null>(null);
  // Stays after panelStop clears so the route list can slide away.
  const [retainedStop, setRetainedStop] = useState<HexStopProperties | null>(
    null,
  );
  if (panelStop !== null && panelStop !== retainedStop) {
    setRetainedStop(panelStop);
  }
  const panelOpenRef = useRef(false);
  const panelStopRef = useRef<HexStopProperties | null>(null);
  const restoreSlidersRef = useRef(false);
  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);
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
        if (panelStopRef.current) {
          panelStopRef.current = null;
          setPanelStop(null);
          if (!restoreSlidersRef.current) setPanelOpen(false);
          restoreSlidersRef.current = false;
          return;
        }
        setExpanded(false);
        setPanelOpen(false);
      }
      if (event.key === "Tab") {
        const elements = [
          ...sectionRef.current!.querySelectorAll<HTMLElement>(
            'button,input,textarea,summary,a[href],[tabindex="0"]',
          ),
        ].filter(
          (e) =>
            e.getClientRects().length &&
            !e.hasAttribute("disabled") &&
            !e.closest("[inert]"),
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
  const clearStopPanel = useCallback(() => {
    if (panelStopRef.current === null) return;
    panelStopRef.current = null;
    setPanelStop(null);
    if (!restoreSlidersRef.current) setPanelOpen(false);
    restoreSlidersRef.current = false;
  }, []);
  const closeMapPanelsForComparison = () => {
    restoreSlidersRef.current = false;
    clearStopPanel();
    setPanelOpen(false);
    setRoutesEnabled(false);
  };
  const takeStopInPanel = useCallback((stop: HexStopProperties) => {
    setComparisonOpen(false);
    if (panelStopRef.current === null) {
      restoreSlidersRef.current = panelOpenRef.current;
    }
    panelStopRef.current = stop;
    setPanelStop(stop);
    setPanelOpen(true);
    return true;
  }, []);
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!panelOpen) return;
    if (!panelStopRef.current) {
      panelRef.current
        ?.querySelector<HTMLButtonElement>(".weights-close")
        ?.focus();
    }
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !expanded) {
        if (panelStopRef.current) {
          panelStopRef.current = null;
          setPanelStop(null);
          if (!restoreSlidersRef.current) setPanelOpen(false);
          restoreSlidersRef.current = false;
          return;
        }
        setPanelOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [panelOpen, expanded]);
  useEffect(() => {
    if (!panelStop) return;
    panelRef.current
      ?.querySelector<HTMLButtonElement>(".stop-panel-close")
      ?.focus();
  }, [panelStop]);
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
    panelStopRef.current = null;
    restoreSlidersRef.current = false;
    setPanelStop(null);
    setPanelOpen(false);
    toggleRef.current?.focus();
  };
  const addSelectedToChat = () => {
    if (
      !selectedHexId ||
      !assessmentData ||
      showAssessmentSkeleton ||
      isAssessmentError
    )
      return;

    setChatContext({
      id: selectedHexId,
      score: assessmentData.overall_rating,
      categories: assessmentData.categories
        .filter((item) => item.enabled)
        .map((item) => ({
          title:
            categoryLabels.find(([key]) => key === item.category)?.[1] ??
            item.category,
          score: item.score,
        })),
    });
    setChatOpen(true);
  };
  const faceStop = panelStop ?? retainedStop;
  return (
    <section
      ref={sectionRef}
      id="map"
      className={`map-section ${expanded ? "map-expanded" : ""} ${panelOpen ? "panel-open" : ""}`}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? true : undefined}
      aria-labelledby="map-heading"
    >
      <Chat
        open={chatOpen}
        onOpenChange={setChatOpen}
        host={chatHost}
        context={chatContext}
        onRemoveContext={() => setChatContext(null)}
        onAddContext={addSelectedToChat}
        canAddContext={Boolean(
          selectedHexId &&
          assessmentData &&
          !showAssessmentSkeleton &&
          !isAssessmentError,
        )}
      />
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
            onClick={() => {
              if (panelStopRef.current) {
                restoreSlidersRef.current = true;
                clearStopPanel();
                return;
              }
              if (!panelOpen) setComparisonOpen(false);
              setPanelOpen(!panelOpen);
            }}
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
              onChange={(e) => {
                if (e.target.checked) setComparisonOpen(false);
                setRoutesEnabled(e.target.checked);
              }}
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
              if (expanded) clearStopPanel();
              setExpanded(!expanded);
              setPanelOpen(!expanded && !comparisonOpen);
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
            comparisonIds={comparisonIds}
            clearSelectionKey={clearSelectionKey}
            searchedLocation={searchedLocation}
            onHexSelect={setSelectedHexId}
            onStopInPanel={takeStopInPanel}
            onStopPanelDismiss={clearStopPanel}
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
            className={`weights-panel${panelStop ? " is-stop" : ""}`}
            aria-label={panelStop ? "Маршрути зупинки" : "Пріоритети"}
          >
            <MotionConfig reducedMotion="user">
              <div className="panel-deck">
                <motion.div
                  className="panel-face weights-face"
                  initial={false}
                  animate={
                    panelStop
                      ? {
                          x: "-14%",
                          scale: 0.96,
                          opacity: 0,
                          filter: "blur(3px)",
                        }
                      : { x: "0%", scale: 1, opacity: 1, filter: "blur(0px)" }
                  }
                  transition={faceTransition}
                  inert={Boolean(panelStop)}
                  style={{ pointerEvents: panelStop ? "none" : "auto" }}
                >
                  <div className="panel-heading">
                    <div>
                      <div className="text-block eyebrow">
                        ПЕРСОНАЛЬНА ОЦІНКА
                      </div>
                      <div role="heading" aria-level={3} className="heading-3">
                        Що для вас важливо
                      </div>
                    </div>
                    <button
                      className="weights-close"
                      aria-label="Закрити налаштування"
                      onClick={closePanel}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-block panel-intro">
                    Змініть важливість категорій. Карта оновиться після
                    застосування.
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
                      {dirty
                        ? "Є незастосовані зміни"
                        : "Пріоритети застосовано"}
                    </div>
                    <div>
                      <button
                        className="secondary-button"
                        onClick={handleReset}
                      >
                        Скинути
                      </button>
                      <button className="primary-button" onClick={handleApply}>
                        Застосувати
                      </button>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  className="panel-face stop-face"
                  initial={{
                    x: "16%",
                    scale: 0.98,
                    opacity: 0,
                    filter: "blur(3px)",
                  }}
                  animate={
                    panelStop
                      ? { x: "0%", scale: 1, opacity: 1, filter: "blur(0px)" }
                      : {
                          x: "16%",
                          scale: 0.98,
                          opacity: 0,
                          filter: "blur(3px)",
                        }
                  }
                  transition={faceTransition}
                  inert={!panelStop}
                  style={{ pointerEvents: panelStop ? "auto" : "none" }}
                >
                  {faceStop && (
                    <StopRoutesFace
                      key={faceStop.id}
                      stop={faceStop}
                      onClose={clearStopPanel}
                    />
                  )}
                </motion.div>
              </div>
            </MotionConfig>
          </aside>
        )}
        {selectedHexId && (
          <aside
            className={
              chatOpen ? "assessment-card with-chat" : "assessment-card"
            }
            aria-label="Оцінка ділянки"
          >
            <div className="assessment-summary">
              <div className="panel-heading">
                <div className="text-block eyebrow">
                  ВИБРАНА ДІЛЯНКА · ЛЬВІВ
                </div>
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
                  <strong>{assessmentData?.overall_rating ?? "—"}</strong>
                  <div className="inline-text">
                    Оцінка комфорту
                    <br />з 100
                  </div>
                </div>
              )}
              <button
                type="button"
                className="comparison-add"
                disabled={!canAddToComparison}
                onClick={() => {
                  if (canAddToComparison) {
                    closeMapPanelsForComparison();
                    setComparisonIds([...comparisonIds, selectedHexId]);
                  }
                }}
              >
                {comparisonIds.includes(selectedHexId)
                  ? "Ділянку додано"
                  : comparisonIds.length === comparisonLabels.length
                    ? "Вибрано максимум ділянок"
                    : "Додати до порівняння"}
              </button>
              <div
                className="assessment-tabs"
                role="group"
                aria-label="Вміст панелі"
              >
                <button
                  type="button"
                  className={!chatOpen ? "is-active" : ""}
                  aria-pressed={!chatOpen}
                  aria-label="Оцінки категорій"
                  title="Оцінки категорій"
                  onClick={() => setChatOpen(false)}
                >
                  <QueueListIcon aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={chatOpen ? "is-active" : ""}
                  aria-pressed={chatOpen}
                  aria-label="Чат з Окіл"
                  title="Чат з Окіл"
                  onClick={() => setChatOpen(true)}
                >
                  <ChatBubbleLeftRightIcon aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="assessment-category-body" hidden={chatOpen}>
              {!showAssessmentSkeleton &&
                !isAssessmentError &&
                (expanded ? (
                  <details
                    open={assessmentExpanded || expanded}
                    onToggle={(event) => {
                      if (event.target === event.currentTarget)
                        setAssessmentExpanded(event.currentTarget.open);
                    }}
                  >
                    <summary>Докладніше про оцінку</summary>
                    <div className="assessment-details">
                      <p className="text-block category-description">
                        Відстані по прямій від центру гексагону.
                      </p>
                      {categoryLabels.map(([key, title]) => {
                        const item = assessmentData?.categories.find(
                          (c) => c.category === key,
                        );
                        return (
                          <CategoryScore
                            key={key}
                            title={title}
                            item={item}
                            open={
                              openCategory?.hexId === selectedHexId &&
                              openCategory.category === key
                            }
                            onToggle={() =>
                              setOpenCategory((current) =>
                                current?.hexId === selectedHexId &&
                                current.category === key
                                  ? null
                                  : { hexId: selectedHexId, category: key },
                              )
                            }
                          />
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
                ))}
            </div>
            <div
              ref={setChatHost}
              className="assessment-chat-host"
              hidden={!chatOpen}
            />
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
        {comparisonIds.length > 0 && !panelOpen && (
          <HexagonComparison
            ids={comparisonIds}
            weights={assessmentWeights}
            open={comparisonOpen}
            onToggle={() => {
              if (!comparisonOpen) closeMapPanelsForComparison();
              setComparisonOpen(!comparisonOpen);
            }}
            onRemove={(id) => {
              setComparisonIds(comparisonIds.filter((item) => item !== id));
              if (comparisonIds.length <= 2) setComparisonOpen(false);
            }}
          />
        )}
      </div>
    </section>
  );
};
