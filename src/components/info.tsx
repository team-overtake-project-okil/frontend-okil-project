import { InfoCard } from "./InfoCard";

export const Info = () => {
  return (
    <div className="flex w-full justify-center bg-[#F3F3F9] px-6 py-24">
      <div className="mx-auto grid w-full grid-cols-3 gap-10">
        <InfoCard
          id="01"
          title="Відкриті дані"
          description="Реальні зупинки, маршрути й розклад Львова (GTFS), далі аптеки, школи, укриття, станції SaveEcoBot. Пайплайн однаковий для будь-якого міста."
        />

        <InfoCard
          id="02"
          title="Гексагони H3"
          description="Місто розбите на комірки ~300 м. Відстань до об'єктів перетворюється в бал 0–100 з плавним згасанням, без різкого «є/нема»."
        />

        <InfoCard
          id="03"
          title="Куди доїдете"
          description="Наведіть на гексагон: Okil знайде найближчі зупинки й підсвітить комірки, куди можна доїхати громадським транспортом за 15 хвилин, годину чи навіть дві."
        />
      </div>
    </div>
  );
};
