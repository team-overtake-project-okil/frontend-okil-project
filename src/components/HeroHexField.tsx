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
    let visible = false;
    let phase = 0;
    let cursor = 0;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(host);
    const animate = () => {
      if (media.matches || document.hidden || !visible || !cells.length) return;
      const seed = cells[(cursor * 37) % cells.length];
      cursor++;
      const neighbors = cells
        .map((cell) => ({
          ...cell,
          distance: Math.hypot(cell.x - seed.x, cell.y - seed.y),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 7);
      const tone = comfortPalette[phase % comfortPalette.length];
      phase++;
      neighbors.forEach(({ node }) => {
        node.style.fill = tone;
      });
    };
    const timer = window.setInterval(animate, 4200);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
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
