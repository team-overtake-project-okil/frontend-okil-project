const HEADER_OFFSET = 64;

export const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (!element) return;

  const yCoordinate = element.getBoundingClientRect().top + window.scrollY;
  const yOffset = sectionId === "map" ? -(HEADER_OFFSET - 70) : -HEADER_OFFSET;
  window.scrollTo({ top: yCoordinate + yOffset, behavior: "smooth" });
};
