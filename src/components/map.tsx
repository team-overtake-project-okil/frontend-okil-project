import { TogglerCard } from "./TogglerCard";

export const Map = () => {
  return (
    <div className="flex flex-col gap-8 py-20">
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

      <div data-map className="flex">
        <div data-togglers className="px-1">
          <div className="flex items-baseline-last justify-between">
            {/* мб поміняти розмір шрифту */}
            <div className="text-[13px] text-[#8E8E93]">Що важливо для вас</div>
            {/* хендлери потім поставити */}
            <button className="text-[15px] text-[#007AFF] transition-opacity hover:opacity-70">
              Скинути
            </button>
          </div>

          <div className="pt-1 pb-2 text-[13px] text-[#8E8E93]">
            Натисніть категорію: карта покаже її шар, а <br /> праворуч буде
            пояснення бала.
          </div>

          <div className="rounded-[22px] bg-white">
            <TogglerCard
              id="01"
              title="Мобільність"
              description="Транспорт (GTFS), парковки, заправки"
            />

            <hr />

            <TogglerCard
              id="02"
              title="Щоденні потреби"
              description="Аптеки, магазини, пошта, банки"
            />

            <hr />

            <TogglerCard
              id="03"
              title="Здоров’я"
              description="Лікарні, поліклініки, стоматології"
            />

            <hr />

            <TogglerCard
              id="04"
              title="Освіта"
              description="Садочки, школи, виші"
            />

            <hr />

            <TogglerCard
              id="05"
              title="Дозвілля, спорт, їжа"
              description="Парки, ТРЦ, спортзали, заклади"
            />

            <hr />

            <TogglerCard
              id="06"
              title="Безпека і стійкість"
              description="Обов’язкова категорія"
            />

            <hr />

            <TogglerCard
              id="07"
              title="Навантаження"
              description="Шум, трафік, повітря (інвертовано)"
            />
          </div>
        </div>

        <div data-mapandsearch></div>

        <div data-characteristics></div>
      </div>
    </div>
  );
};
