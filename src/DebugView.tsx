import { useState } from "react";
import {
  XMarkIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Switch } from "./components/ui/switch";
export default function DebugView({
  categories,
  types,
  category,
  pointType,
  showAll,
  loading,
  count,
  error,
  onCategory,
  onType,
  onAll,
  onClose,
}: {
  categories: [string, string][];
  types: string[];
  category: string;
  pointType: string;
  showAll: boolean;
  loading: boolean;
  count: number;
  error: string;
  onCategory: (value: string) => void;
  onType: (value: string) => void;
  onAll: (value: boolean) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <aside className="debug-view-panel debug-surface" aria-label="Вигляд карти">
      <div className="debug-panel-heading">
        <div>
          <p className="debug-eyebrow">Налаштування карти</p>
          <h2>Вигляд</h2>
        </div>
        <button
          className="debug-close"
          onClick={onClose}
          aria-label="Закрити вигляд"
        >
          <XMarkIcon />
        </button>
      </div>
      <div className="debug-view-body">
        <h3>Категорія</h3>
        <div
          className="debug-category-buttons"
          role="group"
          aria-label="Категорія"
        >
          <button
            aria-pressed={!category}
            onClick={() => {
              onCategory("");
              setQuery("");
            }}
          >
            Усі категорії
          </button>
          {categories.map(([key, title]) => (
            <button
              key={key}
              aria-pressed={category === key}
              onClick={() => {
                onCategory(key);
                setQuery("");
              }}
            >
              {title}
            </button>
          ))}
        </div>
        <div className="debug-layer-switch">
          <div>
            <h3>Усі POI на карті</h3>
            <p>За обраною категорією та типом</p>
          </div>
          <Switch
            aria-label="Усі POI на карті"
            checked={showAll}
            onCheckedChange={onAll}
          />
        </div>
        {showAll && (
          <p role="status" className="debug-layer-status">
            {loading ? "Завантаження POI…" : `${count} POI на карті`}
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <h3>Тип POI</h3>
        <label className="debug-type-search">
          <MagnifyingGlassIcon />
          <input
            aria-label="Знайти тип POI"
            placeholder="Знайти тип, наприклад pharmacy"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="debug-type-options" role="group" aria-label="Тип POI">
          <button aria-pressed={!pointType} onClick={() => onType("")}>
            Усі типи{!pointType && <CheckIcon />}
          </button>
          {types
            .filter((type) => type.toLowerCase().includes(query.toLowerCase()))
            .map((type) => (
              <button
                key={type}
                aria-pressed={pointType === type}
                onClick={() => onType(type)}
              >
                {type}
                {pointType === type && <CheckIcon />}
              </button>
            ))}
        </div>
        {types.every(
          (type) => !type.toLowerCase().includes(query.toLowerCase()),
        ) && <p className="debug-muted">Типів за цим запитом немає.</p>}
      </div>
    </aside>
  );
}
