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

//може потім по пропсам макс % на слайдер передавати ?
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
          value={value}
          onValueChange={(next) => {
            onValueChange(Array.isArray(next) ? next[0] : next);
          }}
          max={100}
          step={1}
          min={1}
          disabled={disabled}
        />

        <div className={cn("text-xs font-light", disabled && "opacity-50")}>
          {value}%
        </div>
      </div>
    </div>
  );
};
