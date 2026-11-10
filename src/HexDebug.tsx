import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cellToLatLng, isValidCell } from "h3-js";
import { fetcher } from "./lib/fetcher";
import { coordsToH3 } from "./lib/h3";
import { AddressSearch } from "./components/AddressSearch";
import DebugMap, { type Camera, type Cell, type Dot } from "./DebugMap";
import "./hex-debug.css";
import ScoringGuide, { type ScoringConfig } from "./ScoringGuide";

type Config = ScoringConfig & {
  types: string[];
  categories: string[];
  batch_limit: number;
};
type Weights = {
  types: Record<string, number>;
  categories: Record<string, number>;
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
const empty: Weights = { types: {}, categories: {} };
const labels = {
  stored: "Збережене",
  fresh: "Свіже",
  experiment: "Експеримент",
  difference: "Різниця",
};
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
  const category = detail.categories.experiment.find(
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
  const [lat, lon] = cellToLatLng(detail.h3_id || point.h3_id);
  const distance = Math.hypot(
    (point.lat - lat) * 111139,
    (point.lon - lon) * 111139 * Math.cos((49.84 * Math.PI) / 180),
  );
  return { ...point, categoryLabel, influence, distance };
}

function url(values: Record<string, string>) {
  const u = new URL(location.href);
  for (const [k, v] of Object.entries(values)) u.searchParams.set(k, v);
  history.replaceState(null, "", u);
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "Помилка запиту";
}

export default function HexDebug() {
  const [session, setSession] = useState<{
      auth: string;
      config: Config;
    } | null>(null),
    [error, setError] = useState("");
  if (session) return <Inspector {...session} />;
  return (
    <main className="hex-debug login">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          try {
            const bytes = new TextEncoder().encode(
              data.get("name") + ":" + data.get("password"),
            );
            const auth =
              "Basic " +
              btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
            const config = await fetcher("/debug/config", {
              headers: { Authorization: auth },
            });
            setSession({ auth, config });
          } catch (err) {
            setError(message(err));
          }
        }}
      >
        <h1>Дебагер гексагонів</h1>
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
        <button>Увійти</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}

