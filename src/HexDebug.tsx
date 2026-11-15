import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { coordsToH3 } from "./lib/h3";
import { isValidCell } from "h3-js";
import DebugAccordion from "./DebugAccordion";
import { ApiError, fetcher } from "./lib/fetcher";
import DebugSearch from "./DebugSearch";
import DebugMap, { type Camera, type Cell, type Dot } from "./DebugMap";
import "./hex-debug.css";
import DebugView from "./DebugView";
import {
  Squares2X2Icon,
  CheckCircleIcon,
  MinusCircleIcon,
  CalculatorIcon,
  MapPinIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Skeleton } from "./components/ui/skeleton";
import { TogglerCard } from "./components/TogglerCard";
import {
  defaultTogglers,
  togglerIds,
  lockedTogglerIds,
  buildAssessmentWeights,
  weightsSearch,
} from "./lib/assessmentWeights";
import { categoryLabels as weightLabels } from "./lib/hexagonAssessment";
import SlidersHorizontal from "./icons/adjustments-horizontal";
import ScoringGuide, { type ScoringConfig } from "./ScoringGuide";

type Config = ScoringConfig & {
  types: string[];
  categories: string[];
  batch_limit: number;
};
type Step = {
  category: string;
  type: string;
  radii: number[];
  weight: number;
  score: number;
  contribution: number;
  used: { id: number; distance: number; routes?: number[]; weight?: number }[];
  destinations?: Record<string, number>;
  penalty?: number;
  network_score?: number;
};
type Category = {
  category: string;
  score: number;
  weight: number;
  adjusted_score: number | null;
};
type Detail = {
  h3_id: string;
  stored: number;
  fresh: number;
  experiment: number;
  steps: Step[];
  categories: Record<"stored" | "fresh" | "experiment", Category[]>;
  category_scores?: Record<
    "stored" | "fresh" | "experiment",
    Record<string, number>
  >;
};
type Point = Dot & {
  type: string;
  category: string;
  source: string;
  external_id: string;
  h3_id: string;
  distance: number;
  mismatch: boolean;
  used: boolean;
  weight: number;
  contribution: number | null;
};
const noCells: Cell[] = [];
const categoryLabels: Record<string, string> = {
  health: "Здоров’я",
  study: "Освіта",
  daily: "Щоденні потреби",
  mobility: "Транспорт",
  sport: "Спорт",
  enjoyment: "Дозвілля",
  food: "Харчування",
  security: "Безпека",
};

function describePoint(point: Point, detail?: Detail): Point {
  const categoryLabel =
    categoryLabels[point.category] || point.category || "Категорія невідома";
  if (!detail)
    return { ...point, categoryLabel, influence: "Завантаження впливу…" };
  const step = detail.steps.find((s) =>
    s.used.some(
      (p) =>
        p.id === point.id &&
        (point.kind === "stop"
          ? s.type === "gtfs_stop"
          : s.type === point.type),
    ),
  );
  const category = detail.categories.fresh.find(
    (c) => c.category === point.category,
  );
  let influence = "Вплив 0 — формула враховує ближчу точку цього типу.";
  if (point.kind === "stop")
    influence = "Вплив 0 — зупинка не вибрана транспортною формулою.";
  if (category?.weight === 0 || step?.weight === 0)
    influence = "Вплив 0 — тип або категорію вимкнено.";
  else if (step)
    influence =
      point.kind === "stop"
        ? "Врахована у транспортній доступності. Внесок спільний із мережею зупинок."
        : `Внесок у категорію «${categoryLabel}» — ${step.contribution.toFixed(2)} бала. Врахована як найближча точка цього типу.`;
  return { ...point, categoryLabel, influence };
}

function url(values: Record<string, string>) {
  const u = new URL(location.href);
  for (const [k, v] of Object.entries(values)) u.searchParams.set(k, v);
  history.replaceState(null, "", u);
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "Помилка запиту";
}

