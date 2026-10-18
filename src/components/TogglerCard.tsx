import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { cn } from "cn";

type TogglerCardProps = {
  id: string;
  title: string;
  description: string;
  value: number;
  on: boolean;
  locked?: boolean;
  onValueChange: (value: number) => void;
  onOnChange: (on: boolean) => void;
};

const LEVELS: Record<number, string> = {
  0: "не важливо",
  20: "так собі",
  40: "нормально",
  60: "важливо",
  80: "дуже важливо",
  100: "критично",
};

function levelLabel(value: number) {
  const snapped = Math.round(Math.min(100, Math.max(0, value)) / 20) * 20;
  return LEVELS[snapped];
}

export const TogglerCard = ({
  id,
  title,
  description,
  value,
  on,
  locked = false,
  onValueChange,
  onOnChange,
}: TogglerCardProps) => {
  const disabled = !locked && !on;
  const label = levelLabel(value);

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div
        data-names
        className={cn("flex items-center gap-3", disabled && "opacity-50")}
      >
        <div className="text-[11px] text-[#8E8E93]">{id}</div>

        <div className="flex flex-1 flex-col">
          <div className="text-sm font-medium">{title}</div>

          <div className="text-xs text-[#8E8E93]">{description}</div>
        </div>

        <div>
          {locked ? (
            <Switch checked disabled />
          ) : (
            <Switch checked={on} onCheckedChange={onOnChange} />
          )}
        </div>
      </div>

      <div
        data-slider
        className="flex items-center justify-between gap-6 pr-2 pl-7"
      >
        <Slider
          className="min-w-0 flex-1"
          value={value}
          onValueChange={(next) => {
            onValueChange(Array.isArray(next) ? next[0] : next);
          }}
          max={100}
          step={20}
          min={0}
          disabled={disabled}
        />

        <div
          className={cn(
            "w-22 shrink-0 text-xs font-light whitespace-nowrap",
            disabled && "opacity-50",
          )}
        >
          <span
            key={label}
            className="inline-block animate-in fade-in duration-200"
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
};
