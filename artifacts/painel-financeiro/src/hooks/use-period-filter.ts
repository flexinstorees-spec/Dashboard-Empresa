import { useState } from "react";

export interface CustomRange {
  startDate: string;
  endDate: string;
}

export function usePeriodFilter(defaultPeriod = "today") {
  const [period, setPeriod] = useState(defaultPeriod);
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);

  const handleChange = (newPeriod: string, range?: CustomRange) => {
    setPeriod(newPeriod);
    setCustomRange(range ?? null);
  };

  const apiParams = {
    period: period as any,
    ...(customRange
      ? { startDate: customRange.startDate, endDate: customRange.endDate }
      : { startDate: undefined, endDate: undefined }),
  };

  const queryKey = customRange
    ? [period, customRange.startDate, customRange.endDate]
    : [period];

  return { period, customRange, handleChange, apiParams, queryKey };
}
