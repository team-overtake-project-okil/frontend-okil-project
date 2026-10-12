import headerLogo from "../assets/header_logo.png";

export const Header = () => {
  return (
    <header className="w-full border-b border-[#D1D1D6] bg-[#FAFAFC] fixed">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-8">
        <img
          src={headerLogo}
          alt="OKIL"
          className="h-auto w-20 object-contain"
        />

        <nav aria-label="Головна навігація">
          <ul className="flex items-center gap-7">
            <li>
              <button
                type="button"
                className="rounded-sm text-sm leading-5 text-[#8E8E93] transition-colors hover:text-[#1C1C1E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#007AFF]"
              >
                Як це працює
              </button>
            </li>
            <li>
              <button
                type="button"
                className="rounded-sm text-sm leading-5 text-[#8E8E93] transition-colors hover:text-[#1C1C1E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#007AFF]"
              >
                Карта
              </button>
            </li>
            <li>
              <button
                type="button"
                className="rounded-sm text-sm leading-5 text-[#8E8E93] transition-colors hover:text-[#1C1C1E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#007AFF]"
              >
                Про проєкт
              </button>
            </li>
          </ul>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full bg-[#007AFF] px-4 py-2 text-sm leading-4 font-semibold text-white transition-colors hover:bg-[#0066D6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#007AFF]"
        >
          Відкрити карту
        </button>
      </div>
    </header>
  );
};
