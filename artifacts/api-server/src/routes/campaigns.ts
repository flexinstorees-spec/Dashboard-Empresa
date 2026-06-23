import { Router } from "express";
import { db } from "@workspace/db";
import { appSettingsTable, offersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { initMcp, callTool, resetMcp, setMcpToken } from "../lib/mcp-client";

const router = Router();

interface RawCampaign {
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
  cpp: number;
  impressions: number;
  inlineLinkClicks: number;
  inlineLinkClickCtr: number;
  profitMargin: number;
  dailyBudget: number | null;
}

const cache = new Map<string, { data: ReturnType<typeof mapCampaign>[]; expiresAt: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000;

const BRT_OFFSET_HOURS = -3;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function getBrtToday(): { y: number; m: number; d: number } {
  const now = new Date();
  const brtMs = now.getTime() + BRT_OFFSET_HOURS * 60 * 60 * 1000;
  const brt = new Date(brtMs);
  return { y: brt.getUTCFullYear(), m: brt.getUTCMonth(), d: brt.getUTCDate() };
}

function shiftDays(date: { y: number; m: number; d: number }, days: number) {
  const dt = new Date(Date.UTC(date.y, date.m, date.d + days));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

function toIso(date: { y: number; m: number; d: number }, endOfDay: boolean): string {
  const time = endOfDay ? "23:59:59" : "00:00:00";
  return `${date.y}-${pad(date.m + 1)}-${pad(date.d)}T${time}-03:00`;
}

function getDateRange(period: string, startDate?: string, endDate?: string): { from: string; to: string } {
  if (startDate && endDate) {
    const startBrt = `${startDate}T00:00:00-03:00`;
    const endBrt = `${endDate}T23:59:59-03:00`;
    return { from: startBrt, to: endBrt };
  }
  const today = getBrtToday();
  let start = { ...today };
  let end = { ...today };

  switch (period) {
    case "today":
      break;
    case "yesterday":
      start = shiftDays(today, -1);
      end = { ...start };
      break;
    case "last7days":
      start = shiftDays(today, -6);
      break;
    case "last30days":
      start = shiftDays(today, -29);
      break;
    case "thismonth":
      start = { y: today.y, m: today.m, d: 1 };
      break;
    case "lastmonth": {
      const firstOfLastMonth = new Date(Date.UTC(today.y, today.m - 1, 1));
      const lastOfLastMonth = new Date(Date.UTC(today.y, today.m, 0));
      start = { y: firstOfLastMonth.getUTCFullYear(), m: firstOfLastMonth.getUTCMonth(), d: 1 };
      end = { y: lastOfLastMonth.getUTCFullYear(), m: lastOfLastMonth.getUTCMonth(), d: lastOfLastMonth.getUTCDate() };
      break;
    }
    default:
      start = shiftDays(today, -29);
  }

  return { from: toIso(start, false), to: toIso(end, true) };
}

function mapCampaign(c: RawCampaign, dashboardName: string) {
  return {
    id: c.id,
    name: c.name,
    dashboard: dashboardName,
    status: c.status,
    effectiveStatus: c.effectiveStatus,
    spend: Math.round(c.spend ?? 0) / 100,
    revenue: Math.round(c.revenue ?? 0) / 100,
    profit: Math.round(c.profit ?? 0) / 100,
    roi: c.roi ?? 0,
    roas: c.roas ?? 0,
    approvedOrdersCount: c.approvedOrdersCount ?? 0,
    refundedOrdersCount: c.refundedOrdersCount ?? 0,
    cpa: Math.round(c.cpa ?? 0) / 100,
    impressions: c.impressions ?? 0,
    clicks: c.inlineLinkClicks ?? 0,
    ctr: c.inlineLinkClickCtr ?? 0,
    profitMargin: c.profitMargin ?? 0,
    dailyBudget: c.dailyBudget != null ? Math.round(c.dailyBudget) / 100 : null,
  };
}

router.get("/", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;
    const period = q.period && q.period !== "custom" ? q.period : "last30days";
    const startDate = q.startDate || undefined;
    const endDate = q.endDate || undefined;
    const forceRefresh = q.force === "true";

    const tokenRows = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, "utmify_token"))
      .limit(1);

    if (!tokenRows.length || !tokenRows[0].value) {
      res.status(400).json({ error: "Token UTMify não configurado. Acesse Configurações." });
      return;
    }

    const cacheKey = startDate && endDate ? `custom:${startDate}:${endDate}` : period;
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        res.json({ campaigns: cached.data, period, cached: true });
        return;
      }
    }

    // Load dashboards dynamically from DB instead of hardcoded list
    const dbOffers = await db.select().from(offersTable);
    if (dbOffers.length === 0) {
      res.json({ campaigns: [], period, cached: false });
      return;
    }

    setMcpToken(tokenRows[0].value);
    resetMcp();
    await initMcp();

    const dateRange = getDateRange(period, startDate, endDate);
    const all: ReturnType<typeof mapCampaign>[] = [];

    for (const offer of dbOffers) {
      try {
        const raw = await callTool("get_meta_ad_objects", {
          dashboardId: offer.id,
          level: "campaign",
          dateRange,
          orderBy: "greater_profit",
        }) as { results?: RawCampaign[] } | RawCampaign[] | null;

        const results: RawCampaign[] = Array.isArray(raw) ? raw : (raw?.results ?? []);
        for (const c of results) {
          all.push(mapCampaign(c, offer.name));
        }

        await new Promise((r) => setTimeout(r, 1200));
      } catch (dashErr) {
        // Skip this dashboard on error and continue with others
        console.error(`Error fetching campaigns for ${offer.name}:`, dashErr);
      }
    }

    all.sort((a, b) => b.profit - a.profit);
    cache.set(cacheKey, { data: all, expiresAt: Date.now() + CACHE_TTL_MS });

    res.json({ campaigns: all, period, cached: false, dateRange });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ error: msg });
  }
});

export default router;
