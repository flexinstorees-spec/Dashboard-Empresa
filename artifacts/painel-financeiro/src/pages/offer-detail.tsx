import { AppLayout } from "@/components/layout/app-layout";
import { PeriodFilter } from "@/components/period-filter";
import { useState } from "react";
import { FetchOfferPeriod, FetchOfferPerformancePeriod, useFetchOffer, useFetchOfferPerformance, getFetchOfferQueryKey, getFetchOfferPerformanceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercentage, formatDate } from "@/lib/format";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useParams, Link } from "wouter";
import { ArrowLeft, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const [period, setPeriod] = useState<FetchOfferPeriod>(FetchOfferPeriod.last30days);
  
  const { data: offer, isLoading: isLoadingOffer } = useFetchOffer(
    id || "",
    { period },
    { query: { queryKey: getFetchOfferQueryKey(id || "", { period }), enabled: !!id } }
  );

  const { data: performance, isLoading: isLoadingPerf } = useFetchOfferPerformance(
    id || "",
    { period: period as unknown as FetchOfferPerformancePeriod },
    { query: { queryKey: getFetchOfferPerformanceQueryKey(id || "", { period: period as unknown as FetchOfferPerformancePeriod }), enabled: !!id } }
  );

  if (!id) return null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/ofertas" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Ofertas
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isLoadingOffer ? <Skeleton className="h-8 w-48" /> : offer?.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Detalhes e desempenho da oferta
              </p>
            </div>
          </div>
          {/* @ts-ignore */}
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>

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
                  <div className="text-2xl font-bold">{formatCurrency(offer.revenue)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Lucro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(offer.profit)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">ROI</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">{formatPercentage(offer.roi)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{offer.sales}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ticket Médio: {formatCurrency(offer.avgTicket)}</p>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        <Card className="mt-2">
          <CardHeader>
            <CardTitle>Desempenho da Oferta</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPerf ? (
              <Skeleton className="h-[400px] w-full" />
            ) : performance && performance.daily.length > 0 ? (
              <div className="h-[400px] w-full">
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
                      tickFormatter={(val) => `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
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
              <div className="flex h-[400px] items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Nenhum dado de desempenho disponível.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