function Inspector({ auth, config }: { auth: string; config: Config }) {
  const initial = new URLSearchParams(location.search).get("hex") || "";
  const [id, setId] = useState(isValidCell(initial) ? initial : ""),
    [search, setSearch] = useState(initial);
  const [visible, setVisible] = useState<string[]>([]),
    [mode, setMode] = useState<keyof typeof labels>("stored");
  const [draft, setDraft] = useState<Weights>(empty),
    [run, setRun] = useState<{ ids: string[]; weights: Weights } | null>(null);
  const [tab, setTab] = useState("Точки"),
    [offset, setOffset] = useState(0),
    [where, setWhere] = useState(""),
    [used, setUsed] = useState("");
  const [category, setCategory] = useState("");
  const [showAllPoints, setShowAllPoints] = useState(false);
  const [focus, setFocus] = useState<Dot | null>(null),
    [error, setError] = useState("");
  const headers = { Authorization: auth };
  const cells = useQuery<Cell[]>({
    queryKey: ["debug-cells-category-scores"],
    queryFn: ({ signal }) => fetcher("/debug/ratings", { headers, signal }),
  });
  const details = useQuery<Detail>({
    queryKey: ["debug-detail", id, run?.weights],
    enabled: !!id,
    queryFn: async ({ signal }) =>
      run
        ? (
            await fetcher("/debug/recalculate", {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ ids: [id], selected: id, ...run.weights }),
              signal,
            })
          )[0]
        : fetcher("/debug/hexagons/" + id, { headers, signal }),
  });
  const points = useQuery<{ rows: Point[]; total: number }>({
    queryKey: ["debug-points", id, offset, where, used, category],
    enabled: !!id,
    queryFn: ({ signal }) =>
      fetcher(
        `/debug/hexagons/${id}/points?offset=${offset}${where ? "&location=" + where : ""}${used ? "&used=" + used : ""}${category ? "&category=" + encodeURIComponent(category) : ""}`,
        { headers, signal },
      ),
  });
  const results = useQuery<Detail[]>({
    queryKey: ["debug-area", run],
    enabled: !!run,
    retry: false,
    queryFn: async ({ signal }) => {
      const rows: Detail[] = [];
      for (let i = 0; run && i < run.ids.length; i += config.batch_limit) {
        rows.push(
          ...(await fetcher("/debug/recalculate", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              ids: run.ids.slice(i, i + config.batch_limit),
              ...run.weights,
            }),
            signal,
          })),
        );
      }
      return rows;
    },
  });
  const areaPoints = useQuery<Point[]>({
    queryKey: ["debug-all-points", visible, category],
    enabled: showAllPoints && visible.length > 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const rows: Point[] = [];
      for (let index = 0; index < visible.length; index += config.batch_limit) {
        const page = await fetcher("/debug/points", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: visible.slice(index, index + config.batch_limit),
            category: category || null,
          }),
          signal,
        });
        rows.push(
          ...page.rows.map((point: Point) => ({
            ...point,
            inside: point.h3_id === id,
          })),
        );
      }
      return rows;
    },
  });
  function select(value: string) {
    if (!isValidCell(value)) {
      setError("Некоректний H3 ID");
      return;
    }
    setError("");
    setId(value);
    setSearch(value);
    setOffset(0);
    setFocus(null);
    url({ hex: value });
  }
  function view(ids: string[], cam: Camera) {
    setVisible(ids);
    url({ view: cam.map((n) => n.toFixed(5)).join(",") });
  }
  const scores: Record<string, number> = {};
  if (mode === "stored") {
    for (const c of cells.data || []) {
      const value = category ? c.category_scores?.[category] : c.overall_rating;
      if (value !== undefined) scores[c.h3_id] = value;
    }
  } else {
    for (const c of results.data || []) {
      const fresh = category ? c.category_scores?.fresh[category] : c.fresh;
      const experiment = category
        ? c.category_scores?.experiment[category]
        : c.experiment;
      const value =
        mode === "difference"
          ? fresh !== undefined && experiment !== undefined
            ? experiment - fresh
            : undefined
          : mode === "fresh"
            ? fresh
            : experiment;
      if (value !== undefined) scores[c.h3_id] = value;
    }
  }
  const d = details.data;
  const mapPoints = useMemo(
    () => (points.data?.rows || []).map((p) => describePoint(p, d)),
    [points.data, d],
  );
  const allDots = useMemo(
    () =>
      (areaPoints.data || []).map((p) => ({
        ...p,
        categoryLabel: categoryLabels[p.category] || p.category,
        influence: "Оберіть точку, щоб перевірити її вплив у її гексагоні.",
      })),
    [areaPoints.data],
  );
  const focusedPoint = useMemo(
    () => (focus ? describePoint(focus as Point, d) : null),
    [focus, d],
  );
  return (
    <main className="hex-debug">
      <header>
        <strong>Okil / Дебагер</strong>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            select(search.trim());
          }}
        >
          <input
            aria-label="H3 ID"
            placeholder="H3 ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button>Знайти</button>
        </form>
        <AddressSearch
          onLocationChange={(p) => {
            if (p) select(coordsToH3(p.lat, p.lng));
          }}
        />
        <select
          aria-label="Забарвлення"
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
        >
          {Object.entries(labels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          disabled={!visible.length}
          onClick={() => {
            setRun({ ids: visible, weights: draft });
            setMode("experiment");
          }}
        >
          Перерахувати ({visible.length})
        </button>
        <button
          onClick={() => {
            setDraft(empty);
            setRun(null);
            setMode("stored");
          }}
        >
          Скинути ваги
        </button>
        <ScoringGuide config={config} />
        <button
          aria-pressed={showAllPoints}
          onClick={() => {
            setShowAllPoints(!showAllPoints);
            setFocus(null);
          }}
        >
          {showAllPoints ? "Точки вибраного гексагона" : "Усі точки на мапі"}
        </button>
        <select
          aria-label="Категорія точок"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setOffset(0);
            setFocus(null);
          }}
        >
          <option value="">Усі категорії</option>
          {config.categories.map((name) => (
            <option key={name} value={name}>
              {categoryLabels[name] || name}
            </option>
          ))}
        </select>
      </header>
      <section>
        <DebugMap
          cells={cells.data || noCells}
          scores={scores}
          difference={mode === "difference"}
          selected={id}
          dots={showAllPoints ? allDots : mapPoints}
          focus={focusedPoint}
          onPointSelect={(point) => {
            const p = point as Point;
            if (showAllPoints && p.h3_id !== id) select(p.h3_id);
            setFocus(p);
          }}
          onSelect={select}
          onView={view}
        />
        <aside>
          {showAllPoints && (
            <p role="status">
              {areaPoints.isFetching
                ? "Завантаження точок видимих гексагонів…"
                : `На мапі ${allDots.length} точок видимих гексагонів. Клікніть точку, щоб відкрити її гексагон.`}
            </p>
          )}
          {showAllPoints && areaPoints.error && (
            <p role="alert">{message(areaPoints.error)}</p>
          )}
          <small>
            {category
              ? `${categoryLabels[category] || category} · `
              : "Загальна оцінка · "}
            {mode === "difference"
              ? "Експеримент − свіже · зелений + / червоний −"
              : "Оцінка 0–100 · червоний → зелений"}{" "}
            · сірий: немає результату
          </small>
          {results.isFetching && (
            <p role="status">Перерахунок видимої області…</p>
          )}
          {mode !== "stored" &&
            (!run || visible.some((x) => !run.ids.includes(x))) && (
              <p>Для цієї області потрібен перерахунок.</p>
            )}
          {(error ||
            cells.error ||
            details.error ||
            points.error ||
            results.error) && (
            <p role="alert">
              {error ||
                message(
                  cells.error || details.error || points.error || results.error,
                )}
            </p>
          )}
          <h2>{id || "Виберіть гексагон"}</h2>
          {d && (
            <div className="debug-ratings">
              {(["stored", "fresh", "experiment"] as const).map((k) => (
                <div key={k}>
                  {labels[k]}
                  <b>{d[k]}</b>
                </div>
              ))}
            </div>
          )}
          <nav>
            {["Розрахунок", "Точки", "Ваги"].map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>
          {tab === "Розрахунок" && d && (
            <>
              <p>
                Загальна оцінка = добуток балів активних категорій у степенях
                їхніх нормалізованих ваг.
              </p>
              {d.categories.experiment.map((c, i) => (
                <details key={c.category}>
                  <summary>
                    {categoryLabels[c.category] || c.category} ·{" "}
                    {d.categories.stored[i].score} →{" "}
                    {d.categories.fresh[i].score} → {c.score}
                  </summary>
                  <p>
                    Вага {c.weight} · множник {c.adjusted_score ?? "вимкнено"}
                  </p>
                  {d.steps
                    .filter((s) => s.category === c.category)
                    .map((s) => (
                      <article key={s.type}>
                        <b>{s.type}</b>
                        <p>Радіуси {s.radii.join(" / ")} м</p>
                        <p>
                          {s.score.toFixed(2)} × {s.weight.toFixed(3)} ={" "}
                          {s.contribution.toFixed(2)}
                        </p>
                        {s.used.map((p) => (
                          <div key={p.id}>
                            #{p.id} · {p.distance.toFixed(0)} м{" "}
                            {p.routes && " · маршрути " + p.routes.join(", ")}{" "}
                            {p.weight !== undefined &&
                              " · вага " + p.weight.toFixed(3)}
                          </div>
                        ))}
                        {s.destinations && (
                          <details>
                            <summary>
                              Транспорт · коефіцієнт {s.penalty} · бал мережі{" "}
                              {s.network_score?.toFixed(2)}
                            </summary>
                            {Object.entries(s.destinations).map(([key, w]) => (
                              <div key={key}>
                                Зупинка #{key} · {w.toFixed(3)}
                              </div>
                            ))}
                          </details>
                        )}
                      </article>
                    ))}
                </details>
              ))}
            </>
          )}
          {tab === "Точки" && (
            <>
              <select
                aria-label="Розташування"
                value={where}
                onChange={(e) => {
                  setWhere(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">Усі розташування</option>
                <option value="inside">Внутрішні</option>
                <option value="outside">Зовнішні</option>
              </select>
              <select
                aria-label="Участь"
                value={used}
                onChange={(e) => {
                  setUsed(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">Усі точки</option>
                <option value="true">Враховані</option>
                <option value="false">Невраховані</option>
              </select>
              {Array.from(new Set(mapPoints.map((p) => p.category))).map(
                (name) => (
                  <details
                    className="debug-point-group"
                    key={name || "unknown"}
                    open
                  >
                    <summary>
                      {categoryLabels[name] || name || "Без категорії"}
                    </summary>
                    {mapPoints
                      .filter((p) => p.category === name)
                      .map((p) => (
                        <article key={p.kind + p.id}>
                          <button onClick={() => setFocus({ ...p })}>
                            {p.name || p.type}
                          </button>
                          <p>
                            {p.categoryLabel} · {p.distance.toFixed(0)} м
                          </p>
                          <p className="debug-point-influence">{p.influence}</p>
                          <details>
                            <summary>Технічні деталі</summary>
                            <p>
                              {p.type} / {p.category} · {p.source} #
                              {p.external_id}
                            </p>
                            <p>
                              {p.lat}, {p.lon} · {p.distance.toFixed(0)} м ·{" "}
                              {p.inside ? "внутрішня" : "зовнішня"}
                            </p>
                            <p>
                              {p.h3_id}{" "}
                              {p.mismatch &&
                                "⚠ H3 не збігається з координатами"}
                            </p>
                            <p>
                              {p.used ? "Врахована" : "Не вибрана формулою"} ·
                              базова вага {p.weight.toFixed(3)} · внесок{" "}
                              {p.contribution?.toFixed(2) ??
                                (p.used ? "у транспортну мережу" : "0")}
                            </p>
                          </details>
                        </article>
                      ))}
                  </details>
                ),
              )}
              {points.data?.total === 0 && (
                <p>За цими фільтрами точок немає.</p>
              )}
              <button
                disabled={!offset}
                onClick={() => setOffset(offset - 100)}
              >
                Назад
              </button>{" "}
              {offset} / {points.data?.total ?? 0}{" "}
              <button
                disabled={offset + 100 >= (points.data?.total ?? 0)}
                onClick={() => setOffset(offset + 100)}
              >
                Далі
              </button>
            </>
          )}
          {tab === "Ваги" &&
            (["categories", "types"] as const).map((key) => (
              <fieldset key={key}>
                <legend>{key === "types" ? "Типи" : "Категорії"}</legend>
                {config[key].map((name) => (
                  <label key={name}>
                    {name}
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={draft[key][name] ?? 1}
                      onChange={(e) => {
                        const n = e.target.valueAsNumber;
                        if (Number.isFinite(n) && n >= 0 && n <= 5)
                          setDraft({
                            ...draft,
                            [key]: { ...draft[key], [name]: n },
                          });
                      }}
                    />
                  </label>
                ))}
              </fieldset>
            ))}
        </aside>
      </section>
    </main>
  );
}
