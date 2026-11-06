# Shared styles (issue #75)

`main.scss` loads global typography once, from `src/main.tsx`.
Keep Tailwind directives in `App.css`; do not import that file into Sass.

- `abstracts/_variables.scss`: shared font, theme references, breakpoints and heading scale.
- `abstracts/_mixins.scss`: heading typography and mobile/tablet media queries.
- `base/_typography.scss`: low-specificity global font setup.

Import abstracts with `@use` in component SCSS modules. They emit no global CSS.
Theme colors reference the existing CSS custom properties, with fallback values.

```tsx
import { Title } from "../components/Title/Title";

<Title level={1} id="page-title">Ваш окіл</Title>
```

`level` selects the semantic HTML element and its visual scale (1–6, default 2).
Native heading attributes and `className` are supported. Keep heading levels in
document order; choose the level based on content hierarchy.

Run `bun run storybook` to inspect all six levels, a long responsive heading,
and the interactive playground. Run `bun run build-storybook` for a static build.

The heading scale is an initial scale based on the current UI; confirm it with
the team before replacing existing section-specific typography. Existing page
selectors remain in `App.css` and may override component styles when adopted.

Text, paragraph, caption and label components belong to issue #76 and should
reuse these abstracts rather than duplicate them.
