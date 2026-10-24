import ChevronRight from "../icons/chevron-right";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

interface CharacCardProps {
  title: string;
  value: number;
}

const LEAST = "#2B1B4D"; // least
const MOST = "#D6FF4F"; // most

function grade(value: number) {
  if (value >= 90) return "відмінно";
  if (value >= 70) return "добре";
  if (value >= 40) return "задовільно";
  return "слабко";
}

export const CharacCard = ({ title, value }: CharacCardProps) => {
  const percent = Math.min(100, Math.max(0, value));

  return (
    <Collapsible className="flex flex-col py-1.5">
      <CollapsibleTrigger className="group flex w-full items-baseline justify-between hover:opacity-50">
        <span className="flex items-center gap-1">
          <span className="text-xs">{title}</span>
          <ChevronRight
            strokeWidth={2.5}
            className="size-2 transition-transform duration-300 group-data-panel-open:rotate-90"
          />
        </span>
        <span className="text-xs">{value}</span>
      </CollapsibleTrigger>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#767680]/12">
        <div
          className="h-full rounded-full transition-[width,background-color] duration-300"
          style={{
            width: `${percent}%`,
            // oklch interpolation goes purple → blue → teal → lime, like the map's ramp
            backgroundColor: `color-mix(in oklch, ${MOST} ${percent}%, ${LEAST})`,
          }}
        />
      </div>

      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0">
        <div className="mt-3.5 rounded-2xl bg-white px-4 py-3.5 text-[13px] font-semibold">
          {value} з 100, {grade(value)}.
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
