import { useEffect, useRef, useState } from "react";
import { isValidCell } from "h3-js";
import {
  ChevronDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AddressSearch } from "./components/address/AddressSearch";
import { fetcher } from "./lib/fetcher";
import type { Dot } from "./DebugMap";
import { coordsToH3 } from "./lib/h3";

const modes = [
  ["address", "Адреса", "Вулиця або адреса у Львові"],
  ["poi", "POI ID", "Внутрішній ID або ID джерела"],
  ["stop", "Зупинка ID", "Пошук транспортної зупинки"],
  ["coordinates", "Координати", "Широта, довгота"],
  ["h3", "H3 ID", "Ідентифікатор гексагона"],
] as const;
type Match = Dot & { source: string; external_id: string };
export default function DebugSearch({
  onSelect,
  auth,
  onPointSelect,
}: {
  auth: string;
  onPointSelect: (point: Dot) => void;
  onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState("address");
  const [menuOpen, setMenuOpen] = useState(false);
  const [value, setValue] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!host.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      request.current?.abort();
    };
  }, []);
  async function submit() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError("");
    setMatches([]);
    setBusy(true);
    try {
      if (mode === "poi" || mode === "stop") {
        const result = await fetcher(
          `/debug/points/find?id=${encodeURIComponent(value.trim())}&kind=${mode}`,
          { headers: { Authorization: auth }, signal: controller.signal },
        );
        if (!result.rows.length) throw new Error("POI з таким ID не знайдено");
        if (result.rows.length === 1) onPointSelect(result.rows[0]);
        else setMatches(result.rows);
      } else if (mode === "coordinates") {
        const parts = value
          .trim()
          .split(/[,;\s]+/)
          .filter(Boolean)
          .map(Number);
        if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n)))
          throw new Error(
            "Введіть широту та довготу, наприклад 49.8429, 24.0316",
          );
        onSelect(coordsToH3(parts[0], parts[1]));
      } else {
        if (!isValidCell(value.trim())) throw new Error("Некоректний H3 ID");
        onSelect(value.trim());
      }
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err instanceof Error ? err.message : "Помилка пошуку");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div
      className="debug-search-combo"
      ref={host}
      onKeyDown={(event) => {
        if (event.key === "Escape") setMenuOpen(false);
      }}
    >
      {mode === "address" ? (
        <AddressSearch
          onLocationChange={(point) => {
            if (point) onSelect(coordsToH3(point.lat, point.lng));
          }}
        />
      ) : (
        <form
          className="debug-search"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="debug-search-field">
            <MagnifyingGlassIcon aria-hidden="true" />
            <input
              aria-label={
                mode === "coordinates"
                  ? "Широта та довгота"
                  : mode === "h3"
                    ? "H3 ID"
                    : "ID точки"
              }
              placeholder={
                mode === "coordinates"
                  ? "49.8429, 24.0316"
                  : mode === "h3"
                    ? "Введіть H3 ID"
                    : "Введіть ID або external_id"
              }
              value={value}
              onChange={(event) => {
                request.current?.abort();
                setBusy(false);
                setValue(event.target.value);
                setError("");
                setMatches([]);
              }}
            />
            {value && (
              <button
                type="button"
                aria-label="Очистити пошук"
                onClick={() => {
                  request.current?.abort();
                  setValue("");
                  setError("");
                  setMatches([]);
                  setBusy(false);
                }}
              >
                <XMarkIcon />
              </button>
            )}
            <button aria-label="Знайти" type="submit" disabled={busy}>
              <ArrowRightIcon />
            </button>
          </div>
          {(busy || error || matches.length > 0) && (
            <div className="debug-search-results">
              {busy && <p role="status">Шукаємо…</p>}
              {error && <p role="alert">{error}</p>}
              {matches.map((point) => (
                <button
                  type="button"
                  key={point.kind + point.id}
                  onClick={() => {
                    onPointSelect(point);
                    setMatches([]);
                  }}
                >
                  {point.name || "Без назви"} · #{point.id} · {point.source} /{" "}
                  {point.external_id}
                </button>
              ))}
            </div>
          )}
        </form>
      )}
      <div className="debug-search-mode">
        <button
          type="button"
          className="debug-toolbar-button"
          aria-label="Пошук за"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {modes.find((item) => item[0] === mode)?.[1]}
          <ChevronDownIcon />
        </button>
        {menuOpen && (
          <div className="debug-mode-menu" role="menu" aria-label="Пошук за">
            {modes.map(([key, title, description]) => (
              <button
                key={key}
                type="button"
                role="menuitemradio"
                aria-checked={mode === key}
                onClick={() => {
                  request.current?.abort();
                  setMode(key);
                  setValue("");
                  setError("");
                  setMatches([]);
                  setBusy(false);
                  setMenuOpen(false);
                }}
              >
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                {mode === key && <CheckIcon />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
