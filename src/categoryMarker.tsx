import { renderToStaticMarkup } from "react-dom/server";
import {
  HeartIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

function busIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="5" y="3" width="14" height="16" rx="3" />
      <path d="M5 11h14M12 3v8M7 19v2m10-2v2M3 7v5m18-5v5" />
      <circle cx="8.5" cy="15.5" r="1" />
      <circle cx="15.5" cy="15.5" r="1" />
    </svg>
  );
}
function cutleryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M19 3c-3 2-4 6-4 10h4m0-10v18" />
    </svg>
  );
}
function dumbbellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 12h8M2 10v4m20-4v4" />
      <rect x="4" y="7" width="4" height="10" rx="1" />
      <rect x="16" y="7" width="4" height="10" rx="1" />
    </svg>
  );
}
function fullBasketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 10h18l-2 10H5L3 10ZM2 10h20M7 10l2-7h3l-1 7M14 10V6a2 2 0 0 1 4 0v4M8 14v3m4-3v3m4-3v3" />
      <path d="m16 4 1-2" />
    </svg>
  );
}
function theatreMasksIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 3c3 1.5 6 1.5 9 0v6c0 4-2.5 6-4.5 7C4.5 15 2 13 2 9V3Z" />
      <path d="M4.5 7h1m3 0h1M4.5 10c1 2 3 2 4 0" />
      <path d="M13 8c3 1.5 6 1.5 9 0v6c0 4-2.5 6-4.5 7-2-1-4.5-3-4.5-7V8Z" />
      <path d="M15.5 12h1m3 0h1M15.5 17c1-2 3-2 4 0" />
    </svg>
  );
}
const categories = {
  health: { icon: HeartIcon, color: "#b53f52", label: "Здоров’я" },
  study: { icon: AcademicCapIcon, color: "#4562a8", label: "Освіта" },
  daily: { icon: fullBasketIcon, color: "#986313", label: "Щоденні потреби" },
  mobility: { icon: busIcon, color: "#286b9a", label: "Транспорт" },
  sport: { icon: dumbbellIcon, color: "#397648", label: "Спорт" },
  enjoyment: { icon: theatreMasksIcon, color: "#8150a0", label: "Дозвілля" },
  food: { icon: cutleryIcon, color: "#b65329", label: "Харчування" },
  security: { icon: ShieldCheckIcon, color: "#36605e", label: "Безпека" },
};

// Markup contains only the imported icon, never data from a point record.
const icons = Object.fromEntries(
  Object.entries(categories).map(([key, value]) => [
    key,
    renderToStaticMarkup(
      <value.icon width={19} height={19} aria-hidden="true" />,
    ),
  ]),
);
const fallback = renderToStaticMarkup(
  <MapPinIcon width={19} height={19} aria-hidden="true" />,
);

export function categoryMarker(category?: string, selected = false) {
  const element = document.createElement("div");
  const config = categories[category as keyof typeof categories];
  element.className =
    "debug-category-marker" + (selected ? " is-selected" : "");
  element.style.setProperty("--marker-color", config?.color || "#53645c");
  element.innerHTML = icons[category || ""] || fallback;
  element.title = config?.label || "Точка";
  return element;
}
