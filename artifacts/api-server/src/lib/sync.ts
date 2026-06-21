import { db } from "@workspace/db";
import { syncLogsTable, offersTable, dailyMetricsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { initMcp, callTool, getTools, resetMcp } from "./mcp-client";
import { logger } from "./logger";

// ─── Types returned by UTMify MCP ──────────────────────────────────────────

interface UtmDashboard {
  id: string;
  name: string;
  timeZone: number; // e.g. -3
  metaProfiles?: Array<{
    adAccounts?: Array<{ id: string; enabled: boolean }>;
  }>;
}

interface UtmSummary {
  ordersCount: {
    approved: number;
    refunded: number;
  };
  comissions: {
    net: number;                  // net revenue in centavos
    refundedGrossRevenue: number; // refunded amount in centavos
  };
  ads: {
    spent: number; // ad spend in centavos
  };
  analytics: {
    profit: number; // net profit in centavos
    roi: number;
    avgTicket: number; // centavos
  };
}

// ─── State ──────────────────────────────────────────────────────────────────

let _syncing = false;

// ─── Helpers ────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(d: Date, offsetHours: number): string {
  const sign = offsetHours >= 0 ? "+" : "-";
  const abs = Math.abs(offsetHours);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(abs)}:00`;
}

function dayRange(year: number, month: number, day: number, tzOffset: number) {
  const from = new Date(year, month, day, 0, 0, 0);
  const to = new Date(year, month, day, 23, 59, 59);
  return { from: toIso(from, tzOffset), to: toIso(to, tzOffset) };
}

function brl(centavos: number): number {
  return (centavos ?? 0) / 100;
}

async function upsertDay(
  offerId: string,
  dateStr: string,
  revenue: number,
  profit: number,
  expenses: number,
  sales: number,
  refunds: number
): Promise<void> {
  const existing = await db
    .select({ id: dailyMetricsTable.id })
    .from(dailyMetricsTable)
    .where(and(eq(dailyMetricsTable.offerId, offerId), eq(dailyMetricsTable.date, dateStr)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(dailyMetricsTable)
      .set({ revenue, profit, expenses, sales, refunds, updatedAt: new Date() })
      .where(eq(dailyMetricsTable.id, existing[0].id));
  } else {
    await db
      .insert(dailyMetricsTable)
      .values({ offerId, date: dateStr, revenue, profit, expenses, sales, refunds });
  }
}

function enabledMetaAccounts(dash: UtmDashboard): string[] {
  const ids: string[] = [];
  for (const profile of dash.metaProfiles ?? []) {
    for (const acc of profile.adAccounts ?? []) {
      if (acc.enabled) ids.push(acc.id);
    }
  }
  return ids;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface SyncResult {
  status: "idle" | "syncing" | "success" | "error";
  lastSyncAt: string | null;
  offersCount: number;
  message: string;
}

export async function getLastSyncStatus(): Promise<SyncResult> {
  const rows = await db
    .select()
    .from(syncLogsTable)
    .orderBy(desc(syncLogsTable.createdAt)) // most recent first
    .limit(1);

  if (rows.length === 0) {
    return { status: "idle", lastSyncAt: null, offersCount: 0, message: "Nenhuma sincronização realizada" };
  }

  const row = rows[0];
  return {
    status: row.status as SyncResult["status"],
    lastSyncAt: row.createdAt.toISOString(),
    offersCount: row.offersCount,
    message: row.message,
  };
}

export async function runSync(): Promise<SyncResult> {
  if (_syncing) {
    return { status: "syncing", lastSyncAt: null, offersCount: 0, message: "Sincronização já em andamento..." };
  }

  _syncing = true;
  let offersCount = 0;

  try {
    resetMcp();
    await initMcp();

    const tools = getTools();
    const toolNames = tools.map((t) => t.name);
    logger.info({ toolCount: tools.length, tools: toolNames }, "MCP tools discovered");

    // ── 1. List dashboards ──────────────────────────────────────────────────
    if (!toolNames.includes("get_dashboards")) {
      throw new Error("Ferramenta get_dashboards não disponível no MCP");
    }

    const dashboards = (await callTool("get_dashboards")) as UtmDashboard[];
    if (!Array.isArray(dashboards) || dashboards.length === 0) {
      throw new Error("Nenhum dashboard encontrado no MCP");
    }

    logger.info({ dashboards: dashboards.map((d) => ({ id: d.id, name: d.name })) }, "Dashboards found");
    offersCount = dashboards.length;

    for (const dash of dashboards) {
      await db
        .insert(offersTable)
        .values({ id: dash.id, name: dash.name })
        .onConflictDoUpdate({
          target: offersTable.id,
          set: { name: dash.name, lastSyncAt: new Date() },
        });
    }

    // ── 2. Fetch daily metrics per dashboard ────────────────────────────────
    if (!toolNames.includes("get_dashboard_summary")) {
      throw new Error("Ferramenta get_dashboard_summary não disponível no MCP");
    }

    const daysToFetch = 90;
    const today = new Date();

    // Build date list
    const dates = Array.from({ length: daysToFetch }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        str: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      };
    });

    // Cross-dashboard accumulator for consolidated "ALL" rows
    const allByDate = new Map<
      string,
      { revenue: number; profit: number; expenses: number; sales: number; refunds: number }
    >();

    for (const dash of dashboards) {
      const tzOffset = dash.timeZone ?? -3;
      const enabledMetaIds = enabledMetaAccounts(dash);
      logger.info({ dashboardId: dash.id, name: dash.name, days: daysToFetch }, "Syncing dashboard");

      for (const date of dates) {
        const range = dayRange(date.year, date.month, date.day, tzOffset);

        // Fetch with retry on rate-limit (UTMify limits ~60 req/min)
        let summary: UtmSummary | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const args: Record<string, unknown> = {
              dashboardId: dash.id,
              dateRange: range,
            };

            const result = (await callTool("get_dashboard_summary", args)) as UtmSummary;

            if (!result || typeof result !== "object" || (result as Record<string, unknown>).error) {
              break; // no data for this day — skip
            }
            summary = result;
            break;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "";
            if (msg.includes("Rate limit") && attempt === 0) {
              logger.info({ date: date.str, dash: dash.name }, "Rate limit hit — waiting 65s");
              await new Promise((r) => setTimeout(r, 65_000));
              continue; // retry once
            }
            logger.warn({ date: date.str, dash: dash.name, err }, "Failed to fetch day, skipping");
            break;
          }
        }

        if (!summary) {
          // Throttle even on skipped days to stay under rate limit
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }

        const revenue = brl(summary.comissions?.net ?? 0);
        const profit = brl(summary.analytics?.profit ?? 0);
        const expenses = brl(summary.ads?.spent ?? 0);
        const sales = summary.ordersCount?.approved ?? 0;
        const refunds = brl(summary.comissions?.refundedGrossRevenue ?? 0);

        // Persist per-dashboard row
        await upsertDay(dash.id, date.str, revenue, profit, expenses, sales, refunds);

        // Accumulate into cross-dashboard totals
        const prev = allByDate.get(date.str) ?? { revenue: 0, profit: 0, expenses: 0, sales: 0, refunds: 0 };
        allByDate.set(date.str, {
          revenue: prev.revenue + revenue,
          profit: prev.profit + profit,
          expenses: prev.expenses + expenses,
          sales: prev.sales + sales,
          refunds: prev.refunds + refunds,
        });

        // Throttle between successful calls: ~800ms = ~75 req/min (under 60/min limit)
        await new Promise((r) => setTimeout(r, 850));
      }
    }

    // ── 3. Persist consolidated "ALL" rows AFTER processing every dashboard ─
    for (const [dateStr, totals] of allByDate.entries()) {
      await upsertDay("ALL", dateStr, totals.revenue, totals.profit, totals.expenses, totals.sales, totals.refunds);
    }

    // ── 4. Log success ──────────────────────────────────────────────────────
    const msg = `${offersCount} dashboard${offersCount !== 1 ? "s" : ""} sincronizado${offersCount !== 1 ? "s" : ""} (últimos ${daysToFetch} dias)`;
    await db.insert(syncLogsTable).values({ status: "success", message: msg, offersCount });
    logger.info({ offersCount, msg }, "Sync completed");

    return { status: "success", lastSyncAt: new Date().toISOString(), offersCount, message: msg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    logger.error({ err }, "Sync failed");
    await db.insert(syncLogsTable).values({ status: "error", message: `Erro: ${msg}`, offersCount });
    return { status: "error", lastSyncAt: new Date().toISOString(), offersCount, message: `Erro: ${msg}` };
  } finally {
    _syncing = false;
  }
}
