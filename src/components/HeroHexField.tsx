import { useEffect, useRef } from "react";
import neighborhood from "../assets/hero-neighborhood.svg?raw";
import { comfortPalette } from "../lib/palette";

export function HeroHexField() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cells = [
      ...host.querySelectorAll<SVGPolygonElement>(".hex-fill"),
    ].map((node) => {
      const points = node
        .getAttribute("points")!
        .split(" ")
        .map((p) => p.split(",").map(Number));
      return {
        node,
        x: points.reduce((s, p) => s + p[0], 0) / 6,
        y: points.reduce((s, p) => s + p[1], 0) / 6,
      };
    });
    const palette = comfortPalette.map((color) =>
      [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)),
    );
    let phase = 0;
    const animate = () => {
      if (media.matches || document.hidden || !host.getClientRects().length)
        return;
      phase += 0.65;
      cells.forEach(({ node, x, y }) => {
        const value = Math.max(
          0,
          Math.min(
            4,
            2 +
              Math.sin(x / 125 + phase) * 1.2 +
              Math.cos(y / 140 - phase * 0.7) * 0.8,
          ),
        );
        const a = Math.floor(value),
          b = Math.min(4, a + 1),
          t = value - a;
        node.style.fill = `rgb(${palette[a].map((v, i) => Math.round(v + (palette[b][i] - v) * t)).join(",")})`;
      });
    };
    const timer = window.setInterval(animate, 3800);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div
      ref={ref}
      className="hero-hex-field"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: neighborhood }}
    />
  );
}
