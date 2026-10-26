// import { useState } from "react";
// import heroImg from "./assets/hero.png";
// import reactLogo from "./assets/react.svg";
// import viteLogo from "./assets/vite.svg";
import "./App.css";
import { useState } from "react";
import type { AddressSuggestion } from "./services/geocoding";

import { Hero } from "./components/hero";
import { Info } from "./components/info";
import { Map } from "./components/map";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

function App() {
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [clearSelectionKey, setClearSelectionKey] = useState(0);
  const handleAddressChange = (address: AddressSuggestion | null) => {
    setSelectedAddress(address);
    // Clearing must also work when a hexagon was selected without an address.
    if (!address) setClearSelectionKey((key) => key + 1);
  };
  useRoutes();
  return (
    <>
      <div className="flex min-h-svh w-full flex-col bg-[#F2F2F7]">
        <Header />
        <div className="mx-auto flex w-full max-w-7xl flex-col">
          <Hero selectedAddress={selectedAddress} onAddressChange={handleAddressChange} />
          <Info />
          <Map clearSelectionKey={clearSelectionKey} searchedLocation={selectedAddress} onAddressChange={handleAddressChange} />
        </div>

        <hr className="w-full" />

        <div className="mx-auto flex w-full max-w-7xl flex-col">
          <Footer />
        </div>
      </div>
    </>
  );
}

export default App;
