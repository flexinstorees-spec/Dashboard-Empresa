import { Router } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { initMcp, callTool, resetMcp, setMcpToken } from "../lib/mcp-client";

const router = Router();

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
      start = y;
      end = y;
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
    default: // last30days
      start = new Date(today.getTime() - 29 * 86400000);
  }

  return { from: toIso(start, tzOffset, false), to: toIso(end, tzOffset, true) };
}

// GET /api/campaigns?dashboardId=xxx&period=last30days&level=campaign
router.get("/", async (req, res) => {
  const { dashboardId, period = "last30days", level = "campaign" } = req.query as Record<string, string>;

  if (!dashboardId) {
    res.status(400).json({ error: "dashboardId é obrigatório" });
    return;
  }

  // Load token
  const tokenRows = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, "utmify_token"))
    .limit(1);

  if (!tokenRows.length || !tokenRows[0].value) {
    res.status(400).json({ error: "Token UTMify não configurado. Acesse Configurações." });
    return;
  }

  try {
    setMcpToken(tokenRows[0].value);
    resetMcp();
    await initMcp();

    const dateRange = getDateRange(period);

    const raw = await callTool("get_meta_ad_objects", {
      dashboardId,
      level: level as string,
      dateRange,
      orderBy: "greater_profit",
    }) as { results?: RawCampaign[] } | RawCampaign[] | null;

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
      lifetimeBudget: number | null;
    }

    const results: RawCampaign[] = Array.isArray(raw) ? raw : (raw?.results ?? []);

    const campaigns = results.map((c) => ({
      id: c.id,
      name: c.name,
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
      cpp: (c.cpp ?? 0) / 100,
      impressions: c.impressions ?? 0,
      clicks: c.inlineLinkClicks ?? 0,
      ctr: c.inlineLinkClickCtr ?? 0,
      profitMargin: c.profitMargin ?? 0,
      dailyBudget: c.dailyBudget != null ? c.dailyBudget / 100 : null,
    }));

    res.json({ campaigns, period, dashboardId, level });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ error: msg });
  }
});

export default router;
