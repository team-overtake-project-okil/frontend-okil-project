// import { useState } from "react";
// import heroImg from "./assets/hero.png";
// import reactLogo from "./assets/react.svg";
// import viteLogo from "./assets/vite.svg";
import "./App.css";

import { Hero } from "./components/hero";
import { Info } from "./components/info";
import { Map } from "./components/map";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

function App() {
  return (
    <>
      <div className="flex min-h-svh w-full flex-col bg-[#F2F2F7]">
        <div className="mx-auto flex w-full max-w-7xl flex-col">
          <Header />

          <Hero />

          <Info />

          <Map />

          <Footer />
        </div>
      </div>
    </>
  );
}

export default App;
