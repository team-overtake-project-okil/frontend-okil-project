import { useState } from "react";
import {
  AcademicCapIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { mobilityPresets } from "../../lib/mobilityPresets";
import { useAnimatedDialog } from "../../lib/useAnimatedDialog";

interface MobilityPresetPickerProps {
  selectedPresetId: string | null;
  hasPlaces: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function MobilityPresetPicker({
  selectedPresetId,
  hasPlaces,
  onSelect,
  onClose,
}: MobilityPresetPickerProps) {
  const { dialogRef, closeDialog } = useAnimatedDialog(true);
  const [choice, setChoice] = useState(selectedPresetId);
  const preset = mobilityPresets.find((item) => item.id === choice);
  return (
    <dialog
      ref={dialogRef}
      className="anchor-editor anchor-preset-picker"
      aria-labelledby="preset-picker-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog(onClose);
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
          closeDialog(onClose);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Tab")
          event.stopPropagation();
      }}
    >
      <div className="anchor-editor-heading">
        <div>
          <h3 id="preset-picker-title">Куди ви найчастіше їздите?</h3>
          <p>Оберіть стартовий набір або додайте свої місця.</p>
        </div>
        <button
          type="button"
          className="anchor-icon"
          aria-label="Закрити вибір набору"
          onClick={() => closeDialog(onClose)}
        >
          <XMarkIcon />
        </button>
      </div>
      <div className="anchor-preset-body">
        <div
          className="anchor-preset-options"
          role="group"
          aria-label="Набори місць"
        >
          {mobilityPresets.map((item) => {
            const Icon =
              item.kind === "study"
                ? AcademicCapIcon
                : item.kind === "city"
                  ? BuildingOffice2Icon
                  : GlobeAltIcon;
            return (
              <button
                key={item.id}
                type="button"
                className="anchor-preset-option"
                aria-pressed={choice === item.id}
                onClick={() => setChoice(item.id)}
              >
                <Icon className="anchor-preset-symbol" aria-hidden="true" />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                {choice === item.id && (
                  <CheckIcon
                    className="anchor-preset-check"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
          <button
            type="button"
            className="anchor-preset-option anchor-preset-custom"
            aria-pressed={choice === "custom"}
            onClick={() => setChoice("custom")}
          >
            <AdjustmentsHorizontalIcon
              className="anchor-preset-symbol"
              aria-hidden="true"
            />
            <span>
              <strong>Власний вибір</strong>
              <small>
                {hasPlaces
                  ? "Залиште поточні точки та налаштуйте під себе"
                  : "Дім, робота та інші важливі для вас місця"}
              </small>
            </span>
            {choice === "custom" && (
              <CheckIcon className="anchor-preset-check" aria-hidden="true" />
            )}
          </button>
        </div>
        {preset && (
          <div className="anchor-preset-preview">
            <h4>Місця в наборі · {preset.points.length}</h4>
            <ul>
              {preset.points.map((point) => (
                <li key={point.id}>
                  <strong>{point.label}</strong>
                  <span>{point.address}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="anchor-preset-help">
          {hasPlaces && preset
            ? "Цей набір замінить поточні точки. Після вибору їх можна змінити."
            : "Кожну точку можна змінити чи видалити, а також додати свої."}
        </p>
      </div>
      <div className="anchor-editor-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => closeDialog(onClose)}
        >
          Назад
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!choice}
          onClick={() => {
            if (choice) closeDialog(() => onSelect(choice));
          }}
        >
          {choice === "custom" ? "Налаштувати місця" : "Використати набір"}
        </button>
      </div>
    </dialog>
  );
}
