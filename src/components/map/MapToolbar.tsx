// Панель над картою: пошук адреси, пріоритети, маршрути і розгортання
import type { Ref } from "react";
import BusIcon from "../../icons/bus";
import Expand from "../../icons/arrows-pointing-out";
import Minimize2 from "../../icons/arrows-pointing-in";
import SlidersHorizontal from "../../icons/adjustments-horizontal";
import { AddressSearch } from "../address/AddressSearch";
import type { AddressSuggestion } from "../../services/geocoding";

interface MapToolbarProps {
  expanded: boolean;
  panelOpen: boolean;
  dirty: boolean;
  routesEnabled: boolean;
  searchedLocation: AddressSuggestion | null;
  onAddressChange: (address: AddressSuggestion | null) => void;
  onRoutesChange: (enabled: boolean) => void;
  onTogglePanel: () => void;
  onToggleExpanded: () => void;
  toggleRef: Ref<HTMLButtonElement>;
  expandRef: Ref<HTMLButtonElement>;
}

export function MapToolbar({
  expanded,
  panelOpen,
  dirty,
  routesEnabled,
  searchedLocation,
  onAddressChange,
  onRoutesChange,
  onTogglePanel,
  onToggleExpanded,
  toggleRef,
  expandRef,
}: MapToolbarProps) {
  return (
    <div className="map-toolbar">
      {!expanded && (
        <div className="inline-map-info">
          <div className="inline-map-title">Індекс комфорту, Львів</div>
          <div className="inline-text">
            Оберіть комірку, щоб побачити деталі
          </div>
        </div>
      )}
      <AddressSearch
        selectedAddress={searchedLocation}
        onLocationChange={onAddressChange}
      />
      <button
        ref={toggleRef}
        className="secondary-button"
        aria-expanded={panelOpen}
        aria-controls="weights-panel"
        onClick={onTogglePanel}
      >
        <SlidersHorizontal aria-hidden="true" />
        <span className="priorities-label">
          Пріоритети
          <span
            className={`priorities-mark ${dirty ? "is-on" : ""}`}
            aria-hidden={dirty ? undefined : true}
            aria-label={dirty ? "Є незастосовані зміни" : undefined}
          >
            <span>
              <span className="priorities-mark-dot">•</span>
            </span>
          </span>
        </span>
      </button>
      <label className="route-toggle">
        <input
          type="checkbox"
          checked={routesEnabled}
          onChange={(event) => onRoutesChange(event.target.checked)}
        />{" "}
        <BusIcon aria-hidden="true" /> Маршрути транспорту
      </label>
      <button
        ref={expandRef}
        className={`expand-map-button ${expanded ? "map-exit" : ""}`}
        aria-label={expanded ? "Повернутися до сторінки" : "Розгорнути карту"}
        title={expanded ? "Повернутися до сторінки" : "Розгорнути карту"}
        aria-expanded={expanded}
        onClick={onToggleExpanded}
      >
        {expanded ? <Minimize2 /> : <Expand />}{" "}
        {!expanded && "Розгорнути карту"}
      </button>
    </div>
  );
}
