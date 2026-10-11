export const Map = () => {
  return (
    <div className="py-20">
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
    </div>
  );
};
