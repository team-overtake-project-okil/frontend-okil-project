import type { ComponentPropsWithoutRef } from "react";
import styles from "./Title.module.scss";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface TitleProps extends ComponentPropsWithoutRef<"h1"> {
  level?: HeadingLevel;
}

/** Semantic heading with the shared design system typography. */
export function Title({ level = 2, className, ...props }: TitleProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag
      {...props}
      className={[styles.title, styles[`level${level}`], className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
