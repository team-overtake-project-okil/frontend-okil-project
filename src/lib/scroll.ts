export const scrollToSection = (sectionId: string) => {
  const section = document.getElementById(sectionId);
  const element = section;
  if (!element) return;
  const header =
    document.querySelector(".site-header")?.getBoundingClientRect().height ??
    64;
  const top =
    element.getBoundingClientRect().top + window.scrollY - header - 12;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
};
