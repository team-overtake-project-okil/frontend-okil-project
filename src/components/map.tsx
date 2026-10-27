import { cn } from "cn";
import { TogglerCard } from "./TogglerCard";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { MapboxMap } from "./MapboxMap";
import { CharacCard } from "./CharacCard";
import { Skeleton } from "./ui/skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetcher } from "../lib/fetcher";
import { AddressSearch } from "./AddressSearch";
import type { AddressSuggestion } from "../services/geocoding";

export type Hexagon = {
  h3_id: string;
  overall_rating: number;
};

type CategoryRating = {
  category: string;
  score: number;
  enabled: boolean;
  weight: number;
  adjusted_score: number | null;
};

type HexagonAssessment = {
  h3_id: string;
  overall_rating: number;
  categories: CategoryRating[];
};

const togglerIds = ["01", "02", "03", "04", "05", "06", "07", "08"] as const;
const lockedTogglerIds = new Set<string>(["08"]);

type TogglerState = { value: number; on: boolean };
type TogglerStates = Record<string, TogglerState>;
const DEFAULT_TOGGLER: TogglerState = { value: 0, on: true };
const defaultTogglers = (): TogglerStates =>
  Object.fromEntries(togglerIds.map((id) => [id, DEFAULT_TOGGLER]));

type AssessmentWeights = {
  weight_health: number;
  weight_study: number;
  weight_daily: number;
  weight_mobility: number;
  weight_sport: number;
  weight_enjoyment: number;
  weight_food: number;
  weight_security: number;
};

function buildAssessmentWeights(togglers: TogglerStates): AssessmentWeights {
  const weight = (id: string) =>
    togglers[id].on ? togglers[id].value / 20 : 0;

  return {
    weight_health: weight("03"),
    weight_study: weight("04"),
    weight_daily: weight("02"),
    weight_mobility: weight("01"),
    weight_sport: weight("06"),
    weight_enjoyment: weight("05"),
    weight_food: weight("07"),
    weight_security: weight("08"),
  };
}

function sameWeights(a: AssessmentWeights | null, b: AssessmentWeights | null) {
  if (a === null || b === null) return a === b;
  return (Object.keys(a) as (keyof AssessmentWeights)[]).every(
    (key) => a[key] === b[key],
  );
}

// No query string keeps the backend defaults (every weight is 1).
function weightsSearch(weights: AssessmentWeights | null) {
  if (weights === null) return "";
  const query = new URLSearchParams(
    Object.entries(weights).map(([key, value]) => [key, String(value)]),
  ).toString();
  return query ? `?${query}` : "";
}

const categoryLabels = [
  ["mobility", "Мобільність"],
  ["daily", "Побут"],
  ["health", "Здоров'я"],
  ["study", "Освіта"],
  ["enjoyment", "Дозвілля"],
  ["sport", "Спорт"],
  ["food", "Їжа"],
  ["security", "Безпека"],
] as const;

function categoryCards(assessment: HexagonAssessment) {
  return categoryLabels.flatMap(([category, title]) => {
    const item = assessment.categories.find(
      (entry) => entry.category === category,
    );
    if (!item) return [];
    return [{ title, score: item.score }];
  });
}

const mapTabs = [
  { value: "overall", label: "Загальний" },
  { value: "mobility", label: "Мобільність" },
  { value: "daily", label: "Побут" },
  { value: "health", label: "Здоров'я" },
  { value: "education", label: "Освіта" },
  { value: "leisure", label: "Дозвілля" },
  { value: "sport", label: "Спорт" },
  { value: "food", label: "Їжа" },
  { value: "shelter", label: "Укриття" },
];

// iOS-style segmented control (Figma: h 35.5, gap 1, padding 2, radius 11, fill #767680 @ 12%)
const segmentedList =
  "h-[35.5px] scrollbar-none overscroll-x-contain scroll-pl-0.5 justify-start gap-px overflow-x-auto overflow-y-hidden rounded-[11px] bg-[#767680]/12 p-0.5 group-data-horizontal/tabs:h-[35.5px] [&::-webkit-scrollbar]:hidden";

