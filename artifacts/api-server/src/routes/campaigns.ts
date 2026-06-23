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

// In-memory cache: key=`${period}`, value={data, expiresAt}
const cache = new Map<string, { data: ReturnType<typeof mapCampaign>[]; expiresAt: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(d: Date, tzOffset: number, endOfDay = false): string {
  const sign = tzOffset >= 0 ? "+" : "-";
  const abs = Math.abs(tzOffset);
  const time = endOfDay ? "23:59:59" : "00:00:00";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}${sign}${pad(abs)}:00`;
}

function getDateRange(period: string, tzOffset = -3): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start: Date;
  let end: Date = today;

  switch (period) {
    case "today":
      start = today;
      break;
    case "yesterday": {
      const y = new Date(today.getTime() - 86400000);
      start = y; end = y;
      break;
    }
    case "last7days":
      start = new Date(today.getTime() - 6 * 86400000);
      break;
    case "thismonth":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "lastmonth":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    default:
      start = new Date(today.getTime() - 29 * 86400000);
  }

  return { from: toIso(start, tzOffset, false), to: toIso(end, tzOffset, true) };
}

function mapCampaign(c: RawCampaign, dashboardName: string) {
  return {
    id: c.id,
    name: c.name,
    dashboard: dashboardName,
    status: c.status,
    effectiveStatus: c.effectiveStatus,
    spend: (c.spend ?? 0) / 100,
    revenue: (c.revenue ?? 0) / 100,
    profit: (c.profit ?? 0) / 100,
    roi: c.roi ?? 0,
    roas: c.roas ?? 0,
    approvedOrdersCount: c.approvedOrdersCount ?? 0,
    refundedOrdersCount: c.refundedOrdersCount ?? 0,
    cpa: (c.cpa ?? 0) / 100,
    impressions: c.impressions ?? 0,
    clicks: c.inlineLinkClicks ?? 0,
    ctr: c.inlineLinkClickCtr ?? 0,
    profitMargin: c.profitMargin ?? 0,
    dailyBudget: c.dailyBudget != null ? c.dailyBudget / 100 : null,
  };
}

// GET /api/campaigns?period=last30days
router.get("/", async (req, res) => {
  const { period = "last30days" } = req.query as Record<string, string>;

  const tokenRows = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, "utmify_token"))
    .limit(1);

  if (!tokenRows.length || !tokenRows[0].value) {
    res.status(400).json({ error: "Token UTMify não configurado. Acesse Configurações." });
    return;
  }

  // Serve from cache if fresh
  const cacheKey = period;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    res.json({ campaigns: cached.data, period, cached: true });
    return;
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

      // Throttle between dashboard fetches
      await new Promise((r) => setTimeout(r, 1200));
    }

    // Sort by profit descending (best first)
    all.sort((a, b) => b.profit - a.profit);

    // Save to cache
    cache.set(cacheKey, { data: all, expiresAt: Date.now() + CACHE_TTL_MS });

    res.json({ campaigns: all, period, cached: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ error: msg });
  }
});

export default router;
