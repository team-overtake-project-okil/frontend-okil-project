const HEADER_OFFSET = 64;

export const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (!element) return;

  const yCoordinate = element.getBoundingClientRect().top + window.scrollY;
  const yOffset = -HEADER_OFFSET;
  window.scrollTo({ top: yCoordinate + yOffset, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
};
