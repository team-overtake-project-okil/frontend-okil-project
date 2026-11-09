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
    <div id="hero" className="hero-section">
      <HeroHexField />
      <div className="hero-copy">
        <div className="hero-title">
          Ваш ритм
          <br />
          Ваш окіл
        </div>

        <div className="text-block hero-description">
          Дізнайтеся, що поруч. Обирайте місце для життя за своїми пріоритетами
          — від транспорту до відпочинку
        </div>

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
    </div>
  );
}
