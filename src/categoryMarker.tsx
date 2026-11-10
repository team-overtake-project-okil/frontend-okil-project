import { renderToStaticMarkup } from "react-dom/server";
import {
  HeartIcon,
  AcademicCapIcon,
  ShoppingBagIcon,
  TruckIcon,
  TrophyIcon,
  MusicalNoteIcon,
  CakeIcon,
  ShieldCheckIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

const categories = {
  health: { icon: HeartIcon, color: "#b53f52", label: "Здоров’я" },
  study: { icon: AcademicCapIcon, color: "#4562a8", label: "Освіта" },
  daily: { icon: ShoppingBagIcon, color: "#986313", label: "Щоденні потреби" },
  mobility: { icon: TruckIcon, color: "#286b9a", label: "Транспорт" },
  sport: { icon: TrophyIcon, color: "#397648", label: "Спорт" },
  enjoyment: { icon: MusicalNoteIcon, color: "#8150a0", label: "Дозвілля" },
  food: { icon: CakeIcon, color: "#b65329", label: "Харчування" },
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
