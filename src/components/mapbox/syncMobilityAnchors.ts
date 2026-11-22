import mapboxgl from "mapbox-gl";
import type { MobilityAnchor } from "../../lib/mobilityAnchors";
import { anchorMarkerSize, groupAnchorPositions } from "./mobilityAnchorLayout";

type AnchorMarker = {
  marker: mapboxgl.Marker;
  element: HTMLButtonElement;
  visual: HTMLSpanElement;
  label: HTMLSpanElement;
  points: readonly MobilityAnchor[];
  animation?: Animation;
};
type LabelRect = { left: number; right: number; top: number; bottom: number };
const overlaps = (a: LabelRect, b: LabelRect) =>
  a.left < b.right + 6 &&
  a.right > b.left - 6 &&
  a.top < b.bottom + 6 &&
  a.bottom > b.top - 6;

export function mountMobilityAnchors(
  map: mapboxgl.Map,
  anchors: readonly MobilityAnchor[],
) {
  const markers = new Map<string, AnchorMarker>();
  const retiring = new Set<AnchorMarker>();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeKey: string | null = null;

  const remove = (item: AnchorMarker) => {
    item.animation?.cancel();
    item.marker.remove();
    retiring.delete(item);
  };

  const animate = (
    item: AnchorMarker,
    frames: Keyframe[],
    duration: number,
    onFinish?: () => void,
  ) => {
    item.animation?.cancel();
    if (reducedMotion.matches) {
      onFinish?.();
      return;
    }
    const animation = item.visual.animate(frames, {
      duration,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "backwards",
    });
    item.animation = animation;
    animation.onfinish = () => {
      if (item.animation === animation) item.animation = undefined;
      onFinish?.();
    };
  };

  const update = () => {
    const projected = anchors.map((anchor) => ({
      anchor,
      ...map.project([anchor.lng, anchor.lat]),
    }));
    const groups = groupAnchorPositions(projected);
    const previousMarkers = [...markers.values()];
    const entering: AnchorMarker[] = [];
    const visibleKeys = new Set<string>();
    const zoom = map.getZoom();
    const labels: LabelRect[] = [];
    const dots: LabelRect[] = [];
    const bounds = map.getContainer().getBoundingClientRect();
    for (const group of groups) {
      const key = group
        .map((point) => point.anchor.id)
        .sort()
        .join("|");
      visibleKeys.add(key);
      const count = group.length;
      const size = anchorMarkerSize(zoom, count);
      const lng =
        group.reduce((sum, point) => sum + point.anchor.lng, 0) / count;
      const lat =
        group.reduce((sum, point) => sum + point.anchor.lat, 0) / count;
      let item = markers.get(key);
      if (!item) {
        const element = document.createElement("button");
        element.type = "button";
        element.className = `mobility-anchor-marker${count > 1 ? " is-cluster" : ""}`;
        const visual = document.createElement("span");
        visual.className = "mobility-anchor-visual";
        const label = document.createElement("span");
        label.className = "mobility-anchor-label";
        label.textContent = group.map((point) => point.anchor.label).join("\n");
        label.setAttribute("aria-hidden", "true");
        const dot = document.createElement("span");
        dot.className = "mobility-anchor-dot";
        dot.setAttribute("aria-hidden", "true");
        if (count > 1) dot.textContent = String(count);
        visual.append(label, dot);
        element.append(visual);
        element.setAttribute(
          "aria-label",
          count > 1
            ? `${count} місця поруч: ${group.map((point) => point.anchor.label).join(", ")}. Наблизити`
            : group[0].anchor.label,
        );
        const marker = new mapboxgl.Marker({ element, anchor: "center" })
          .setLngLat([lng, lat])
          .addTo(map);
        item = {
          marker,
          element,
          visual,
          label,
          points: group.map((point) => point.anchor),
        };
        markers.set(key, item);
        entering.push(item);
        element.addEventListener("mouseenter", () => {
          activeKey = key;
          update();
        });
        element.addEventListener("mouseleave", () => {
          if (document.activeElement !== element) activeKey = null;
          update();
        });
        element.addEventListener("focus", () => {
          activeKey = key;
          update();
        });
        element.addEventListener("blur", () => {
          activeKey = null;
          update();
        });
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          const places = markers.get(key)?.points;
          if (!places) return;
          if (places.length > 1) {
            const area = new mapboxgl.LngLatBounds();
            places.forEach((point) => area.extend([point.lng, point.lat]));
            if (area.getNorthEast().distanceTo(area.getSouthWest()) < 1) {
              map.easeTo({
                center: [lng, lat],
                zoom: Math.min(18, map.getZoom() + 2),
                duration: 700,
              });
            } else {
              map.fitBounds(area, { padding: 100, maxZoom: 17, duration: 700 });
            }
          } else {
            map.easeTo({
              center: [lng, lat],
              zoom: Math.max(15, map.getZoom()),
              duration: 700,
            });
          }
        });
      }
      item.element.style.setProperty("--anchor-size", `${size}px`);
      item.marker.setLngLat([lng, lat]);
      const point = map.project([lng, lat]);
      dots.push({
        left: point.x - size / 2,
        right: point.x + size / 2,
        top: point.y - size / 2,
        bottom: point.y + size / 2,
      });
    }
    for (const item of entering) {
      const related = previousMarkers.filter((previous) =>
        previous.points.some((point) =>
          item.points.some((next) => next.id === point.id),
        ),
      );
      const target = map.project(item.marker.getLngLat());
      const origin = related.length
        ? map.project(related[0].marker.getLngLat())
        : target;
      const dx = origin.x - target.x;
      const dy = origin.y - target.y;
      animate(
        item,
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(${related.length ? 0.55 : 0.8})`,
            opacity: 0,
          },
          { opacity: 1, offset: 0.4 },
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
        ],
        380,
      );
    }
    for (const [key, item] of markers) {
      if (!visibleKeys.has(key)) {
        markers.delete(key);
        item.element.classList.add("is-exiting");
        item.element.classList.remove("is-label-visible");
        item.element.inert = true;
        item.element.setAttribute("aria-hidden", "true");
        retiring.add(item);
        const next = [...markers.entries()].find(
          ([nextKey, next]) =>
            visibleKeys.has(nextKey) &&
            next.points.some((point) =>
              item.points.some((previous) => previous.id === point.id),
            ),
        )?.[1];
        const from = map.project(item.marker.getLngLat());
        const to =
          next && next.points.length > item.points.length
            ? map.project(next.marker.getLngLat())
            : from;
        const transform = getComputedStyle(item.visual).transform;
        const opacity = getComputedStyle(item.visual).opacity;
        animate(
          item,
          [
            { transform, opacity },
            {
              transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(0.45)`,
              opacity: 0,
            },
          ],
          220,
          () => remove(item),
        );
      }
    }
    if (activeKey && !visibleKeys.has(activeKey)) activeKey = null;
    const visibleLabels = new Set<string>();
    for (const [key, item] of markers) {
      if (activeKey) {
        if (key === activeKey) visibleLabels.add(key);
        continue;
      }
      if (zoom < 13.5 || item.points.length > 1) continue;
      const point = map.project(item.marker.getLngLat());
      const size = anchorMarkerSize(zoom, item.points.length);
      const box = {
        width: item.label.offsetWidth,
        height: item.label.offsetHeight,
      };
      const rect = {
        left: point.x - box.width / 2,
        right: point.x + box.width / 2,
        top: point.y - size / 2 - 8 - box.height,
        bottom: point.y - size / 2 - 8,
      };
      if (
        rect.left < 8 ||
        rect.right > bounds.width - 8 ||
        rect.top < 8 ||
        labels.some((other) => overlaps(rect, other)) ||
        dots.some((other) => overlaps(rect, other))
      )
        continue;
      labels.push(rect);
      visibleLabels.add(key);
    }
    for (const [key, item] of markers) {
      item.element.classList.toggle("is-label-visible", visibleLabels.has(key));
    }
  };

  update();
  map.on("move", update);
  map.on("resize", update);
  const onMotionPreferenceChange = () => {
    markers.forEach((item) => item.animation?.cancel());
    [...retiring].forEach(remove);
    update();
  };
  reducedMotion.addEventListener("change", onMotionPreferenceChange);
  return () => {
    map.off("move", update);
    map.off("resize", update);
    reducedMotion.removeEventListener("change", onMotionPreferenceChange);
    markers.forEach(remove);
    [...retiring].forEach(remove);
    markers.clear();
  };
}
