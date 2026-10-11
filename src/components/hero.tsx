import heroImage from "../assets/hero_part.png";
import ArrowRight from "../icons/arrow-right";
import SearchIcon from "../icons/search";

export const Hero = () => {
  return (
    //h-screen!!!! after adding header
    <section className="px-6 pt-24 pb-20">
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
              <div className="flex h-25 w-full max-w-92.5 flex-col items-start gap-3 rounded-[22px] bg-white p-4 shadow-sm">
                <span className="text-xs font-medium text-gray-400">
                  Знайти за вулицею
                </span>
                <div className="flex w-full items-center gap-2 rounded-xl bg-gray-100 px-3 py-2">
                  <SearchIcon className="size-4" />
                  <input
                    type="text"
                    placeholder="Введіть вулицю, наприклад Залізнична 7П"
                    className="w-full bg-transparent text-sm font-medium text-black outline-none placeholder:text-gray-500"
                  />
                </div>
              </div>

              <button className="group flex h-25 w-61.75 flex-col items-start gap-4 rounded-[22px] bg-[#007AFF] p-4 text-left text-white shadow-sm transition-colors hover:bg-blue-600">
                <span className="text-xs opacity-80">Просто цікаво</span>
                <span className="flex w-full items-center justify-between text-base font-medium">
                  Помнєцкати гексагони
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
