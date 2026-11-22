import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { CategoryWeightSlider } from "./TogglerCard";
import { useState } from "react";
import {
  MapPinIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AddressSearch } from "../address/AddressSearch";
import { MAX_ANCHORS, type MobilityAnchor } from "../../lib/mobilityAnchors";
import type { AddressSuggestion } from "../../services/geocoding";
import { Switch } from "../ui/switch";
import { MobilityPresetPicker } from "./MobilityPresetPicker";
import { mobilityPresets } from "../../lib/mobilityPresets";
import { useAnimatedDialog } from "../../lib/useAnimatedDialog";
import "./AnchorPoints.css";

export interface AnchorPointsProps {
  mobilityValue?: number;
  onMobilityValueChange?: (value: number) => void;
  personalRoutesEnabled: boolean;
  onPersonalRoutesChange: (enabled: boolean) => void;
  selectedPresetId: string | null;
  presetModified: boolean;
  onSelectPreset: (id: string) => void;
  anchors: MobilityAnchor[];
  onSaveAnchor: (anchor: MobilityAnchor) => void;
  onRemoveAnchor: (id: string) => void;
  pickingAnchor: string | null;
  onPickAnchor: (id: string | null, label?: string) => void;
}

export function AnchorPoints({
  mobilityValue = 20,
  onMobilityValueChange,
  personalRoutesEnabled,
  onPersonalRoutesChange,
  selectedPresetId,
  presetModified,
  onSelectPreset,
  anchors,
  onSaveAnchor,
  onRemoveAnchor,
  pickingAnchor,
  onPickAnchor,
}: AnchorPointsProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [choosingPreset, setChoosingPreset] = useState(false);
  const [enablingWithPicker, setEnablingWithPicker] = useState(false);
  const presetTitle =
    selectedPresetId === "custom"
      ? "Власний вибір"
      : mobilityPresets.find((preset) => preset.id === selectedPresetId)?.title;
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState<AddressSuggestion | null>(null);
  const [error, setError] = useState("");
  const { dialogRef: editorRef, closeDialog } = useAnimatedDialog(
    editing !== null && pickingAnchor === null,
  );
  const current = anchors.find((point) => point.id === editing);
  const start = (point?: MobilityAnchor) => {
    onPickAnchor(null);
    setEditing(point?.id ?? "new");
    setLabel(point?.label ?? "");
    setAddress(null);
    setError("");
  };
  const close = () => {
    setEditing(null);
    onPickAnchor(null);
    setError("");
  };
  const save = () => {
    const location = address ?? current;
    if (!location) {
      setError("Знайдіть адресу або оберіть місце на карті.");
      return;
    }
    const point: MobilityAnchor = {
      id: current?.id ?? crypto.randomUUID(),
      label:
        label.trim() || address?.address || current?.label || "Місце на карті",
      lat: location.lat,
      lng: location.lng,
      source: address ? "address" : (current?.source ?? "address"),
      address: address?.address ?? current?.address,
    };
    closeDialog(() => {
      onSaveAnchor(point);
      close();
    });
  };
  return (
    <section
      className={`anchor-section ${personalRoutesEnabled ? "is-enabled" : ""}`}
      aria-labelledby="anchor-heading"
    >
      <div
        className={`anchor-heading ${!personalRoutesEnabled ? "opacity-50" : ""}`}
      >
        <div>
          <h3 id="anchor-heading" className="weight-category-title">
            Мобільність
          </h3>
          <p
            className="weight-category-description text-xs"
            id="anchor-description"
          >
            Маршрути до місць
          </p>
        </div>
        <div className="anchor-heading-controls">
          {!personalRoutesEnabled && anchors.length > 0 && (
            <TooltipProvider delay={300}>
              <Tooltip>
                <TooltipTrigger
                  className="anchor-saved"
                  aria-label="Ваші місця збережено"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 3h12l4 4v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2Z"
                    />
                    <path strokeLinejoin="round" d="M7 3v6h10V3M7 21v-8h10v8" />
                    <path strokeLinecap="round" d="M14 5v2" />
                  </svg>
                </TooltipTrigger>
                <TooltipContent>Ваші місця збережено</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Switch
            checked={personalRoutesEnabled}
            onCheckedChange={(enabled) => {
              onPersonalRoutesChange(enabled);
              if (
                enabled &&
                selectedPresetId === null &&
                anchors.length === 0
              ) {
                setEnablingWithPicker(true);
                setChoosingPreset(true);
              }
            }}
            aria-labelledby="anchor-heading"
            aria-describedby="anchor-description"
            className="anchor-feature-switch"
          />
        </div>
      </div>
      <CategoryWeightSlider
        value={mobilityValue}
        disabled={!personalRoutesEnabled}
        title="Мобільність"
        onValueChange={(value) => onMobilityValueChange?.(value)}
      />
      {personalRoutesEnabled ? (
        <div className="anchor-feature-content">
          {choosingPreset && (
            <MobilityPresetPicker
              selectedPresetId={selectedPresetId}
              hasPlaces={anchors.length > 0}
              onClose={() => {
                setChoosingPreset(false);
                if (enablingWithPicker) onPersonalRoutesChange(false);
                setEnablingWithPicker(false);
              }}
              onSelect={(id) => {
                onSelectPreset(id);
                setEnablingWithPicker(false);
                setChoosingPreset(false);
                setEditing(null);
                onPickAnchor(null);
              }}
            />
          )}
          <div className="anchor-locations-heading">
            <button
              type="button"
              className="anchor-preset-trigger"
              onClick={() => setChoosingPreset(true)}
              aria-label={
                presetTitle ? `Змінити набір: ${presetTitle}` : "Обрати набір"
              }
              title={
                presetModified
                  ? "Набір зі змінами · змінити набір"
                  : "Змінити набір місць"
              }
            >
              <span>
                {presetTitle ?? "Обрати набір"}
                {presetModified && (
                  <span className="anchor-preset-modified"> (змінено)</span>
                )}
              </span>
              <PencilSquareIcon aria-hidden="true" />
            </button>
            <span
              className="anchor-count"
              aria-label={`${anchors.length} із ${MAX_ANCHORS} місць`}
            >
              {anchors.length}/{MAX_ANCHORS}
            </span>
          </div>
          {anchors.length === 0 && editing === null && (
            <div className="anchor-empty">
              <MapPinIcon aria-hidden="true" />
              <strong>Ваші місця — ваші маршрути</strong>
              <p>
                Почніть із дому чи роботи. Знайдіть адресу або оберіть точку на
                карті.
              </p>
            </div>
          )}
          <ul className="anchor-list">
            {anchors.map((point) => (
              <li key={point.id}>
                <span className="anchor-pin">
                  <MapPinIcon aria-hidden="true" />
                </span>
                <div className="anchor-details">
                  <strong>{point.label}</strong>
                  <span>
                    {point.address ??
                      (point.source === "preset"
                        ? "З обраного набору"
                        : point.source === "default"
                          ? "Початкова точка"
                          : point.source === "map"
                            ? "Обрано на карті"
                            : "Обрано за адресою")}
                  </span>
                </div>
                <button
                  type="button"
                  className="anchor-icon"
                  aria-label={`Редагувати ${point.label}`}
                  onClick={() => start(point)}
                >
                  <PencilSquareIcon />
                </button>
                <button
                  type="button"
                  className="anchor-icon"
                  aria-label={`Видалити ${point.label}`}
                  title="Видалити місце"
                  onClick={() => {
                    onRemoveAnchor(point.id);
                    if (editing === point.id) close();
                  }}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
          {pickingAnchor !== null ? (
            <div className="anchor-picking" role="status">
              <MapPinIcon />
              <p>Натисніть на ділянку карти, де розташоване ваше місце.</p>
              <button type="button" onClick={close}>
                Скасувати
              </button>
            </div>
          ) : editing !== null ? (
            <dialog
              ref={editorRef}
              className="anchor-editor"
              aria-labelledby="anchor-editor-title"
              onCancel={(event) => {
                event.preventDefault();
                closeDialog(close);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" || event.key === "Tab")
                  event.stopPropagation();
              }}
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                if (
                  event.clientX < bounds.left ||
                  event.clientX > bounds.right ||
                  event.clientY < bounds.top ||
                  event.clientY > bounds.bottom
                )
                  closeDialog(close);
              }}
            >
              <div className="anchor-editor-heading">
                <div>
                  <h3 id="anchor-editor-title">
                    {current ? "Редагувати місце" : "Нове місце"}
                  </h3>
                  <p>Дім, робота чи місце, куди ви часто їздите.</p>
                </div>
                <button
                  className="anchor-icon"
                  type="button"
                  aria-label="Закрити редактор місця"
                  onClick={() => closeDialog(close)}
                >
                  <XMarkIcon />
                </button>
              </div>
              <label className="anchor-name">
                Назва місця <span>необов’язково</span>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Наприклад, робота або дім"
                  maxLength={100}
                  autoFocus
                />
              </label>
              <AddressSearch
                onLocationChange={setAddress}
                selectedAddress={address}
              />
              {error && (
                <p role="alert" className="anchor-error">
                  {error}
                </p>
              )}
              <div className="anchor-editor-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    closeDialog(() => {
                      setEditing(null);
                      onPickAnchor(current?.id ?? "new", label.trim());
                    })
                  }
                >
                  <MapPinIcon />
                  На карті
                </button>
                <button type="button" className="primary-button" onClick={save}>
                  {current ? "Зберегти" : "Додати"}
                </button>
              </div>
            </dialog>
          ) : (
            <button
              type="button"
              className="anchor-add"
              disabled={anchors.length >= MAX_ANCHORS}
              onClick={() => start()}
            >
              <PlusIcon />
              {anchors.length >= MAX_ANCHORS
                ? "Додано всі 5 місць"
                : anchors.length === 0
                  ? "Додати перше місце"
                  : "Додати місце"}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
