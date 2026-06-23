import { Router } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
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

const DASHBOARDS = [
  { id: "674db4d157e6328d0794c11f", name: "COSTURA" },
  { id: "69e7c854eb1c09f769d03754", name: "CERAMICA" },
];

// In-memory cache
const cache = new Map<string, { data: ReturnType<typeof mapCampaign>[]; expiresAt: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

// ---------------------------------------------------------------------------
// Timezone-aware date helpers (always use BRT = UTC-3)
// ---------------------------------------------------------------------------

const BRT_OFFSET_HOURS = -3;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Returns the current {year, month(0-based), day} in BRT (UTC-3). */
function getBrtToday(): { y: number; m: number; d: number } {
  const now = new Date();
  // Shift UTC timestamp by BRT offset to get the "local" instant
  const brtMs = now.getTime() + BRT_OFFSET_HOURS * 60 * 60 * 1000;
  const brt = new Date(brtMs);
  return { y: brt.getUTCFullYear(), m: brt.getUTCMonth(), d: brt.getUTCDate() };
}

/** Add `days` (can be negative) to a {y,m,d} struct, returning a new struct. */
function shiftDays(date: { y: number; m: number; d: number }, days: number) {
  const dt = new Date(Date.UTC(date.y, date.m, date.d + days));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

/** Format a {y,m,d} as an ISO 8601 string with BRT offset. */
function toIso(date: { y: number; m: number; d: number }, endOfDay: boolean): string {
  const time = endOfDay ? "23:59:59" : "00:00:00";
  return `${date.y}-${pad(date.m + 1)}-${pad(date.d)}T${time}-03:00`;
}

/**
 * Build a UTMify-compatible dateRange for the given period.
 * All dates are anchored to BRT (UTC-3) regardless of server timezone.
 */
function getDateRange(period: string): { from: string; to: string } {
  const today = getBrtToday();
  let start = { ...today };
  let end = { ...today };

  switch (period) {
    case "today":
      // start = today, end = today  (already set)
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
      start = {
        y: firstOfLastMonth.getUTCFullYear(),
        m: firstOfLastMonth.getUTCMonth(),
        d: 1,
      };
      end = {
        y: lastOfLastMonth.getUTCFullYear(),
        m: lastOfLastMonth.getUTCMonth(),
        d: lastOfLastMonth.getUTCDate(),
      };
      break;
    }
    default:
      start = shiftDays(today, -29);
  }

  return { from: toIso(start, false), to: toIso(end, true) };
}

// ---------------------------------------------------------------------------
// Campaign mapper
// ---------------------------------------------------------------------------

function mapCampaign(c: RawCampaign, dashboardName: string) {
  return {
    id: c.id,
    name: c.name,
    dashboard: dashboardName,
    status: c.status,
    effectiveStatus: c.effectiveStatus,
    // All monetary UTMify values come in centavos — divide by 100 for BRL
    spend: Math.round((c.spend ?? 0)) / 100,
    revenue: Math.round((c.revenue ?? 0)) / 100,
    profit: Math.round((c.profit ?? 0)) / 100,
    roi: c.roi ?? 0,
    roas: c.roas ?? 0,
    approvedOrdersCount: c.approvedOrdersCount ?? 0,
    refundedOrdersCount: c.refundedOrdersCount ?? 0,
    cpa: Math.round((c.cpa ?? 0)) / 100,
    impressions: c.impressions ?? 0,
    clicks: c.inlineLinkClicks ?? 0,
    ctr: c.inlineLinkClickCtr ?? 0,
    profitMargin: c.profitMargin ?? 0,
    dailyBudget: c.dailyBudget != null ? Math.round(c.dailyBudget) / 100 : null,
  };
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

// GET /api/campaigns?period=last30days[&force=true]
router.get("/", async (req, res) => {
  const { period = "last30days", force } = req.query as Record<string, string>;
  const forceRefresh = force === "true";

  const tokenRows = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, "utmify_token"))
    .limit(1);

  if (!tokenRows.length || !tokenRows[0].value) {
    res.status(400).json({ error: "Token UTMify não configurado. Acesse Configurações." });
    return;
  }

  // Serve from cache unless force refresh
  const cacheKey = period;
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      res.json({ campaigns: cached.data, period, cached: true });
      return;
    }
  }

  try {
    setMcpToken(tokenRows[0].value);
    resetMcp();
    await initMcp();

    const dateRange = getDateRange(period);
    const all: ReturnType<typeof mapCampaign>[] = [];

    for (const dashboard of DASHBOARDS) {
      const raw = await callTool("get_meta_ad_objects", {
        dashboardId: dashboard.id,
        level: "campaign",
        dateRange,
        orderBy: "greater_profit",
      }) as { results?: RawCampaign[] } | RawCampaign[] | null;

      const results: RawCampaign[] = Array.isArray(raw) ? raw : (raw?.results ?? []);
      for (const c of results) {
        all.push(mapCampaign(c, dashboard.name));
      }

      await new Promise((r) => setTimeout(r, 1200));
    }

    // Sort by profit descending
    all.sort((a, b) => b.profit - a.profit);

    // Update cache (always after a fresh fetch)
    cache.set(cacheKey, { data: all, expiresAt: Date.now() + CACHE_TTL_MS });

    res.json({ campaigns: all, period, cached: false, dateRange });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ error: msg });
  }
});

export default router;
