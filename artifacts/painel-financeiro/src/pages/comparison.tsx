import { AppLayout } from "@/components/layout/app-layout";
import { PeriodFilter } from "@/components/period-filter";
import { useState } from "react";
import { GetComparisonPeriod, GetOffersPeriod, useGetComparison, useGetOffers, getGetComparisonQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-3))",
];

export default function Comparison() {
  const [period, setPeriod] = useState<GetComparisonPeriod>(GetComparisonPeriod.last30days);
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  
  // Use same period for fetching offers
  const { data: availableOffers, isLoading: isLoadingOffers } = useGetOffers({
    period: period as unknown as GetOffersPeriod,
  });

  const offerIds = selectedOffers.join(",");
  const { data: comparisonData, isLoading: isLoadingComparison } = useGetComparison(
    { period, offerIds },
    { query: { queryKey: getGetComparisonQueryKey({ period, offerIds }), enabled: selectedOffers.length > 0 } }
  );

  const toggleOffer = (id: string) => {
    setSelectedOffers(prev => 
      prev.includes(id) 
        ? prev.filter(o => o !== id)
        : [...prev, id].slice(-5) // Max 5 offers for comparison
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Comparação</h1>
            <p className="text-sm text-muted-foreground">
              Compare o desempenho de até 5 ofertas lado a lado.
            </p>
          </div>
          {/* @ts-ignore */}
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 h-[fit-content]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Selecionar Ofertas</CardTitle>
              <CardDescription>
                {selectedOffers.length}/5 selecionadas
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] px-4 pb-4">
                {isLoadingOffers ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                ) : availableOffers?.length ? (
                  <div className="space-y-1">
                    {availableOffers.map((offer) => (
                      <label 
                        key={offer.id} 
                        className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <Checkbox 
                          checked={selectedOffers.includes(offer.id)}
                          onCheckedChange={() => toggleOffer(offer.id)}
                          disabled={!selectedOffers.includes(offer.id) && selectedOffers.length >= 5}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1 overflow-hidden">
                          <p className="text-sm font-medium leading-none truncate">{offer.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(offer.revenue)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma oferta encontrada.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-6">
            {selectedOffers.length === 0 ? (
              <Card className="h-[500px] flex flex-col items-center justify-center text-center p-8 bg-muted/20 border-dashed">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <BarChart className="h-6 w-6 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-medium">Selecione ofertas para comparar</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Escolha pelo menos uma oferta na lista ao lado para visualizar os gráficos de comparação de receita, lucro e ROI.
                </p>
              </Card>
            ) : isLoadingComparison ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : comparisonData?.offers.length ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Receita e Lucro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={comparisonData.offers}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                            tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                            tickFormatter={(val) => `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(value: number) => formatCurrency(value)}
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Bar dataKey="revenue" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="profit" name="Lucro" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comparisonData.offers.map((offer, idx) => (
                    <Card key={offer.id} className="overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <CardContent className="p-5 pl-6">
                        <h4 className="font-semibold mb-3 truncate">{offer.name}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Lucro</p>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(offer.profit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">ROI</p>
                            <p className="text-sm font-semibold text-blue-500">{formatPercentage(offer.roi)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Vendas</p>
                            <p className="text-sm font-semibold">{offer.sales}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Ticket Médio</p>
                            <p className="text-sm font-semibold">{formatCurrency(offer.avgTicket)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
