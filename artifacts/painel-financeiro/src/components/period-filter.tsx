import { useState } from "react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import type { CustomRange } from "@/hooks/use-period-filter";

export type { CustomRange };

export interface PeriodFilterProps {
  value: string;
  onChange: (value: string, customRange?: CustomRange) => void;
  customRange?: CustomRange | null;
  className?: string;
}

const PRESETS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last7days", label: "7 Dias" },
  { value: "last30days", label: "30 Dias" },
  { value: "thismonth", label: "Este Mês" },
  { value: "lastmonth", label: "Mês Passado" },
];

function fmtBR(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function PeriodFilter({ value, onChange, customRange, className }: PeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(
    customRange
      ? { from: new Date(customRange.startDate + "T12:00:00"), to: new Date(customRange.endDate + "T12:00:00") }
      : undefined
  );

  const handlePreset = (preset: string) => {
    setRange(undefined);
    onChange(preset);
  };

  const toIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleApply = () => {
    if (range?.from && range?.to) {
      onChange("custom", { startDate: toIso(range.from), endDate: toIso(range.to) });
      setOpen(false);
    }
  };

  const customLabel =
    customRange
      ? `${fmtBR(customRange.startDate)} – ${fmtBR(customRange.endDate)}`
      : "Personalizado";

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <div className="inline-flex items-center rounded-lg bg-muted p-1 overflow-x-auto">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePreset(preset.value)}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none",
              value === preset.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium border transition-all",
              value === "custom"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {customLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
          />
          <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleApply} disabled={!range?.from || !range?.to}>
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
