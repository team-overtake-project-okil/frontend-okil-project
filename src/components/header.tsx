import { useEffect, useState } from "react";
import { cn } from "cn";
import headerLogo from "../assets/header_logo.png";
import { scrollToSection } from "../lib/scroll";

const HEADER_OFFSET = 64;
const sectionIds = ["hero", "info", "map", "footer"] as const;

export const Header = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const updateActiveSection = () => {
      const marker = HEADER_OFFSET + 1;
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

  const navButtonClass = (sectionId: string) =>
    cn(
      "cursor-pointer rounded-sm text-sm leading-5 transition-colors hover:text-[#1C1C1E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#007AFF]",
      activeSection === sectionId ? "text-[#1C1C1E]" : "text-[#8E8E93]",
    );

  return (
    <div className="sticky top-0 z-50 w-full border-b border-[#3c3c4324] bg-white/72 backdrop-blur-[22px] backdrop-saturate-180">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-8">
        <img
          src={headerLogo}
          className="h-auto w-20 cursor-pointer object-contain"
          onClick={() => scrollToSection("hero")}
        />

        <div data-buttons>
          <div className="flex items-center gap-7">
            <div>
              <button
                onClick={() => scrollToSection("info")}
                className={navButtonClass("info")}
              >
                Як це працює
              </button>
            </div>
            <div>
              <button
                onClick={() => scrollToSection("map")}
                className={navButtonClass("map")}
              >
                Карта
              </button>
            </div>
            <div>
              <button
                onClick={() => scrollToSection("footer")}
                className={navButtonClass("footer")}
              >
                Про проєкт
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => scrollToSection("map")}
          className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#007AFF] px-4 py-2 text-sm leading-4 font-semibold text-white transition-colors hover:bg-[#0066D6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#007AFF]"
        >
          Відкрити карту
        </button>
      </div>
    </div>
  );
};
