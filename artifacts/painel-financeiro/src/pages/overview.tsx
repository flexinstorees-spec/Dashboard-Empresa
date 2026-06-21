import { AppLayout } from "@/components/layout/app-layout";
import { PeriodFilter } from "@/components/period-filter";
import { useState } from "react";
import { GetOverviewPeriod, useGetOverview, getGetOverviewQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { ArrowDownIcon, ArrowUpIcon, DollarSign, PieChart, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Overview() {
  const [period, setPeriod] = useState<GetOverviewPeriod>(GetOverviewPeriod.today);
  const { data, isLoading, isError, refetch } = useGetOverview(
    { period },
    { query: { queryKey: getGetOverviewQueryKey({ period }) } }
  );

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
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>

        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between text-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">Erro ao carregar dados.</p>
            </div>
            <button onClick={() => refetch()} className="text-sm underline font-semibold">Tentar novamente</button>
          </div>
        )}

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
                title="Receita Total"
                value={formatCurrency(data.totalRevenue)}
                change={data.comparisonPrevious?.revenueChange}
                icon={<DollarSign className="h-4 w-4 text-primary" />}
                trend="neutral"
              />
              <MetricCard
                title="Lucro Total"
                value={formatCurrency(data.totalProfit)}
                change={data.comparisonPrevious?.profitChange}
                icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                trend="positive"
              />
              <MetricCard
                title="Gasto Total"
                value={formatCurrency(data.totalExpenses)}
                change={data.comparisonPrevious?.expensesChange}
                icon={<TrendingDown className="h-4 w-4 text-destructive" />}
                trend="negative"
              />
              <MetricCard
                title="ROI Geral"
                value={formatPercentage(data.roi)}
                icon={<PieChart className="h-4 w-4 text-blue-500" />}
                trend={data.roi > 0 ? "positive" : "negative"}
              />
            </>
          ) : null}
        </div>

        <h2 className="text-xl font-bold tracking-tight mt-4">Hoje</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
             Array.from({ length: 4 }).map((_, i) => <Skeleton key={`today-${i}`} className="h-24 rounded-xl" />)
          ) : data ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Receita</CardDescription>
                  <CardTitle className="text-2xl">{formatCurrency(data.todayRevenue)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Lucro</CardDescription>
                  <CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">{formatCurrency(data.todayProfit)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Gastos</CardDescription>
                  <CardTitle className="text-2xl text-destructive">{formatCurrency(data.todayExpenses)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Vendas</CardDescription>
                  <CardTitle className="text-2xl">{data.todaySales}</CardTitle>
                </CardHeader>
              </Card>
            </>
          ) : null}
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
}: {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  trend: "positive" | "negative" | "neutral";
}) {
  const isPositiveChange = change && change > 0;
  const isNegativeChange = change && change < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center bg-muted/50",
          trend === "positive" && "bg-emerald-500/10",
          trend === "negative" && "bg-destructive/10",
        )}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
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
