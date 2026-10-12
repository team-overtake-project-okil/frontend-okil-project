import { useState } from "react";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { cn } from "cn";

type TogglerCardProps = {
  id: number | string;
  title: string;
  description: string;
};

//може потім по пропсам макс % на слайдер передавати ?
export const TogglerCard = ({ id, title, description }: TogglerCardProps) => {
  const [value, setValue] = useState([1]);
  const [on, setOn] = useState(true);
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div
        data-names
        className={cn("flex items-center gap-3", !on && "opacity-50")}
      >
        <div className="text-[11px] text-[#8E8E93]">{id}</div>

        <div className="flex flex-1 flex-col">
          <div className="text-sm font-medium">{title}</div>

          <div className="text-xs text-[#8E8E93]">{description}</div>
        </div>

        <div>
          {id === "06" ? (
            <Switch checked disabled />
          ) : (
            <Switch checked={on} onCheckedChange={setOn} />
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
            setValue(typeof next === "number" ? [next] : [...next]);
          }}
          max={100}
          step={1}
          min={1}
          disabled={id !== "06" && !on}
        />

        <div className={cn("text-xs font-light", !on && "opacity-50")}>
          {value}%
        </div>
      </div>
    </div>
  );
};
