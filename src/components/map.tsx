import { cn } from "cn";
import { TogglerCard } from "./TogglerCard";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import SearchIcon from "../icons/search";
import { MapboxMap } from "./MapboxMap";
import { CharacCard } from "./CharacCard";
import { useState } from "react";

const MOCK_DB = [
  { address: "вул. залізнична 7п", lat: 49.845475, lng: 23.996944 },
  { address: "вул. степана бандери 12", lat: 49.835472, lng: 24.014389 },
  { address: "пл. ринок 1", lat: 49.84161, lng: 24.03133 },
];

const togglerIds = ["01", "02", "03", "04", "05", "06", "07", "08"] as const;
const lockedTogglerIds = new Set<string>(["08"]);

type TogglerState = { value: number; on: boolean };
const DEFAULT_TOGGLER: TogglerState = { value: 0, on: true };
const defaultTogglers = (): Record<string, TogglerState> =>
  Object.fromEntries(togglerIds.map((id) => [id, DEFAULT_TOGGLER]));

const mapTabs = [
  { value: "overall", label: "Загальний" },
  { value: "mobility", label: "Мобільність" },
  { value: "daily", label: "Побут" },
  { value: "health", label: "Здоров'я" },
  { value: "education", label: "Освіта" },
  { value: "leisure", label: "Дозвілля" },
  { value: "shelter", label: "Укриття" },
  { value: "silence", label: "Тиша" },
];

// iOS-style segmented control (Figma: h 35.5, gap 1, padding 2, radius 11, fill #767680 @ 12%)
const segmentedList =
  "h-[35.5px] scrollbar-none snap-x snap-mandatory scroll-pl-0.5 justify-start gap-px overflow-x-auto overflow-y-hidden rounded-[11px] bg-[#767680]/12 p-0.5 group-data-horizontal/tabs:h-[35.5px] [&::-webkit-scrollbar]:hidden";

