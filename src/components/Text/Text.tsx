import type { ComponentPropsWithoutRef } from "react";
import styles from "./Text.module.scss";

export type TextVariant = "body" | "secondary" | "caption" | "label";
export type TextColor = "default" | "muted" | "primary";
export type TextWeight = "regular" | "medium" | "semibold" | "bold";
export type TextAlign = "left" | "center" | "right" | "justify";

interface TextStyleProps {
  variant?: TextVariant;
  color?: TextColor;
  weight?: TextWeight;
  align?: TextAlign;
}

export interface TextProps
  extends Omit<ComponentPropsWithoutRef<"span">, "color">, TextStyleProps {}

export interface ParagraphProps
  extends Omit<ComponentPropsWithoutRef<"p">, "color">, TextStyleProps {}

function classNames(
  variant: TextVariant,
  color: TextColor,
  weight: TextWeight,
  align: TextAlign,
  className?: string,
) {
  return [
    styles.text,
    styles[variant],
    styles[`color-${color}`],
    styles[`weight-${weight}`],
    styles[`align-${align}`],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

function resolveColor(variant: TextVariant, color?: TextColor): TextColor {
  return (
    color ??
    (variant === "secondary" || variant === "caption" ? "muted" : "default")
  );
}

/** Inline text with reusable design-system variants. */
export function Text({
  variant = "body",
  color,
  weight = variant === "label" ? "semibold" : "regular",
  align = "left",
  className,
  ...props
}: TextProps) {
  return (
    <span
      {...props}
      className={classNames(
        variant,
        resolveColor(variant, color),
        weight,
        align,
        className,
      )}
    />
  );
}

/** Block-level paragraph using the same typography and color variants. */
export function Paragraph({
  variant = "body",
  color,
  weight = variant === "label" ? "semibold" : "regular",
  align = "left",
  className,
  ...props
}: ParagraphProps) {
  return (
    <p
      {...props}
      className={classNames(
        variant,
        resolveColor(variant, color),
        weight,
        align,
        className,
      )}
    />
  );
}
