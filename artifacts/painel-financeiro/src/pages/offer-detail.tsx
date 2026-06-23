import { AppLayout } from "@/components/layout/app-layout";
import { PeriodFilter } from "@/components/period-filter";
import { useFetchOffer, useFetchOfferPerformance, getFetchOfferQueryKey, getFetchOfferPerformanceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercentage, formatDate } from "@/lib/format";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useParams, Link } from "wouter";
import { ArrowLeft, Tag, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePeriodFilter } from "@/hooks/use-period-filter";

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const { period, customRange, handleChange, apiParams, queryKey } = usePeriodFilter("today");

  const { data: offer, isLoading: isLoadingOffer, isError: isErrorOffer, refetch: refetchOffer } = useFetchOffer(
    id || "",
    apiParams,
    { query: { queryKey: [...getFetchOfferQueryKey(id || "", apiParams), ...queryKey], enabled: !!id } }
  );

  const { data: performance, isLoading: isLoadingPerf, isError: isErrorPerf, refetch: refetchPerf } = useFetchOfferPerformance(
    id || "",
    apiParams,
    { query: { queryKey: [...getFetchOfferPerformanceQueryKey(id || "", apiParams), ...queryKey], enabled: !!id } }
  );

  if (!id) return null;

  const hasError = isErrorOffer || isErrorPerf;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/ofertas" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Ofertas
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Tag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {isLoadingOffer ? <Skeleton className="h-8 w-48" /> : offer?.name ?? "Oferta"}
              </h1>
              <p className="text-sm text-muted-foreground">Detalhes e desempenho da oferta</p>
            </div>
          </div>
          <PeriodFilter value={period} onChange={handleChange} customRange={customRange} />
        </div>

        {hasError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between text-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">Erro ao carregar dados da oferta.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { refetchOffer(); refetchPerf(); }} className="text-destructive hover:text-destructive">
              Tentar novamente
            </Button>
          </div>
        )}

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {isLoadingOffer ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))
          ) : offer ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Receita</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{formatCurrency(offer.revenue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Lucro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(offer.profit)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">ROI</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-blue-500">{formatPercentage(offer.roi)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{offer.sales}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ticket Médio: {formatCurrency(offer.avgTicket)}</p>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Desempenho da Oferta</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPerf ? (
              <Skeleton className="h-[300px] sm:h-[400px] w-full" />
            ) : performance && performance.daily.length > 0 ? (
              <div className="h-[300px] sm:h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performance.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOfferRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOfferProf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
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
                    <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorOfferRev)" />
                    <Area type="monotone" dataKey="profit" name="Lucro" stroke="hsl(var(--chart-1))" strokeWidth={2} fillOpacity={1} fill="url(#colorOfferProf)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] sm:h-[400px] items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Nenhum dado de desempenho disponível.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
