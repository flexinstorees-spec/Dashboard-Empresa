import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace(/\/painel-financeiro$/, "") + "/api";

const DASHBOARDS = [
  { id: "674db4d157e6328d0794c11f", name: "COSTURA" },
  { id: "69e7c854eb1c09f769d03754", name: "CERAMICA" },
];

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

function MetricCell({ value, format, highlight }: { value: number; format: "currency" | "percent" | "number" | "roas"; highlight?: boolean }) {
  const formatted =
    format === "currency" ? formatCurrency(value) :
    format === "percent" ? `${(value * 100).toFixed(1)}%` :
    format === "roas" ? `${value.toFixed(2)}x` :
    value.toLocaleString("pt-BR");

  if (!highlight) return <span className="font-medium tabular-nums">{formatted}</span>;

  const isPositive = value > 0;
  return (
    <span className={cn("font-semibold tabular-nums flex items-center gap-1", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {formatted}
    </span>
  );
}

export default function Campaigns() {
  const [dashboardId, setDashboardId] = useState(DASHBOARDS[0].id);
  const [period, setPeriod] = useState("last30days");

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["campaigns", dashboardId, period],
    queryFn: async () => {
      const res = await fetch(`${BASE}/campaigns?dashboardId=${dashboardId}&period=${period}&level=campaign`);
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Erro ao buscar campanhas");
      }
      return res.json() as Promise<{ campaigns: Campaign[] }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const campaigns = data?.campaigns ?? [];
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalProfit = campaigns.reduce((s, c) => s + c.profit, 0);
  const totalSales = campaigns.reduce((s, c) => s + c.approvedOrdersCount, 0);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Campanhas</h1>
            <p className="text-sm text-muted-foreground">Desempenho detalhado por campanha no Meta Ads.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || isRefetching} className="self-start md:self-auto">
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex gap-2 flex-wrap">
            {DASHBOARDS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDashboardId(d.id)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                  dashboardId === d.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  period === p.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Gasto Total", value: totalSpend, format: "currency" as const },
              { label: "Receita Total", value: totalRevenue, format: "currency" as const },
              { label: "Lucro Total", value: totalProfit, format: "currency" as const, highlight: true },
              { label: "Vendas Totais", value: totalSales, format: "number" as const },
            ].map((card) => (
              <div key={card.label} className="border rounded-lg p-4 bg-card">
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                {card.highlight ? (
                  <MetricCell value={card.value} format={card.format} highlight />
                ) : (
                  <p className="text-lg font-bold tabular-nums">
                    {card.format === "currency" ? formatCurrency(card.value) : card.value.toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg bg-card overflow-hidden">
          {isLoading || isRefetching ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Buscando campanhas da UTMify...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p className="font-medium">{(error as Error).message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[280px]">Campanha</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gasto</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Receita</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Lucro</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">ROI</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">ROAS</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Vendas</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">CPA</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Impressões</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cliques</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 max-w-[280px]">
                          <span className="font-medium truncate" title={c.name}>{c.name}</span>
                          <StatusBadge status={c.effectiveStatus || c.status} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MetricCell value={c.spend} format="currency" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MetricCell value={c.revenue} format="currency" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MetricCell value={c.profit} format="currency" highlight />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("font-semibold tabular-nums", c.roi > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                          {(c.roi * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MetricCell value={c.roas} format="roas" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MetricCell value={c.approvedOrdersCount} format="number" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MetricCell value={c.cpa} format="currency" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MetricCell value={c.impressions} format="number" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MetricCell value={c.clicks} format="number" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MetricCell value={c.ctr} format="percent" />
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
