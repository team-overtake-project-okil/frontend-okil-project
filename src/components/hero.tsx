import { CityIllustration } from "./CityIllustration";
import { scrollToSection } from "../lib/scroll";
const backgroundHexes = [
  [24, 78, 42],
  [470, 30, 30],
  [1125, 55, 55],
  [1220, 360, 40],
  [45, 465, 35],
  [600, 565, 30],
  [1020, 580, 44],
];
export const Hero = () => (
  <section id="hero" className="hero-section">
    <svg
      className="hero-backdrop"
      viewBox="0 0 1240 620"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {backgroundHexes.map(([x, y, r], i) => (
        <polygon
          key={i}
          points={Array.from({ length: 6 }, (_, k) => {
            const a = ((60 * k - 30) * Math.PI) / 180;
            return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
          }).join(" ")}
        />
      ))}
    </svg>
    <div className="hero-copy">
      <h1>
        Знайдіть своє
        <br />
        місце <span>у Львові.</span>
      </h1>
      <p className="hero-description">
        Комфорт починається з того, що поруч.
        <br className="desktop-break" /> Досліджуйте місто й обирайте район
        <br className="desktop-break" /> за тим, що важливо саме вам.
      </p>
      <button
        className="hero-map-button"
        onClick={() => scrollToSection("map")}
      >
        Переглянути мапу{" "}
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 12h14m-6-6 6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <p className="hero-footnote">Ваші пріоритети. Ваш індекс комфорту.</p>
    </div>
    <CityIllustration />
  </section>
);
