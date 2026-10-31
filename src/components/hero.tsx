import { CityIllustration } from "./CityIllustration";
import { scrollToSection } from "../lib/scroll";
export const Hero = () => (
  <section id="hero" className="hero-section">
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
