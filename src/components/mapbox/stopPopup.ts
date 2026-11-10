// Пін зупинки, підказка з назвою і картка маршрутів на карті
import mapboxgl from "mapbox-gl";
import { groupStopRoutes } from "../../lib/stopRoutes";
import type { HexStopProperties } from "../../lib/useStopsByHex";

const STOP_COLOR = "#111111";

export function stopPinImage(): ImageData {
  const pixelRatio = 2;
  const size = 44;
  const canvas = document.createElement("canvas");
  canvas.width = size * pixelRatio;
  canvas.height = size * pixelRatio;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Stop pin canvas is unavailable.");
  ctx.scale(pixelRatio, pixelRatio);

  const cx = 22;
  const cy = 20;

  ctx.beginPath();
  ctx.ellipse(cx, 40, 7, 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2.25;
  ctx.strokeStyle = STOP_COLOR;
  ctx.stroke();

  const busX = cx - 11;
  const busY = cy - 5.2;
  ctx.fillStyle = STOP_COLOR;
  ctx.beginPath();
  ctx.roundRect(busX, busY, 22, 10, 2.6);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(busX + 1.6, busY + 1.6, 4.6, 3.4, 0.9);
  ctx.roundRect(busX + 7.4, busY + 1.6, 4.2, 3.4, 0.9);
  ctx.roundRect(busX + 12.8, busY + 1.6, 4.2, 3.4, 0.9);
  ctx.fill();

  ctx.fillStyle = STOP_COLOR;
  ctx.beginPath();
  ctx.arc(busX + 5.2, busY + 10, 1.85, 0, Math.PI * 2);
  ctx.arc(busX + 16.6, busY + 10, 1.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(busX + 5.2, busY + 10, 0.7, 0, Math.PI * 2);
  ctx.arc(busX + 16.6, busY + 10, 0.7, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function stopPopupNode(properties: HexStopProperties) {
  const root = document.createElement("div");
  root.className = "stop-popup-card";

  const head = document.createElement("div");
  head.className = "stop-popup-head";

  const title = document.createElement("div");
  title.className = "stop-popup-title";
  title.textContent = properties.name?.trim() || "Зупинка";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "stop-popup-close";
  close.setAttribute("aria-label", "Закрити");
  close.textContent = "✕";
  head.append(title, close);
  root.append(head);

  const groups = groupStopRoutes(properties.routes);
  if (groups.length === 0) return root;

  const showLabels = groups.length > 1 || groups[0].kind !== "other";
  const routes = document.createElement("div");
  routes.className = "stop-popup-routes";
  for (const group of groups) {
    if (showLabels) {
      const label = document.createElement("div");
      label.className = "stop-popup-kind";
      const name = document.createElement("span");
      name.textContent = group.label;
      const count = document.createElement("span");
      count.textContent = String(group.plates.length);
      label.append(name, count);
      routes.append(label);
    }
    for (const plate of group.plates) {
      const chip = document.createElement("span");
      chip.className =
        group.kind === "other"
          ? "stop-popup-route"
          : `stop-popup-route is-${group.kind}`;
      chip.textContent = plate;
      routes.append(chip);
    }
  }
  root.append(routes);
  return root;
}

export function stopNameTagNode(name: string | null) {
  const label = document.createElement("div");
  label.className = "stop-nametag-label";
  label.textContent = name?.trim() || "Зупинка";
  return label;
}

export type StopHit = {
  properties?: { id?: number | string } | null;
  geometry: { type: string; coordinates?: number[] };
};

export function pointCoordinates(
  geometry: StopHit["geometry"],
): [number, number] | null {
  if (geometry.type !== "Point" || !geometry.coordinates) return null;
  const [lng, lat] = geometry.coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

const popupPlacements = [
  { anchor: "top-right" as const, offset: [10, 12] as [number, number] },
  { anchor: "top-left" as const, offset: [10, 12] as [number, number] },
  { anchor: "bottom-right" as const, offset: [10, -12] as [number, number] },
  { anchor: "bottom-left" as const, offset: [10, -12] as [number, number] },
  { anchor: "right" as const, offset: [-12, 0] as [number, number] },
  { anchor: "left" as const, offset: [12, 0] as [number, number] },
];

export function openStopPopup(
  map: mapboxgl.Map,
  stop: HexStopProperties,
  coordinates: [number, number],
) {
  const canvasRect = map.getCanvas().getBoundingClientRect();
  const obstacles = [
    ...document.querySelectorAll(
      ".map-toolbar, .assessment-card, .map-legend, .route-status",
    ),
  ].flatMap((el) => {
    const style = getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    ) {
      return [];
    }
    const rect = el.getBoundingClientRect();
    return rect.width < 8 || rect.height < 8 ? [] : [rect];
  });
  const overlapArea = (popupEl: HTMLElement) => {
    const rect = popupEl.getBoundingClientRect();
    let area = 0;
    area += Math.max(0, canvasRect.left + 6 - rect.left) * rect.height;
    area += Math.max(0, rect.right - (canvasRect.right - 6)) * rect.height;
    area += Math.max(0, canvasRect.top + 6 - rect.top) * rect.width;
    area += Math.max(0, rect.bottom - (canvasRect.bottom - 6)) * rect.width;
    for (const obstacle of obstacles) {
      const width =
        Math.min(rect.right, obstacle.right) -
        Math.max(rect.left, obstacle.left);
      const height =
        Math.min(rect.bottom, obstacle.bottom) -
        Math.max(rect.top, obstacle.top);
      if (width > 0 && height > 0) area += width * height;
    }
    return area;
  };
  let best = popupPlacements[0];
  let bestArea = Number.POSITIVE_INFINITY;
  for (const placement of popupPlacements) {
    const trial = new mapboxgl.Popup({
      className: "stop-popup",
      closeButton: false,
      closeOnClick: false,
      anchor: placement.anchor,
      offset: placement.offset,
      maxWidth: "228px",
    })
      .setLngLat(coordinates)
      .setDOMContent(stopPopupNode(stop))
      .addTo(map);
    const trialEl = trial.getElement();
    const area = trialEl ? overlapArea(trialEl) : Number.POSITIVE_INFINITY;
    trial.remove();
    if (area < bestArea) {
      best = placement;
      bestArea = area;
    }
    if (area === 0) break;
  }
  const content = stopPopupNode(stop);
  const popup = new mapboxgl.Popup({
    className: "stop-popup",
    closeButton: false,
    closeOnClick: false,
    anchor: best.anchor,
    offset: best.offset,
    maxWidth: "228px",
  })
    .setLngLat(coordinates)
    .setDOMContent(content)
    .addTo(map);
  content
    .querySelector(".stop-popup-close")
    ?.addEventListener("click", () => popup.remove());
  return popup;
}
