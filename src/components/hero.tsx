import { HeroHexField } from "./HeroHexField";
import { AddressSearch } from "./AddressSearch";
import { scrollToSection } from "../lib/scroll";
import type { AddressSuggestion } from "../services/geocoding";

interface HeroProps {
  selectedAddress: AddressSuggestion | null;
  onAddressChange: (address: AddressSuggestion | null) => void;
}
export function Hero({ selectedAddress, onAddressChange }: HeroProps) {
  return (
    <section id="hero" className="hero-section">
      <HeroHexField />
      <div className="hero-copy">
        <h1>
          Ваш ритм
          <br />
          Ваш окіл
        </h1>
        <p className="hero-description">
          Дізнайтеся, що поруч. Обирайте місце для життя за своїми пріоритетами
          — від транспорту до відпочинку.
        </p>
        <AddressSearch
          variant="hero"
          selectedAddress={selectedAddress}
          onLocationChange={(address) => {
            onAddressChange(address);
            if (address) scrollToSection("map");
          }}
          onEmptySubmit={() => scrollToSection("map")}
        />
      </div>
    </section>
  );
}
