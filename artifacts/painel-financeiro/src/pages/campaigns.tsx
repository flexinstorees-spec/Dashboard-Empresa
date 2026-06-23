import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace(/\/painel-financeiro$/, "") + "/api";

const PERIODS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "last7days", label: "7 Dias" },
  { value: "last30days", label: "30 Dias" },
  { value: "thismonth", label: "Este Mês" },
  { value: "lastmonth", label: "Mês Passado" },
];

interface Campaign {
  id: string;
  name: string;
  dashboard: string;
  status: string;
  effectiveStatus: string;
  spend: number;
  revenue: number;
  profit: number;
  roi: number;
  roas: number;
  approvedOrdersCount: number;
  refundedOrdersCount: number;
  cpa: number;
  impressions: number;
  clicks: number;
  ctr: number;
  profitMargin: number;
  dailyBudget: number | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    PAUSED: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    DELETED: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
    ARCHIVED: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    DISAPPROVED: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  };
  const labels: Record<string, string> = {
    ACTIVE: "Ativa", PAUSED: "Pausada", DELETED: "Deletada",
    ARCHIVED: "Arquivada", DISAPPROVED: "Reprovada",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 font-medium", map[status] ?? "")}>
      {labels[status] ?? status}
    </Badge>
  );
}

function DashboardBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    COSTURA: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    CERAMICA: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 font-medium", colors[name] ?? "bg-muted text-muted-foreground")}>
      {name}
    </Badge>
  );
}

export default function Campaigns() {
  const [period, setPeriod] = useState("today");
  // Ref to signal that the next queryFn call should bypass server cache
  const forceRef = useRef(false);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["campaigns", period],
    queryFn: async () => {
      const force = forceRef.current;
      forceRef.current = false;
      const url = `${BASE}/campaigns?period=${period}${force ? "&force=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Erro ao buscar campanhas");
      }
      return res.json() as Promise<{ campaigns: Campaign[] }>;
    },
    staleTime: 3 * 60 * 1000,
  });

  const handleForceRefresh = () => {
    forceRef.current = true;
    refetch();
  };

  const campaigns = data?.campaigns ?? [];
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalProfit = campaigns.reduce((s, c) => s + c.profit, 0);
  const totalSales = campaigns.reduce((s, c) => s + c.approvedOrdersCount, 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Campanhas</h1>
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 font-medium">
                Meta Ads
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Campanhas Meta Ads ordenadas por melhor desempenho — dados em tempo real da UTMify.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceRefresh}
            disabled={isLoading || isRefetching}
            className="self-start md:self-auto"
            title="Buscar dados mais recentes da UTMify (ignora cache)"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
            {isRefetching ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>

        {/* Info note explaining the scope */}
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">Escopo: apenas Meta Ads.</span>{" "}
            Os valores aqui mostram somente campanhas do Meta (Facebook/Instagram). A{" "}
            <span className="font-medium">Visão Geral</span> exibe o total do negócio incluindo outras fontes de tráfego (orgânico, Google, etc.) — por isso os números diferem. Ambos estão corretos.
          </div>
        </div>

        {/* Period Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                period === p.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Gasto Total", value: formatCurrency(totalSpend) },
              { label: "Receita Total", value: formatCurrency(totalRevenue) },
              {
                label: "Lucro Total",
                value: formatCurrency(totalProfit),
                positive: totalProfit > 0,
                highlight: true,
              },
              { label: "Vendas Totais", value: totalSales.toLocaleString("pt-BR") },
              { label: "ROAS Geral", value: `${overallRoas.toFixed(2)}x` },
            ].map((card) => (
              <div key={card.label} className="border rounded-lg p-4 bg-card">
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                <p className={cn(
                  "text-lg font-bold tabular-nums",
                  card.highlight && (card.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")
                )}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg bg-card overflow-hidden">
          {isLoading || isRefetching ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="text-sm">Buscando dados atualizados da UTMify...</span>
              <span className="text-xs opacity-60">Isso pode levar alguns segundos</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p className="font-medium">{(error as Error).message}</p>
              <Button variant="outline" size="sm" onClick={handleForceRefresh}>Tentar novamente</Button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Nenhuma campanha encontrada para este período.
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
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">CPA</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">CTR</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Impressões</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((c, i) => (
                    <tr key={`${c.dashboard}-${c.id}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-medium tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 max-w-[260px]">
                          <span className="font-medium truncate leading-tight" title={c.name}>{c.name}</span>
                          <div className="flex gap-1 flex-wrap">
                            <DashboardBadge name={c.dashboard} />
                            <StatusBadge status={c.effectiveStatus || c.status} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(c.spend)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(c.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "font-semibold tabular-nums flex items-center justify-end gap-1",
                          c.profit > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                        )}>
                          {c.profit > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatCurrency(c.profit)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "font-semibold tabular-nums",
                          c.roi > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                        )}>
                          {(c.roi * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {c.roas.toFixed(2)}x
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {c.approvedOrdersCount}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(c.cpa)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {c.ctr.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {c.impressions.toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {campaigns.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            {campaigns.length} campanha{campaigns.length !== 1 ? "s" : ""} · Dados em tempo real da UTMify
          </p>
        )}
      </div>
    </AppLayout>
  );
}
