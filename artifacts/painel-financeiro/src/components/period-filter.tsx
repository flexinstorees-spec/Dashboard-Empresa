import { cn } from "@/lib/utils";
import { GetOverviewPeriod } from "@workspace/api-client-react";

interface PeriodFilterProps {
  value: GetOverviewPeriod;
  onChange: (value: GetOverviewPeriod) => void;
  className?: string;
}

const periods = [
  { value: GetOverviewPeriod.today, label: "Hoje" },
  { value: GetOverviewPeriod.yesterday, label: "Ontem" },
  { value: GetOverviewPeriod.last7days, label: "7 Dias" },
  { value: GetOverviewPeriod.last30days, label: "30 Dias" },
  { value: GetOverviewPeriod.thismonth, label: "Este Mês" },
  { value: GetOverviewPeriod.lastmonth, label: "Mês Passado" },
];

export function PeriodFilter({ value, onChange, className }: PeriodFilterProps) {
  return (
    <div className={cn("inline-flex items-center rounded-lg bg-muted p-1 overflow-x-auto max-w-full", className)}>
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            value === period.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
