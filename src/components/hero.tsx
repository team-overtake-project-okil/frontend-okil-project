import { useId } from "react";
import { AddressSearch } from "./AddressSearch";
import { CityIllustration } from "./CityIllustration";
import type { AddressSuggestion } from "../services/geocoding";
import { scrollToSection } from "../lib/scroll";
interface HeroProps {
  selectedAddress: AddressSuggestion | null;
  onAddressChange: (address: AddressSuggestion | null) => void;
}
export const Hero = ({ selectedAddress, onAddressChange }: HeroProps) => {
  const formId = useId();
  return (
    <section id="hero" className="hero-section">
      <div className="hero-copy">
        <p className="eyebrow">ЛЬВІВ / ВІДКРИТІ ДАНІ / ПІЛОТ</p>
        <h1>
          Місто одне.
          <br />
          Ваше місце —<br />
          <span>особливе.</span>
        </h1>
        <p className="hero-description">
          Знайдіть район, де комфортно саме вам. Транспорт, щоденні потреби,
          освіта й відпочинок — на одній карті, з вашими пріоритетами.
        </p>
        <div className="hero-actions">
          <AddressSearch
            formId={formId}
            selectedAddress={selectedAddress}
            onEmptySubmit={() => scrollToSection("map")}
            onLocationChange={(address) => {
              onAddressChange(address);
              if (address) scrollToSection("map");
            }}
          />
          <button className="primary-button" type="submit" form={formId}>
            Знайти на карті ↗
          </button>
        </div>
        <button className="text-button" onClick={() => scrollToSection("map")}>
          Просто дослідити Львів →
        </button>
      </div>
      <CityIllustration />
    </section>
  );
};
