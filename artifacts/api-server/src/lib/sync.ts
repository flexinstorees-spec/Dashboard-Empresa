import { db } from "@workspace/db";
import { syncLogsTable, offersTable, dailyMetricsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { initializeMcp, callMcpTool, getAvailableTools, resetSession } from "./mcp-client";
import { logger } from "./logger";

let isSyncing = false;

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
    .orderBy(syncLogsTable.createdAt)
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

function parseDateString(d: string): string {
  // Ensure YYYY-MM-DD format
  return d.substring(0, 10);
}

function extractNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val.replace(",", ".")) || 0;
  return 0;
}

async function persistMetrics(offerId: string, dailyData: Array<Record<string, unknown>>): Promise<void> {
  for (const day of dailyData) {
    const dateStr = parseDateString(String(day.date || day.day || ""));
    if (!dateStr || dateStr === "") continue;

    const existing = await db
      .select({ id: dailyMetricsTable.id })
      .from(dailyMetricsTable)
      .where(and(eq(dailyMetricsTable.offerId, offerId), eq(dailyMetricsTable.date, dateStr)))
      .limit(1);

    const metrics = {
      offerId,
      date: dateStr,
      revenue: extractNumber(day.revenue ?? day.receita ?? day.gross ?? 0),
      profit: extractNumber(day.profit ?? day.lucro ?? 0),
      expenses: extractNumber(day.expenses ?? day.gasto ?? day.spend ?? 0),
      sales: Math.round(extractNumber(day.sales ?? day.vendas ?? day.conversions ?? 0)),
      refunds: extractNumber(day.refunds ?? day.reembolsos ?? 0),
    };

    if (existing.length > 0) {
      await db
        .update(dailyMetricsTable)
        .set({ ...metrics, updatedAt: new Date() })
        .where(eq(dailyMetricsTable.id, existing[0].id));
    } else {
      await db.insert(dailyMetricsTable).values(metrics);
    }
  }
}

export async function runSync(): Promise<SyncResult> {
  if (isSyncing) {
    return { status: "syncing", lastSyncAt: null, offersCount: 0, message: "Sincronização em andamento..." };
  }

  isSyncing = true;
  let offersCount = 0;

  try {
    // Reset and initialize MCP session
    resetSession();
    await initializeMcp();

    const tools = await getAvailableTools();
    logger.info({ toolCount: tools.length, tools: tools.map((t) => t.name) }, "MCP tools discovered");

    // Find tools related to products/offers
    const productTools = tools.filter((t) =>
      t.name.match(/product|offer|gp|list|get.*product/i)
    );
    const statsTools = tools.filter((t) =>
      t.name.match(/stat|metric|revenue|profit|gs|gm|gr|gwe|ga/i)
    );

    logger.info({ productTools: productTools.map((t) => t.name), statsTools: statsTools.map((t) => t.name) }, "Relevant tools");

    // Try to get products/offers list
    let offers: Array<{ id: string; name: string }> = [];

    for (const tool of productTools.slice(0, 3)) {
      try {
        const result = (await callMcpTool(tool.name)) as unknown;
        const data = Array.isArray(result) ? result : (result as Record<string, unknown>)?.data ?? (result as Record<string, unknown>)?.offers ?? (result as Record<string, unknown>)?.products ?? [];
        if (Array.isArray(data) && data.length > 0) {
          offers = (data as Array<Record<string, unknown>>).map((item: Record<string, unknown>) => ({
            id: String(item.id ?? item.offer_id ?? item.product_id ?? Math.random()),
            name: String(item.name ?? item.title ?? item.product_name ?? "Oferta"),
          }));
          break;
        }
      } catch (e) {
        logger.warn({ tool: tool.name, error: e }, "Tool call failed");
      }
    }

    // If no offers found from product tools, use all tools to discover offers
    if (offers.length === 0) {
      for (const tool of tools.slice(0, 5)) {
        try {
          const result = (await callMcpTool(tool.name)) as unknown;
          const arr = Array.isArray(result) ? result : [];
          if (arr.length > 0 && (arr[0] as Record<string, unknown>).id) {
            offers = arr.map((item: unknown) => {
              const i = item as Record<string, unknown>;
              return { id: String(i.id ?? Math.random()), name: String(i.name ?? i.title ?? "Oferta") };
            });
            break;
          }
        } catch {}
      }
    }

    // Upsert offers in DB
    for (const offer of offers) {
      await db
        .insert(offersTable)
        .values({ id: offer.id, name: offer.name })
        .onConflictDoUpdate({
          target: offersTable.id,
          set: { name: offer.name, lastSyncAt: new Date() },
        });
    }
    offersCount = offers.length;

    // Fetch daily stats for each offer and consolidated
    for (const tool of statsTools.slice(0, 3)) {
      try {
        const result = (await callMcpTool(tool.name)) as unknown;
        const data = result as Record<string, unknown>;

        // Check for consolidated daily data
        const daily = data?.daily ?? data?.days ?? data?.data ?? [];
        if (Array.isArray(daily) && daily.length > 0) {
          await persistMetrics("ALL", daily as Array<Record<string, unknown>>);
        }

        // Check for per-offer data
        const offerData = data?.offers ?? data?.products ?? [];
        if (Array.isArray(offerData)) {
          for (const od of offerData as Array<Record<string, unknown>>) {
            const oid = String(od.id ?? od.offer_id ?? "");
            const odDaily = (od.daily ?? od.days ?? []) as Array<Record<string, unknown>>;
            if (oid && odDaily.length > 0) {
              await persistMetrics(oid, odDaily);
            }
          }
        }
      } catch (e) {
        logger.warn({ tool: tool.name, error: e }, "Stats tool failed");
      }
    }

    // Try specific UTMify-style tools
    const specificTools = [
      { name: "gs", offerId: "ALL" },
      { name: "gr", offerId: "ALL" },
      { name: "gm", offerId: "ALL" },
    ];

    for (const { name, offerId } of specificTools) {
      const tool = tools.find((t) => t.name === name || t.name.includes(name));
      if (!tool) continue;
      try {
        const result = (await callMcpTool(tool.name)) as unknown;
        const data = result as Record<string, unknown>;
        const daily = data?.daily ?? data?.days ?? data?.evolution ?? [];
        if (Array.isArray(daily) && daily.length > 0) {
          await persistMetrics(offerId, daily as Array<Record<string, unknown>>);
        }
      } catch {}
    }

    // Log success
    await db.insert(syncLogsTable).values({
      status: "success",
      message: `${offersCount} ofertas sincronizadas com sucesso`,
      offersCount,
    });

    return {
      status: "success",
      lastSyncAt: new Date().toISOString(),
      offersCount,
      message: `${offersCount} ofertas sincronizadas com sucesso`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    logger.error({ error }, "Sync failed");

    await db.insert(syncLogsTable).values({
      status: "error",
      message: `Erro na sincronização: ${msg}`,
      offersCount,
    });

    return {
      status: "error",
      lastSyncAt: new Date().toISOString(),
      offersCount,
      message: `Erro na sincronização: ${msg}`,
    };
  } finally {
    isSyncing = false;
  }
}
