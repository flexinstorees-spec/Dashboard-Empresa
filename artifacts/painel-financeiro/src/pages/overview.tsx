import { AppLayout } from "@/components/layout/app-layout";
import { PeriodFilter } from "@/components/period-filter";
import { useGetOverview, getGetOverviewQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { ArrowDownIcon, ArrowUpIcon, DollarSign, PieChart, TrendingDown, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePeriodFilter } from "@/hooks/use-period-filter";

import { API_BASE as BASE } from "@/lib/api";

interface Campaign {
  id: string;
  name: string;
  dashboard: string;
  spend: number;
  revenue: number;
  profit: number;
  roi: number;
  roas: number;
  approvedOrdersCount: number;
}

const DASHBOARD_COLORS: Record<string, string> = {
  COSTURA: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  CERAMICA: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
};

export default function Overview() {
  const { period, customRange, handleChange, apiParams, queryKey } = usePeriodFilter("today");

  const { data, isLoading, isError, refetch } = useGetOverview(
    apiParams,
    { query: { queryKey: [...getGetOverviewQueryKey(apiParams), ...queryKey] } }
  );

  const { data: campaignsData, isLoading: isLoadingCampaigns, isError: isCampaignsError } = useQuery({
    queryKey: ["overview-campaigns", period, customRange?.startDate, customRange?.endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (customRange) {
        params.set("startDate", customRange.startDate);
        params.set("endDate", customRange.endDate);
      }
      const res = await fetch(`${BASE}/campaigns?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar campanhas");
      return res.json() as Promise<{ campaigns: Campaign[] }>;
    },
    staleTime: 3 * 60 * 1000,
  });

  const campaigns = (campaignsData?.campaigns ?? [])
    .filter((c) => c.spend > 0)
    .sort((a, b) => b.profit - a.profit);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe os principais indicadores do seu negócio.
            </p>
          </div>
          <PeriodFilter value={period} onChange={handleChange} customRange={customRange} />
        </div>

        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between text-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">Erro ao carregar dados.</p>
            </div>
            <button onClick={() => refetch()} className="text-sm underline font-semibold shrink-0">
              Tentar novamente
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : data ? (
            <>
              <MetricCard
                title="Gasto Total"
                value={formatCurrency(data.totalExpenses)}
                change={data.comparisonPrevious?.expensesChange}
                icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
                trend="neutral"
              />
              <MetricCard
                title="Receita Total"
                value={formatCurrency(data.totalRevenue)}
                change={data.comparisonPrevious?.revenueChange}
                icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                trend="neutral"
              />
              <MetricCard
                title="Lucro Total"
                value={formatCurrency(data.totalProfit)}
                change={data.comparisonPrevious?.profitChange}
                icon={<TrendingUp className={cn("h-4 w-4", data.totalProfit >= 0 ? "text-emerald-500" : "text-destructive")} />}
                trend={data.totalProfit >= 0 ? "positive" : "negative"}
                colorValue
              />
              <MetricCard
                title="ROI Geral"
                value={formatPercentage(data.roi)}
                icon={<PieChart className="h-4 w-4 text-muted-foreground" />}
                trend="neutral"
              />
            </>
          ) : null}
        </div>

        {/* Campaigns table */}
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-4">
            Campanhas Meta Ads
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              da melhor para pior • {campaigns.length} ativa{campaigns.length !== 1 ? "s" : ""}
            </span>
          </h2>

          <div className="border rounded-lg bg-card overflow-hidden">
            {isLoadingCampaigns ? (
              <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-sm">Buscando campanhas da UTMify...</span>
              </div>
            ) : isCampaignsError ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Não foi possível carregar as campanhas.
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Nenhuma campanha com gasto encontrada neste período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8">#</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Campanha</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gasto</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receita</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Lucro</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">ROI</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">ROAS</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vendas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {campaigns.map((c, i) => (
                      <tr key={`${c.dashboard}-${c.id}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground font-medium tabular-nums">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 max-w-[280px]">
                            <span className="font-medium truncate leading-tight" title={c.name}>{c.name}</span>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-1.5 py-0.5 font-medium w-fit", DASHBOARD_COLORS[c.dashboard] ?? "bg-muted text-muted-foreground")}
                            >
                              {c.dashboard}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(c.spend)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(c.revenue)}
                        </td>
                        <td className={cn("px-4 py-3 text-right tabular-nums font-semibold", c.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                          {formatCurrency(c.profit)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {c.roi.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {c.roas.toFixed(2)}x
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {c.approvedOrdersCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function MetricCard({
  title,
  value,
  change,
  icon,
  trend,
  colorValue,
}: {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  trend: "positive" | "negative" | "neutral";
  colorValue?: boolean;
}) {
  const isPositiveChange = change !== undefined && change > 0;
  const isNegativeChange = change !== undefined && change < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center bg-muted/50",
          colorValue && trend === "positive" && "bg-emerald-500/10",
          colorValue && trend === "negative" && "bg-destructive/10",
        )}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-2xl font-bold",
          colorValue && trend === "positive" && "text-emerald-600 dark:text-emerald-400",
          colorValue && trend === "negative" && "text-destructive",
        )}>
          {value}
        </div>
        {change !== undefined && (
          <p className="text-xs mt-1 flex items-center gap-1">
            <span
              className={cn(
                "flex items-center font-medium",
                isPositiveChange ? "text-emerald-600 dark:text-emerald-400" : isNegativeChange ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {isPositiveChange ? <ArrowUpIcon className="mr-1 h-3 w-3" /> : isNegativeChange ? <ArrowDownIcon className="mr-1 h-3 w-3" /> : null}
              {formatPercentage(Math.abs(change))}
            </span>
            <span className="text-muted-foreground">vs. período anterior</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
