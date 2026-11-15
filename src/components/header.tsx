import { useEffect, useRef, useState } from "react";
import ArrowUpRight from "../icons/arrow-up-right";
import headerLogo from "../assets/header_logo.png";
import { scrollToSection } from "../lib/scroll";

const sectionIds = ["hero", "info", "map", "footer"] as const;

export const Header = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 4, width: 0, visible: false });

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const placePill = () => {
      const current = nav.querySelector<HTMLButtonElement>("[aria-current]");
      if (!current) {
        setPill((prev) => ({ left: prev.left, width: 0, visible: false }));
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const rect = current.getBoundingClientRect();
      setPill({
        left: rect.left - navRect.left,
        width: rect.width,
        visible: true,
      });
    };

    placePill();
    window.addEventListener("resize", placePill);
    return () => window.removeEventListener("resize", placePill);
  }, [activeSection]);

  useEffect(() => {
    const updateActiveSection = () => {
      const marker =
        (document.querySelector(".site-header")?.getBoundingClientRect()
          .height ?? 64) + 24;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;

      let current: string | null = atBottom ? "footer" : null;
      if (!atBottom) {
        for (const id of sectionIds) {
          const element = document.getElementById(id);
          if (element && element.getBoundingClientRect().top <= marker) {
            current = id;
          }
        }
      }

      setActiveSection((prev) => (prev === current ? prev : current));
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveSection);
  }, []);

  return (
    <div className="site-header sticky top-0 z-50 w-full border-b border-[#3c3c4324]">
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute" }}
      >
        <defs>
          <filter id="brand-logo-ink" colorInterpolationFilters="sRGB">
            <feFlood floodColor="#343638" result="ink" />
            <feComposite in="ink" in2="SourceAlpha" operator="in" />
          </filter>
        </defs>
      </svg>
      <div className="header-inner mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-8">
        <button
          className="brand-logo"
          aria-label="На початок"
          onClick={() => scrollToSection("hero")}
        >
          <img
            alt="OKIL — на початок"
            src={headerLogo}
            className="h-auto w-20 cursor-pointer object-contain"
          />
        </button>

        <div ref={navRef} className="section-nav" aria-label="Розділи сторінки">
          <div
            className="section-nav-pill"
            aria-hidden="true"
            style={{
              left: pill.left,
              width: pill.width,
              opacity: pill.visible ? 1 : 0,
            }}
          />
          <button
            aria-current={activeSection === "info" ? "location" : undefined}
            onClick={() => scrollToSection("info")}
          >
            Як це працює
          </button>
          <button
            aria-current={activeSection === "map" ? "location" : undefined}
            onClick={() => scrollToSection("map")}
          >
            Карта
          </button>
          <button
            aria-current={activeSection === "footer" ? "location" : undefined}
            onClick={() => scrollToSection("footer")}
          >
            Про проєкт
          </button>
        </div>

        <button
          onClick={() => scrollToSection("map")}
          className="header-map-button"
        >
          До карти
          <ArrowUpRight strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