const segmentedTrigger = cn(
  // after:hidden drops the base underline indicator that overflows the list by 2px on Y
  "h-full flex-none snap-start rounded-[9px] px-3.5 text-[13px] leading-none font-medium text-[#3C3C43]/60 after:hidden hover:text-[#3C3C43]/85",
  "data-active:bg-white data-active:font-semibold data-active:text-black data-active:shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]",
  // divider between inactive segments (hidden on the first, the active one, and the one after active)
  "before:absolute before:top-1/2 before:-left-px before:h-4 before:w-px before:-translate-y-1/2 before:bg-[#3C3C43]/30 first:before:hidden data-active:before:hidden [[data-active]+&]:before:hidden",
);

interface MapProps {
  clearSelectionKey: number;
  searchedLocation: AddressSuggestion | null;
  onAddressChange: (address: AddressSuggestion | null) => void;
}

export const Map = ({
  searchedLocation,
  onAddressChange,
  clearSelectionKey,
}: MapProps) => {
  const [togglers, setTogglers] = useState(defaultTogglers);
  // null means the user has not applied weights yet, so the API defaults stay.
  const [appliedTogglers, setAppliedTogglers] = useState<TogglerStates | null>(
    null,
  );
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
  const assessmentWeights = useMemo(
    () =>
      appliedTogglers === null ? null : buildAssessmentWeights(appliedTogglers),
    [appliedTogglers],
  );
  const {
    data: hexagonsData = [],
    isLoading: isHexagonsLoading,
    isError: isHexagonsError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["hexagons", assessmentWeights],
    placeholderData: keepPreviousData,
    queryFn: ({ queryKey }) => {
      const weights = queryKey[1] as AssessmentWeights | null;
      return fetcher(`/hexagons${weightsSearch(weights)}`) as Promise<
        Hexagon[]
      >;
    },
  });

  const showSkeleton = isHexagonsLoading || (isHexagonsError && isFetching);
  const {
    data: assessmentData,
    isLoading: isAssessmentLoading,
    isError: isAssessmentError,
    isFetching: isAssessmentFetching,
    refetch: refetchAssessment,
  } = useQuery({
    queryKey: ["hexagon-assessment", selectedHexId, assessmentWeights],
    enabled: selectedHexId !== null,
    queryFn: ({ queryKey }) => {
      const hexId = queryKey[1] as string | null;
      const weights = queryKey[2] as AssessmentWeights | null;
      if (hexId === null) {
        throw new Error(
          "A hexagon must be selected to request its assessment.",
        );
      }

      return fetcher(
        `/hexagons/${encodeURIComponent(hexId)}${weightsSearch(weights)}`,
      ) as Promise<HexagonAssessment>;
    },
  });
  const showAssessmentSkeleton =
    isAssessmentLoading || (isAssessmentError && isAssessmentFetching);

  const tabsWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list =
      tabsWrapRef.current?.querySelector<HTMLElement>('[role="tablist"]');
    if (!list) return;

    const onWheel = (e: WheelEvent) => {
      if (list.scrollWidth <= list.clientWidth) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      e.preventDefault();
      list.scrollLeft += e.deltaY;
    };

    list.addEventListener("wheel", onWheel, { passive: false });
    return () => list.removeEventListener("wheel", onWheel);
  }, []);

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
    const nextAppliedTogglers = { ...togglers };
    const nextWeights = buildAssessmentWeights(nextAppliedTogglers);
    const weightsUnchanged = sameWeights(assessmentWeights, nextWeights);

    setAppliedTogglers(nextAppliedTogglers);
    if (weightsUnchanged) {
      void refetch();
      if (selectedHexId) void refetchAssessment();
    }
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
          <div data-tabs ref={tabsWrapRef} className="w-full max-w-137">
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
                  <TabsTrigger className={segmentedTrigger} value="on">
                    вимк
                  </TabsTrigger>
                  <TabsTrigger className={segmentedTrigger} value="off">
                    увімк
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <AddressSearch
            selectedAddress={searchedLocation}
            onLocationChange={onAddressChange}
          />

          <div data-map className="w-full min-w-0">
            {showSkeleton ? (
              <Skeleton className="h-125 w-full rounded-2xl bg-[#767680]/12" />
            ) : isHexagonsError ? (
              <div className="flex h-125 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-[#767680]/12 px-6 text-center">
                <div className="text-sm font-medium">
                  Не вдалося завантажити карту
                </div>
                <div className="text-[13px] text-[#8E8E93]">
                  Перевірте з'єднання і спробуйте ще раз.
                </div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-1 text-[15px] text-[#007AFF] transition-opacity hover:opacity-70"
                >
                  Спробувати знову
                </button>
              </div>
            ) : (
              <MapboxMap
                hexagons={hexagonsData}
                clearSelectionKey={clearSelectionKey}
                searchedLocation={searchedLocation}
                onHexSelect={setSelectedHexId}
              />
            )}
          </div>
        </div>

        <div data-characteristics className="grow">
          <div className="text-[13px] text-[#8E8E93]">
            Обраний H3: {selectedHexId ?? "знайдіть адресу"}
          </div>

          {!selectedHexId ? (
            <>
              <div data-rate-number className="flex items-baseline-last gap-4">
                <div className="text-7xl font-bold">—</div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium">загальна</div>
                  <div className="text-xs text-[#8E8E93]">з 100</div>
                </div>
              </div>
              <p className="pt-2 text-xs font-light text-[#8E8E93]">
                Оберіть гексагон на карті, щоб побачити його оцінку.
              </p>
            </>
          ) : showAssessmentSkeleton ? (
            <div
              role="status"
              aria-busy="true"
              aria-label="Завантаження оцінки"
            >
              <div className="flex items-end gap-4">
                <Skeleton className="h-16 w-24 rounded-2xl bg-[#767680]/12" />
                <div className="flex flex-col gap-2 pb-1">
                  <Skeleton className="h-3.5 w-16 bg-[#767680]/12" />
                  <Skeleton className="h-3 w-10 bg-[#767680]/12" />
                </div>
              </div>
              <div className="pt-4">
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={index} className="flex flex-col gap-1.5 py-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24 bg-[#767680]/12" />
                      <Skeleton className="h-3 w-6 bg-[#767680]/12" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full bg-[#767680]/12" />
                  </div>
                ))}
              </div>
            </div>
          ) : isAssessmentError ? (
            <div className="flex flex-col gap-2 pt-4" role="alert">
              <div className="text-sm font-medium">
                Не вдалося завантажити оцінку
              </div>
              <div className="text-[13px] text-[#8E8E93]">
                Перевірте з'єднання і спробуйте ще раз.
              </div>
              <button
                type="button"
                onClick={() => void refetchAssessment()}
                className="mt-1 w-fit text-[15px] text-[#007AFF] transition-opacity hover:opacity-70"
              >
                Спробувати знову
              </button>
            </div>
          ) : (
            <>
              <div data-rate-number className="flex items-baseline-last gap-4">
                <div className="text-7xl font-bold">
                  {assessmentData?.overall_rating ?? "—"}
                </div>

                <div className="flex flex-col">
                  <div className="text-sm font-medium">Оцінка</div>
                  <div className="text-xs text-[#8E8E93]">з 100</div>
                </div>
              </div>

              {assessmentData && (
                <div data-characteristics-list className="pt-4">
                  {categoryCards(assessmentData).map((card) => (
                    <CharacCard
                      key={card.title}
                      title={card.title}
                      value={card.score}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
