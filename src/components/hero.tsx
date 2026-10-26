import { useId } from "react";
import heroImage from "../assets/hero_part.png";
import ArrowRight from "../icons/arrow-right";
import { AddressSearch } from "./AddressSearch";
import type { AddressSuggestion } from "../services/geocoding";
import { scrollToSection } from "../lib/scroll";

interface HeroProps {
  selectedAddress: AddressSuggestion | null;
  onAddressChange: (address: AddressSuggestion | null) => void;
}

export const Hero = ({ selectedAddress, onAddressChange }: HeroProps) => {
  const searchFormId = useId();
  const handleLocationChange = (address: AddressSuggestion | null) => {
    onAddressChange(address);
    if (address) scrollToSection("map");
  };
  return (
    //h-screen!!!! after adding header
    <section id="hero" className="px-6 pt-24 pb-20">
      <div className="mx-auto flex max-w-306 flex-row items-center gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-400">
                  Львів · пілот · відкриті дані
                </span>

                <div className="pt-5 text-6xl leading-[1.05] font-bold tracking-[-0.02em] text-black">
                  Знайдіть район, де <br />
                  справді{" "}
                  <span className="text-[#989898]">
                    комфортно <br />
                    жити
                  </span>
                </div>
              </div>

              <p className="max-w-xl text-[18px] leading-7 tracking-[-0.01em] text-[#8E8E93]">
                Okil ділить місто на гексагони й рахує для кожного індекс
                комфорту від 0 до 100: транспорт, аптеки, школи, укриття, тиша.
                До того, як ви підпишете договір.
              </p>
            </div>

            <div className="flex flex-row gap-4 pt-2">
              <AddressSearch
                variant="hero"
                formId={searchFormId}
                onEmptySubmit={() => scrollToSection("map")}
                selectedAddress={selectedAddress}
                onLocationChange={handleLocationChange}
              />

              <button
                type="submit"
                form={searchFormId}
                className="group flex h-25 w-61.75 flex-col items-start gap-4 rounded-[22px] bg-[#007AFF] p-4 text-left text-white shadow-sm transition-colors hover:bg-blue-600"
              >
                <span className="text-xs opacity-80">Просто цікаво</span>
                <span className="flex w-full items-center justify-between text-base font-medium">
                  Переглянути мапу
                  <ArrowRight
                    strokeWidth={2.5}
                    className="size-4 transition-transform group-hover:translate-x-1"
                  ></ArrowRight>
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex w-135 shrink-0 items-center justify-center">
          <img
            src={heroImage}
            alt="Гексагони комфорту"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>
    </section>
  );
};
