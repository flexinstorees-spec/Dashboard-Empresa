import { AppLayout } from "@/components/layout/app-layout";
import { PeriodFilter } from "@/components/period-filter";
import { useState } from "react";
import { GetOffersSortBy, useGetOffers, getGetOffersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ShoppingBag, AlertCircle } from "lucide-react";
import { usePeriodFilter } from "@/hooks/use-period-filter";
import { Button } from "@/components/ui/button";

export default function Offers() {
  const { period, customRange, handleChange, apiParams, queryKey } = usePeriodFilter("today");
  const [sortBy, setSortBy] = useState<GetOffersSortBy>(GetOffersSortBy.profit);

  const params = { ...apiParams, sortBy };
  const { data, isLoading, isError, refetch } = useGetOffers(
    params,
    { query: { queryKey: [...getGetOffersQueryKey(params), ...queryKey] } }
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ofertas</h1>
            <p className="text-sm text-muted-foreground">
              Desempenho detalhado por produto/oferta.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            <PeriodFilter value={period} onChange={handleChange} customRange={customRange} />
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as GetOffersSortBy)}>
              <SelectTrigger className="w-full sm:w-[160px] h-9">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GetOffersSortBy.profit}>Lucro</SelectItem>
                <SelectItem value={GetOffersSortBy.revenue}>Receita</SelectItem>
                <SelectItem value={GetOffersSortBy.roi}>ROI</SelectItem>
                <SelectItem value={GetOffersSortBy.sales}>Vendas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between text-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">Erro ao carregar ofertas.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-destructive hover:text-destructive">
              Tentar novamente
            </Button>
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          ) : data && data.length > 0 ? (
            data.map((offer) => (
              <Link key={offer.id} href={`/ofertas/${offer.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full flex flex-col">
                  <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base group-hover:text-primary transition-colors truncate">{offer.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <ShoppingBag className="h-3 w-3 shrink-0" /> {offer.sales} vendas
                      </CardDescription>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Lucro</p>
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(offer.profit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Receita</p>
                        <p className="text-sm font-semibold">{formatCurrency(offer.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">ROI</p>
                        <p className="text-sm font-semibold text-blue-500">{formatPercentage(offer.roi)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Ticket Médio</p>
                        <p className="text-sm font-semibold">{formatCurrency(offer.avgTicket)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/20">
              <ShoppingBag className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhuma oferta encontrada</h3>
              <p className="text-sm text-muted-foreground mt-1">Não há dados para o período selecionado.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
