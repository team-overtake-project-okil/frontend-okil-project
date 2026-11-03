import { useEffect, useState } from "react";
import ArrowUpRight from "../icons/arrow-up-right";
import MapPinned from "../icons/map-pin";
import headerLogo from "../assets/header_logo.png";
import { scrollToSection } from "../lib/scroll";

const sectionIds = ["hero", "info", "map", "footer"] as const;

export const Header = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

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
    <div className="site-header sticky top-0 z-50 w-full border-b border-[#3c3c4324] bg-white/72 backdrop-blur-[22px] backdrop-saturate-180">
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

        <nav className="section-nav" aria-label="Розділи сторінки">
          {[
            ["info", "Як це працює"],
            ["map", "Карта"],
            ["footer", "Про проєкт"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-current={activeSection === id ? "location" : undefined}
              onClick={() => scrollToSection(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => scrollToSection("map")}
          className="header-map-button inline-flex cursor-pointer items-center justify-center rounded-full bg-[#007AFF] px-4 py-2 text-sm leading-4 font-semibold text-white transition-colors hover:bg-[#0066D6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#007AFF]"
        >
          <MapPinned width={16} height={16} style={{ width: 16, height: 16 }} aria-hidden="true" /> До карти{" "}
          <ArrowUpRight width={15} height={15} style={{ width: 15, height: 15 }} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