const segmentedTrigger = cn(
  // after:hidden drops the base underline indicator that overflows the list by 2px on Y
  "h-full flex-none snap-start rounded-[9px] px-3.5 text-[13px] leading-none font-medium text-[#3C3C43]/60 after:hidden hover:text-[#3C3C43]/85",
  "data-active:bg-white data-active:font-semibold data-active:text-black data-active:shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]",
  // divider between inactive segments (hidden on the first, the active one, and the one after active)
  "before:absolute before:top-1/2 before:-left-px before:h-4 before:w-px before:-translate-y-1/2 before:bg-[#3C3C43]/30 first:before:hidden data-active:before:hidden [[data-active]+&]:before:hidden",
);
export const Map = () => {
  const [togglers, setTogglers] = useState(defaultTogglers);
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [searchedLocation, setSearchedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<typeof MOCK_DB>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    if (value.trim().length >= 2) {
      const filtered = MOCK_DB.filter((item) =>
        item.address.includes(value.toLowerCase()),
      );
      setSuggestions(filtered);
      setIsDropdownOpen(true);
    } else {
      setSuggestions([]);
      setIsDropdownOpen(false);
    }
  };

  const handleSelectSuggestion = (item: (typeof MOCK_DB)[0]) => {
    setSearchValue(item.address);
    setSearchedLocation({ lat: item.lat, lng: item.lng });
    setIsDropdownOpen(false);
  };

  const handleSearch = () => {
    const searchStr = searchValue.trim().toLowerCase();
    const found = MOCK_DB.find((item) => item.address === searchStr);
    if (found) setSearchedLocation({ lat: found.lat, lng: found.lng });
    else alert("Не знайдено! Спробуй ввести: вул. залізнична 7п");
  };

  const updateToggler = (id: string, patch: Partial<TogglerState>) =>
    setTogglers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  // state + handlers for one card
  const togglerProps = (id: string) => ({
    id,
    locked: lockedTogglerIds.has(id),
    value: togglers[id].value,
    on: togglers[id].on,
    onValueChange: (value: number) => updateToggler(id, { value }),
    onOnChange: (on: boolean) => updateToggler(id, { on }),
  });

  const handleApply = () => {
    //Передати ваги на бек
  };

  const handleReset = () =>
    setTogglers((prev) =>
      Object.fromEntries(
        togglerIds.map((id) => [
          id,
          lockedTogglerIds.has(id) || prev[id].on ? DEFAULT_TOGGLER : prev[id],
        ]),
      ),
    );

  return (
    <div id="map" className="flex flex-col gap-8 px-6 py-20">
      <div data-head className="flex items-baseline-last justify-between">
        <div data-mapname className="flex flex-col gap-3">
          <div className="text-[13px] font-medium text-[#8E8E93]">
            Інтерактивна карта
          </div>

          <div className="text-4xl font-bold">Львів у гексагонах</div>
        </div>

        <div data-bestrate className="flex gap-7">
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-medium">30</div>
            <div className="text-sm text-[#8E8E93]">Середній</div>
          </div>

          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-medium">83</div>
            <div className="text-sm text-[#8E8E93]">Найкращий</div>
          </div>

          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-medium">2756</div>
            <div className="text-sm text-[#8E8E93]">Комірок</div>
          </div>
        </div>
      </div>

      <div data-map className="flex gap-6">
        <div data-togglers className="px-1">
          <div className="flex items-baseline-last justify-between">
            {/* мб поміняти розмір шрифту */}
            <div className="text-[13px] text-[#8E8E93]">Що важливо для вас</div>
            {/* хендлери потім поставити */}
            <button
              onClick={handleReset}
              className="text-[15px] text-[#007AFF] transition-opacity hover:opacity-70"
            >
              Скинути
            </button>
          </div>

          <div className="pt-1 pb-2 text-[13px] text-[#8E8E93]">
            Натисніть категорію: карта покаже її шар, а <br /> праворуч буде
            пояснення бала.
          </div>

          <div className="rounded-[22px] bg-white">
            <TogglerCard
              {...togglerProps("01")}
              title="Мобільність"
              description="Транспорт (GTFS), парковки, заправки"
            />

            <hr />

            <TogglerCard
              {...togglerProps("02")}
              title="Щоденні потреби"
              description="Аптеки, магазини, пошта, банки"
            />

            <hr />

            <TogglerCard
              {...togglerProps("03")}
              title="Здоров’я"
              description="Лікарні, поліклініки, стоматології"
            />

            <hr />

            <TogglerCard
              {...togglerProps("04")}
              title="Освіта"
              description="Садочки, школи, виші"
            />

            <hr />

            <TogglerCard
              {...togglerProps("05")}
              title="Дозвілля"
              description="Парки, ТРЦ, кінотеатри"
            />

            <hr />

            <TogglerCard
              {...togglerProps("06")}
              title="Спорт"
              description="Спортзали, стадіони, басейни"
            />

            <hr />

            <TogglerCard
              {...togglerProps("07")}
              title="Їжа"
              description="Кафе, ресторани, заклади харчування"
            />

            <hr />

            <TogglerCard
              {...togglerProps("08")}
              title="Безпека і стійкість"
              description="Обов’язкова категорія"
            />
          </div>
          <button
            onClick={handleApply}
            className="mt-4 w-full rounded-[14px] bg-[#007AFF] py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
          >
            Застосувати
          </button>
        </div>

        <div data-map-and-search className="flex flex-col">
          <div data-tabs className="w-full max-w-137">
            <Tabs
              defaultValue="overall"
              className="w-full flex-none items-start gap-0 self-stretch pb-3 data-horizontal:flex-row"
            >
              <TabsList className={cn(segmentedList, "w-full")}>
                {mapTabs.map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    className={segmentedTrigger}
                    value={value}
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {/* <TabsContent value="account">
                Make changes to your account here.
              </TabsContent>
              <TabsContent value="password">
                Change your password here.
              </TabsContent> */}
            </Tabs>
          </div>

          <div data-reacheability className="flex flex-col gap-2 pb-3.5">
            <div className="text-[13px] text-[#8E8E93]">
              Куди доїдете транспортом
            </div>

            <div>
              <Tabs
                defaultValue="on"
                className="w-fit flex-none items-start gap-0 data-horizontal:flex-row"
              >
                <TabsList className={cn(segmentedList, "w-fit")}>
                  <TabsTrigger className={segmentedTrigger} value="off">
                    вимк
                  </TabsTrigger>
                  <TabsTrigger className={segmentedTrigger} value="on">
                    увімк
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div data-search-small className="flex flex-col gap-2 pb-3">
            <div className="text-[13px] text-[#8E8E93]">Пошук за адресою</div>

            <div className="relative w-80">
              <div className="flex w-full items-center gap-2 rounded-xl bg-[#767680]/12 px-3 py-2">
                <SearchIcon className="size-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Наприклад: вул. Залізнична 7П"
                  className="w-full bg-transparent text-sm text-black outline-none placeholder:text-[#8E8E93]"
                  value={searchValue}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              {isDropdownOpen && suggestions.length > 0 && (
                <ul className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                  {suggestions.map((item, index) => (
                    <li
                      key={index}
                      onClick={() => handleSelectSuggestion(item)}
                      className="cursor-pointer border-b border-gray-50 px-4 py-2.5 text-sm transition-colors last:border-0 hover:bg-gray-50 hover:text-blue-600"
                    >
                      {item.address}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div data-map className="w-full min-w-0">
            <MapboxMap
              searchedLocation={searchedLocation}
              onHexSelect={setSelectedHexId}
            />
          </div>
        </div>

        <div data-characteristics>
          <div className="text-[13px] text-[#8E8E93]">
            Обраний H3: {selectedHexId ?? "знайдіть адресу"}
          </div>

          <div data-rate-number className="flex items-baseline-last gap-4">
            <div className="text-7xl font-bold">73</div>

            <div className="flex flex-col">
              <div className="text-sm font-medium">Добре</div>

              <div className="text-xs text-[#8E8E93]">з 100</div>
            </div>
          </div>

          <div className="pt-2 text-xs font-light text-[#8E8E93]">
            Вулиця проходить через 17 гекс. Номер 54: показано <br /> гексагон
            найближчої зупинки з відповідним номером.
          </div>

          <div data-characteristics-list className="pt-4">
            <CharacCard title="Мобільність" value={100} />
            <CharacCard title="Побут" value={73} />
            <CharacCard title="Здоров'я" value={85} />
            <CharacCard title="Освіта" value={67} />
            <CharacCard title="Дозвілля" value={39} />
            <CharacCard title="Укриття" value={60} />
            <CharacCard title="Тиша" value={19} />
          </div>
        </div>
      </div>
    </div>
  );
};
