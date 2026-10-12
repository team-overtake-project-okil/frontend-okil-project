import headerLogo from "../assets/header_logo.png";

export const Header = () => {
  return (
    <div className="sticky top-0 z-50 w-full border-b border-[#3c3c4324] bg-white/72 backdrop-blur-[22px] backdrop-saturate-180">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-8">
        <img
          src={headerLogo}
          className="h-auto w-20 cursor-pointer object-contain"
        />

        <div data-buttons>
          <div className="flex items-center gap-7">
            <div>
              <button className="cursor-pointer rounded-sm text-sm leading-5 text-[#8E8E93] transition-colors hover:text-[#1C1C1E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#007AFF]">
                Як це працює
              </button>
            </div>
            <div>
              <button className="cursor-pointer rounded-sm text-sm leading-5 text-[#8E8E93] transition-colors hover:text-[#1C1C1E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#007AFF]">
                Карта
              </button>
            </div>
            <div>
              <button className="cursor-pointer rounded-sm text-sm leading-5 text-[#8E8E93] transition-colors hover:text-[#1C1C1E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#007AFF]">
                Про проєкт
              </button>
            </div>
          </div>
        </div>

        <button className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#007AFF] px-4 py-2 text-sm leading-4 font-semibold text-white transition-colors hover:bg-[#0066D6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#007AFF]">
          Відкрити карту
        </button>
      </div>
    </div>
  );
};