const SESSION_KEY = "okil.debug.session";
type DebugSession = { auth: string; expiresAt: number };
function readSession(): DebugSession | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (
      typeof saved?.auth === "string" &&
      saved.auth.startsWith("Bearer ") &&
      Number.isFinite(saved.expiresAt) &&
      saved.expiresAt > Date.now()
    )
      return saved;
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* A fresh login also works when browser storage is unavailable. */
  }
  return null;
}
function storeSession(value: DebugSession | null) {
  try {
    if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* The active session remains usable in this page. */
  }
}
export default function HexDebug() {
  const [saved] = useState(readSession);
  const [session, setSession] = useState<
    (DebugSession & { config: Config }) | null
  >(null);
  const [restoring, setRestoring] = useState(!!saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!saved) return;
    const controller = new AbortController();
    fetcher("/debug/config", {
      headers: { Authorization: saved.auth },
      signal: controller.signal,
    })
      .then((config) => {
        if (!controller.signal.aborted && saved.expiresAt > Date.now())
          setSession({ ...saved, config });
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          if (err instanceof ApiError && err.status === 401) storeSession(null);
          setError("Не вдалося відновити сесію. Увійдіть знову.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRestoring(false);
      });
    return () => controller.abort();
  }, [saved]);
  const expiresAt = session?.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    function expire() {
      if (Date.now() < expiresAt!) return;
      storeSession(null);
      setSession(null);
      setError("Сесія завершилася. Увійдіть знову.");
    }
    const timer = setTimeout(expire, Math.max(0, expiresAt - Date.now()));
    window.addEventListener("focus", expire);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", expire);
    };
  }, [expiresAt]);
  if (session) return <Inspector auth={session.auth} config={session.config} />;
  return (
    <main className="hex-debug login">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          const data = new FormData(event.currentTarget);
          try {
            const bytes = new TextEncoder().encode(
              data.get("name") + ":" + data.get("password"),
            );
            const basic =
              "Basic " +
              btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
            const issued = await fetcher("/debug/session", {
              method: "POST",
              headers: { Authorization: basic },
            });
            const next = {
              auth: "Bearer " + issued.token,
              expiresAt: issued.expires_at * 1000,
            };
            const config = await fetcher("/debug/config", {
              headers: { Authorization: next.auth },
            });
            storeSession(next);
            setSession({ ...next, config });
          } catch (err) {
            setError(
              err instanceof ApiError && err.status === 401
                ? "Невірний логін або пароль"
                : err instanceof ApiError && err.status === 429
                  ? "Забагато невдалих спроб. Спробуйте знову через 15 хвилин."
                  : message(err),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>Вхід</h1>
        {restoring ? (
          <p role="status" className="debug-login-status">
            Відновлюємо сесію…
          </p>
        ) : (
          <>
            <label>
              Логін
              <input required name="name" autoComplete="username" />
            </label>
            <label>
              Пароль
              <input
                required
                name="password"
                type="password"
                autoComplete="current-password"
              />
            </label>
            <button disabled={busy}>{busy ? "Входимо…" : "Увійти"}</button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}

function Inspector({ auth, config }: { auth: string; config: Config }) {
  const initial = new URLSearchParams(location.search).get("hex") || "";
  const [id, setId] = useState(isValidCell(initial) ? initial : "");
  const [viewOpen, setViewOpen] = useState(false);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [draft, setDraft] = useState(defaultTogglers);
  const [applied, setApplied] = useState(defaultTogglers);
  const weights = useMemo(() => buildAssessmentWeights(applied), [applied]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied);
  const weightedRatings = useQuery<Cell[]>({
    queryKey: ["debug-weighted-map", weights],
    queryFn: ({ signal }) =>
      fetcher("/hexagons" + weightsSearch(weights), {
        headers: { Authorization: auth },
        signal,
      }),
  });
  const [category, setCategory] = useState("");
  const [pointType, setPointType] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [used, setUsed] = useState("true");
  const [tab, setTab] = useState("Точки");
  const [expandedCategory, setExpandedCategory] = useState<{
    hex: string;
    category: string;
  } | null>(null);
  function toggleCategory(category: string) {
    setExpandedCategory((current) =>
      current?.hex === id && current.category === category
        ? null
        : { hex: id, category },
    );
  }
  const [focus, setFocus] = useState<Dot | null>(null);
  const headers = { Authorization: auth };
  const cells = useQuery<Cell[]>({
    queryKey: ["debug-cells-category-scores"],
    queryFn: ({ signal }) => fetcher("/debug/ratings", { headers, signal }),
  });
  const details = useQuery<Detail>({
    queryKey: ["debug-detail", id, weights],
    enabled: !!id,
    queryFn: async ({ signal }) => {
      const categories = Object.fromEntries(
        Object.entries(weights).map(([key, value]) => [
          key.replace("weight_", ""),
          value,
        ]),
      );
      const result = (
        await fetcher("/debug/recalculate", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [id], selected: id, categories }),
          signal,
        })
      )[0] as Detail;
      return {
        ...result,
        fresh: result.experiment,
        categories: {
          ...result.categories,
          fresh: result.categories.experiment,
        },
      };
    },
  });
  const points = useQuery<Point[]>({
    queryKey: ["debug-selected-points", id],
    enabled: !!id,
    queryFn: async ({ signal }) => {
      const rows: Point[] = [];
      let total = 1;
      while (rows.length < total) {
        const page = await fetcher(
          `/debug/hexagons/${id}/points?offset=${rows.length}&limit=200`,
          { headers, signal },
        );
        rows.push(...page.rows);
        total = page.total;
        if (!page.rows.length) break;
      }
      return rows;
    },
  });
  const allPoints = useQuery<Point[]>({
    queryKey: ["debug-global-points", category, pointType],
    enabled: showAll,
    queryFn: async ({ signal }) => {
      const rows: Point[] = [];
      let offset: number | null = 0;
      while (offset !== null) {
        const query = new URLSearchParams({
          offset: String(offset),
          limit: "1000",
        });
        if (category) query.set("category", category);
        if (pointType) query.set("type", pointType);
        const page = await fetcher("/debug/points?" + query, {
          headers,
          signal,
        });
        rows.push(...page.rows);
        offset = page.next_offset ?? null;
      }
      return rows;
    },
  });
  function selectPoint(point: Dot) {
    select(coordsToH3(point.lat, point.lon));
    setFocus(point);
    setTab("Точки");
    setUsed("");
    setWeightsOpen(false);
  }
  function select(value: string) {
    setId(value);
    setFocus(null);
    url({ hex: value });
  }
  function view(_ids: string[], cam: Camera) {
    url({ view: cam.map((n) => n.toFixed(5)).join(",") });
  }
  const weightedScoreIndex = useMemo(
    () =>
      new Map(
        (weightedRatings.data || []).map((cell) => [
          cell.h3_id,
          cell.overall_rating,
        ]),
      ),
    [weightedRatings.data],
  );
  const scores = useMemo(
    () =>
      Object.fromEntries(
        (cells.data || [])
          .map((cell) => [
            cell.h3_id,
            category
              ? cell.category_scores?.[category]
              : (weightedScoreIndex.get(cell.h3_id) ?? cell.overall_rating),
          ])
          .filter((entry): entry is [string, number] => entry[1] !== undefined),
      ),
    [cells.data, category, weightedScoreIndex],
  );
  const mapPoints = useMemo(
    () =>
      (points.data || [])
        .filter(
          (point) =>
            (!category || point.category === category) &&
            (!pointType || point.type === pointType) &&
            (!used || String(point.used) === used),
        )
        .map((point) => describePoint(point, details.data)),
    [points.data, category, pointType, used, details.data],
  );
  const globalDots = useMemo(
    () =>
      (allPoints.data || []).map((point) => ({
        ...point,
        categoryLabel: categoryLabels[point.category] || point.category,
        influence:
          "Натисніть POI, щоб перевірити його вплив на оцінку гексагона.",
      })),
    [allPoints.data],
  );
  const focusedPoint = useMemo(
    () => (focus ? describePoint(focus as Point, details.data) : null),
    [focus, details.data],
  );
  const d = details.data;
  return (
    <main
      className={`hex-debug ${viewOpen || weightsOpen ? "debug-view-open" : ""}`}
    >
      <header className="debug-header">
        <button
          className="debug-toolbar-button"
          aria-expanded={viewOpen}
          onClick={() => {
            setViewOpen(!viewOpen);
            setWeightsOpen(false);
          }}
        >
          <Squares2X2Icon />
          Вигляд
        </button>
        <DebugSearch
          onSelect={select}
          auth={auth}
          onPointSelect={(point) => {
            setShowAll(false);
            setCategory("");
            setPointType("");
            selectPoint(point);
          }}
        />
        <button
          className="debug-priorities debug-toolbar-button"
          aria-expanded={weightsOpen}
          onClick={() => {
            setWeightsOpen(!weightsOpen);
            setViewOpen(false);
          }}
        >
          <SlidersHorizontal aria-hidden="true" />
          Пріоритети
        </button>
      </header>
      <section className="debug-workspace">
        <div className="debug-map-area">
          <DebugMap
            cells={cells.data || noCells}
            scores={scores}
            difference={false}
            selected={id}
            dots={showAll ? globalDots : mapPoints}
            focus={focusedPoint}
            onPointSelect={showAll ? selectPoint : setFocus}
            onSelect={select}
            onView={view}
          />
        </div>
        {viewOpen && (
          <DebugView
            categories={config.categories.map((name) => [
              name,
              categoryLabels[name] || name,
            ])}
            types={config.types.filter(
              (type) =>
                !category ||
                config.point_types?.some(
                  (point) => point.type === type && point.category === category,
                ),
            )}
            category={category}
            pointType={pointType}
            showAll={showAll}
            loading={allPoints.isFetching}
            count={globalDots.length}
            error={allPoints.error ? message(allPoints.error) : ""}
            onCategory={(value) => {
              setCategory(value);
              setPointType("");
              setFocus(null);
            }}
            onType={(value) => {
              setPointType(value);
              setFocus(null);
            }}
            onAll={(value) => {
              setShowAll(value);
              setFocus(null);
            }}
            onClose={() => setViewOpen(false)}
          />
        )}

        {weightsOpen && (
          <aside
            className="debug-inspector showing-weights weights-panel"
            aria-label="Персональна оцінка"
          >
            <div className="panel-deck">
              <div className="panel-face weights-face">
                <div className="panel-heading">
                  <div>
                    <p className="debug-eyebrow">Персональна оцінка</p>
                    <h1>Що для вас важливо</h1>
                  </div>
                  <button
                    aria-label="Закрити налаштування"
                    onClick={() => setWeightsOpen(false)}
                  >
                    <XMarkIcon />
                  </button>
                </div>
                <p className="panel-intro">
                  Змініть важливість категорій. Карта оновиться після
                  застосування.
                </p>
                <div className="weights-list">
                  {weightLabels.map(([, title], index) => {
                    const key = togglerIds[index];
                    return (
                      <TogglerCard
                        key={key}
                        id={key}
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
                          ][index]
                        }
                        locked={lockedTogglerIds.has(key)}
                        {...draft[key]}
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            [key]: { ...current[key], value },
                          }))
                        }
                        onOnChange={(on) =>
                          setDraft((current) => ({
                            ...current,
                            [key]: { ...current[key], on },
                          }))
                        }
                      />
                    );
                  })}
                </div>
                <div className="panel-actions">
                  <p role="status">
                    {dirty ? "Є незастосовані зміни" : "Пріоритети застосовано"}
                  </p>
                  <div>
                    <button
                      onClick={() => {
                        setDraft(defaultTogglers());
                        setApplied(defaultTogglers());
                      }}
                    >
                      Скинути
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => {
                        setApplied(draft);
                        setWeightsOpen(false);
                      }}
                    >
                      Застосувати
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
        <aside className="debug-inspector" aria-label="Оцінка гексагону">
          <>
            {!id ? (
              <div className="debug-empty">
                <h1>Що впливає на оцінку?</h1>
                <p>
                  Натисніть на гексагон або знайдіть адресу, щоб побачити
                  враховані POI та їхній внесок.
                </p>
              </div>
            ) : (
              <>
                <header className="debug-assessment-heading">
                  <SparklesIcon aria-hidden="true" />
                  <h1>Оцінка гексагону</h1>
                </header>
                <div className="debug-selection" title={id}>
                  <span>H3</span>
                  <code>{id}</code>
                  {points.data && (
                    <span
                      className="debug-poi-count"
                      title="POI за обраними фільтрами"
                    >
                      {mapPoints.length} POI
                    </span>
                  )}
                </div>
                <div className="debug-score-toolbar">
                  {details.isPending || details.isFetching ? (
                    <div
                      className="debug-score-skeleton"
                      role="status"
                      aria-label="Завантаження оцінки"
                    >
                      <Skeleton className="debug-skeleton-number" />
                      <div>
                        <Skeleton className="debug-skeleton-caption" />
                        <Skeleton className="debug-skeleton-caption short" />
                      </div>
                    </div>
                  ) : d ? (
                    <div className="debug-score" aria-label="Індекс комфорту">
                      <strong>{d.fresh}</strong>
                      <span>
                        Індекс
                        <br />
                        комфорту
                        <br />
                        зі 100
                      </span>
                    </div>
                  ) : (
                    <div className="debug-score">
                      <strong>—</strong>
                    </div>
                  )}
                  <div className="debug-score-controls">
                    <nav aria-label="Деталі гексагона">
                      {[
                        { name: "Точки", title: "Точки", icon: MapPinIcon },
                        {
                          name: "Розрахунок",
                          title: "Бали",
                          icon: CalculatorIcon,
                        },
                      ].map(({ name, title, icon: Icon }) => (
                        <button
                          key={name}
                          aria-label={name}
                          title={name}
                          aria-pressed={tab === name}
                          onClick={() => setTab(name)}
                        >
                          <Icon />
                          {title}
                        </button>
                      ))}
                    </nav>
                    {tab === "Точки" && (
                      <div
                        className="debug-participation"
                        role="group"
                        aria-label="Участь у розрахунку"
                      >
                        {[
                          {
                            value: "true",
                            title: "Враховані",
                            icon: CheckCircleIcon,
                          },
                          { value: "", title: "Усі", icon: Squares2X2Icon },
                          {
                            value: "false",
                            title: "Невраховані",
                            icon: MinusCircleIcon,
                          },
                        ].map(({ value, title, icon: Icon }) => (
                          <button
                            key={value}
                            title={title}
                            aria-label={title}
                            aria-pressed={used === value}
                            onClick={() => {
                              setUsed(value);
                              setFocus(null);
                            }}
                          >
                            <Icon />
                          </button>
                        ))}
                      </div>
                    )}
                    {tab === "Розрахунок" && (
                      <ScoringGuide config={config} compact />
                    )}
                  </div>
                </div>
                {(tab === "Точки" ? points.isFetching : details.isFetching) ? (
                  <div
                    className="debug-list-skeleton"
                    role="status"
                    aria-label={
                      tab === "Точки"
                        ? "Завантаження POI"
                        : "Завантаження розрахунку"
                    }
                  >
                    {[0, 1, 2].map((index) => (
                      <div key={index}>
                        <Skeleton className="debug-skeleton-title" />
                        <Skeleton className="debug-skeleton-line" />
                        <Skeleton className="debug-skeleton-line short" />
                      </div>
                    ))}
                  </div>
                ) : (
                  tab === "Точки" && (
                    <>
                      {Array.from(
                        new Set(mapPoints.map((point) => point.category)),
                      ).map((name) => (
                        <DebugAccordion
                          key={name || "unknown"}
                          className="debug-point-group"
                          title={categoryLabels[name] || "Без категорії"}
                          value={
                            mapPoints.filter((point) => point.category === name)
                              .length
                          }
                          open={
                            expandedCategory?.hex === id &&
                            expandedCategory.category === name
                          }
                          onToggle={() => toggleCategory(name)}
                        >
                          {mapPoints
                            .filter((point) => point.category === name)
                            .map((point) => (
                              <article
                                key={point.kind + point.id}
                                className={
                                  focus?.kind === point.kind &&
                                  focus.id === point.id
                                    ? "is-focused"
                                    : ""
                                }
                              >
                                <button onClick={() => setFocus(point)}>
                                  {point.name || point.type}
                                </button>
                                <p>
                                  {point.distance.toFixed(0)} м від центра ·{" "}
                                  {point.inside
                                    ? "у гексагоні"
                                    : "поруч із гексагоном"}
                                </p>
                                <p className="debug-point-influence">
                                  {point.influence}
                                </p>
                                <details>
                                  <summary>Дані POI</summary>
                                  <p>
                                    ID {point.id} · {point.type} ·{" "}
                                    {point.source} #{point.external_id}
                                  </p>
                                  <p>
                                    {point.lat}, {point.lon}
                                  </p>
                                  <p>
                                    {point.h3_id}
                                    {point.mismatch &&
                                      " · H3 не збігається з координатами"}
                                  </p>
                                </details>
                              </article>
                            ))}
                        </DebugAccordion>
                      ))}
                      {points.data && !mapPoints.length && (
                        <p>За цими фільтрами POI немає.</p>
                      )}
                    </>
                  )
                )}
                {tab === "Розрахунок" && d && !details.isFetching && (
                  <>
                    {d.categories.fresh
                      .filter((c) => !category || c.category === category)
                      .map((c) => (
                        <DebugAccordion
                          key={c.category}
                          className="debug-score-group"
                          title={categoryLabels[c.category] || c.category}
                          value={Number(c.score.toFixed(2))}
                          score={c.score}
                          open={
                            expandedCategory?.hex === id &&
                            expandedCategory.category === c.category
                          }
                          onToggle={() => toggleCategory(c.category)}
                        >
                          {d.steps
                            .filter((step) => step.category === c.category)
                            .map((step) => (
                              <article key={step.type}>
                                <b>{step.type}</b>
                                <p className="debug-point-influence">
                                  Внесок у категорію —{" "}
                                  {step.contribution.toFixed(2)} бала.
                                </p>
                                <dl className="debug-step-values">
                                  <div>
                                    <dt>Бал типу</dt>
                                    <dd>{step.score.toFixed(2)}</dd>
                                  </div>
                                  <div>
                                    <dt>Вага типу</dt>
                                    <dd>{step.weight.toFixed(3)}</dd>
                                  </div>
                                  <div>
                                    <dt>Радіуси, м</dt>
                                    <dd>{step.radii.join(" / ")}</dd>
                                  </div>
                                </dl>
                                {step.used.map((point) => (
                                  <p key={point.id}>
                                    POI #{point.id} ·{" "}
                                    {point.distance.toFixed(0)} м
                                    {point.routes &&
                                      " · маршрути " + point.routes.join(", ")}
                                  </p>
                                ))}
                                {step.destinations && (
                                  <details>
                                    <summary>Транспортна мережа</summary>
                                    <p>
                                      Коефіцієнт {step.penalty} · бал мережі{" "}
                                      {step.network_score?.toFixed(2)}
                                    </p>
                                    {Object.entries(step.destinations).map(
                                      ([key, weight]) => (
                                        <p key={key}>
                                          Зупинка #{key} · {weight.toFixed(3)}
                                        </p>
                                      ),
                                    )}
                                  </details>
                                )}
                              </article>
                            ))}
                        </DebugAccordion>
                      ))}
                  </>
                )}
              </>
            )}
            {(cells.error ||
              details.error ||
              points.error ||
              weightedRatings.error) && (
              <p role="alert">
                {message(
                  cells.error ||
                    details.error ||
                    points.error ||
                    weightedRatings.error,
                )}
              </p>
            )}
          </>
        </aside>
      </section>
    </main>
  );
}
