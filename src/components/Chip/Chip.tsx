import type { CSSProperties } from "react";
import { Text } from "../Text/Text";
import styles from "./Chip.module.scss";

export interface ChipProps {
  label: string;
  color?: string;
  onRemove?: () => void;
  disabled?: boolean;
}

/** A single comparison hexagon, optionally removable. */
export function Chip({ label, color, onRemove, disabled = false }: ChipProps) {
  const content = (
    <>
      <svg className={styles.hexagon} viewBox="0 0 52 60" aria-hidden="true">
        <polygon points="26,2 50,16 50,44 26,58 2,44 2,16" />
      </svg>
      <Text className={styles.label} variant="caption" weight="bold">
        {label}
      </Text>
      {onRemove && (
        <span className={styles.removeIcon} aria-hidden="true">
          ×
        </span>
      )}
    </>
  );
  const style = { "--chip-color": color } as CSSProperties;

  return onRemove ? (
    <button
      type="button"
      className={styles.chip}
      style={style}
      onClick={onRemove}
      disabled={disabled}
      aria-label={`Прибрати ділянку ${label}`}
      title={`Прибрати ділянку ${label}`}
    >
      {content}
    </button>
  ) : (
    <span className={styles.chip} style={style}>
      {content}
    </span>
  );
}
