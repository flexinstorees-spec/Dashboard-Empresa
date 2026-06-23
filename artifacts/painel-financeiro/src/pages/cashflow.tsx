import { AppLayout } from "@/components/layout/app-layout";
import { PeriodFilter } from "@/components/period-filter";
import { useGetCashflow, getGetCashflowQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Wallet, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { usePeriodFilter } from "@/hooks/use-period-filter";
import { Button } from "@/components/ui/button";

export default function Cashflow() {
  const { period, customRange, handleChange, apiParams, queryKey } = usePeriodFilter("today");

  const { data, isLoading, isError, refetch } = useGetCashflow(
    apiParams,
    { query: { queryKey: [...getGetCashflowQueryKey(apiParams), ...queryKey] } }
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fluxo de Caixa</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhamento do saldo acumulado ao longo do tempo.
            </p>
          </div>
          <PeriodFilter value={period} onChange={handleChange} customRange={customRange} />
        </div>

        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between text-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">Erro ao carregar fluxo de caixa.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-destructive hover:text-destructive">
              Tentar novamente
            </Button>
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-3/4" />
                </CardContent>
              </Card>
            ))
          ) : data ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Acumulado (Lucro)</CardTitle>
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data.totalProfit)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Entradas Acumuladas</CardTitle>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saídas Acumuladas</CardTitle>
                  <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{formatCurrency(data.totalExpenses)}</div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Evolução do Caixa Acumulado</CardTitle>
            <CardDescription>Valores cumulativos dia a dia</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[350px] sm:h-[450px] w-full" />
            ) : data && data.entries.length > 0 ? (
              <div className="h-[350px] sm:h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.entries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCashflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCashIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => formatDate(val)}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      tickFormatter={(val) => `R$ ${Math.abs(val) >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      itemStyle={{ fontWeight: 500 }}
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => formatDate(label as string)}
                    />
                    <Area type="monotone" dataKey="cumulativeRevenue" name="Entradas (Acumulado)" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorCashIn)" />
                    <Area type="monotone" dataKey="cumulativeProfit" name="Saldo Caixa" stroke="hsl(var(--chart-1))" strokeWidth={3} fillOpacity={1} fill="url(#colorCashflow)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[350px] sm:h-[450px] items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Nenhum dado disponível.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
