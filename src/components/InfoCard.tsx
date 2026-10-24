type InfoCardProps = {
  id: number | string;
  title: string;
  description: string;
};

export const InfoCard = ({ id, title, description }: InfoCardProps) => {
  return (
    <div className="h-full rounded-[22px] bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-blue-500">{id}</p>
      <div className="pt-3 text-xl font-semibold text-black">{title}</div>
      <p className="pt-2 text-sm leading-6 text-gray-400">{description}</p>
    </div>
  );
};
