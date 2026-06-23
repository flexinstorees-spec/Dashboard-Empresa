import { db } from "@workspace/db";
import { dailyMetricsTable, offersTable } from "@workspace/db";
import { eq, and, gte, lte, sql, ne } from "drizzle-orm";

export type Period = "today" | "yesterday" | "last7days" | "last30days" | "thismonth" | "lastmonth";
export type ChartPeriod = "last7days" | "last30days" | "last90days" | "thismonth" | "lastmonth";

const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;

interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Returns the current date as a UTC-midnight Date anchored to BRT (UTC-3).
 * For example, if UTC is 2026-06-23T00:30Z, BRT is still 2026-06-22,
 * so this returns 2026-06-22T00:00:00Z.
 * Using UTC midnight ensures that toISOString().substring(0,10) gives the BRT date string.
 */
function getBrtToday(): Date {
  const brtNow = new Date(Date.now() + BRT_OFFSET_MS);
  return new Date(Date.UTC(brtNow.getUTCFullYear(), brtNow.getUTCMonth(), brtNow.getUTCDate()));
}

export function getDateRange(period: string, startDate?: string, endDate?: string): DateRange {
  if (startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) };
  }

  const today = getBrtToday();
  const DAY = 86_400_000;

  switch (period) {
    case "today":
      return { start: today, end: new Date(today.getTime() + DAY - 1) };
    case "yesterday": {
      const y = new Date(today.getTime() - DAY);
      return { start: y, end: new Date(today.getTime() - 1) };
    }
    case "last7days":
      return { start: new Date(today.getTime() - 6 * DAY), end: new Date(today.getTime() + DAY - 1) };
    case "last30days":
      return { start: new Date(today.getTime() - 29 * DAY), end: new Date(today.getTime() + DAY - 1) };
    case "last90days":
      return { start: new Date(today.getTime() - 89 * DAY), end: new Date(today.getTime() + DAY - 1) };
    case "thismonth": {
      const brtNow = new Date(Date.now() + BRT_OFFSET_MS);
      const firstOfMonth = new Date(Date.UTC(brtNow.getUTCFullYear(), brtNow.getUTCMonth(), 1));
      return { start: firstOfMonth, end: new Date(today.getTime() + DAY - 1) };
    }
    case "lastmonth": {
      const brtNow = new Date(Date.now() + BRT_OFFSET_MS);
      const firstOfLastMonth = new Date(Date.UTC(brtNow.getUTCFullYear(), brtNow.getUTCMonth() - 1, 1));
      const lastOfLastMonth = new Date(Date.UTC(brtNow.getUTCFullYear(), brtNow.getUTCMonth(), 0, 23, 59, 59, 999));
      return { start: firstOfLastMonth, end: lastOfLastMonth };
    }
    default:
      return { start: new Date(today.getTime() - 29 * DAY), end: new Date(today.getTime() + DAY - 1) };
  }
}

/** Format Date → "YYYY-MM-DD" using UTC fields (safe because getBrtToday returns UTC midnight of BRT date). */
function toDateStr(d: Date): string {
  return d.toISOString().substring(0, 10);
}

interface DailyRow {
  date: string;
  revenue: number;
  profit: number;
  expenses: number;
  sales: number;
  refunds: number;
}

async function getDailyRows(offerId: string, range: DateRange): Promise<DailyRow[]> {
  const rows = await db
    .select()
    .from(dailyMetricsTable)
    .where(
      and(
        eq(dailyMetricsTable.offerId, offerId),
        gte(dailyMetricsTable.date, toDateStr(range.start)),
        lte(dailyMetricsTable.date, toDateStr(range.end))
      )
    )
    .orderBy(dailyMetricsTable.date);

  return rows.map((r) => ({
    date: r.date,
    revenue: r.revenue ?? 0,
    profit: r.profit ?? 0,
    expenses: r.expenses ?? 0,
    sales: r.sales ?? 0,
    refunds: r.refunds ?? 0,
  }));
}

function sumRows(rows: DailyRow[]) {
  return rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      profit: acc.profit + r.profit,
      expenses: acc.expenses + r.expenses,
      sales: acc.sales + r.sales,
      refunds: acc.refunds + r.refunds,
    }),
    { revenue: 0, profit: 0, expenses: 0, sales: 0, refunds: 0 }
  );
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export async function getOverviewMetrics(period: string, startDate?: string, endDate?: string) {
  const range = getDateRange(period, startDate, endDate);
  const rangeDays = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000));
  const prevRange: DateRange = {
    start: new Date(range.start.getTime() - rangeDays * 86_400_000),
    end: new Date(range.start.getTime() - 1),
  };

  const todayRange = getDateRange("today");

  const [rows, prevRows, todayRows] = await Promise.all([
    getDailyRows("ALL", range),
    getDailyRows("ALL", prevRange),
    getDailyRows("ALL", todayRange),
  ]);

  const totals = sumRows(rows);
  const prevTotals = sumRows(prevRows);
  const todayTotals = sumRows(todayRows);

  const roi = totals.expenses > 0 ? (totals.profit / totals.expenses) * 100 : 0;
  const avgTicket = totals.sales > 0 ? totals.revenue / totals.sales : 0;

  return {
    totalRevenue: totals.revenue,
    totalProfit: totals.profit,
    totalExpenses: totals.expenses,
    roi,
    totalSales: totals.sales,
    avgTicket,
    totalRefunds: totals.refunds,
    todayRevenue: todayTotals.revenue,
    todayProfit: todayTotals.profit,
    todayExpenses: todayTotals.expenses,
    todaySales: todayTotals.sales,
    period,
    comparisonPrevious: {
      revenueChange: pctChange(totals.revenue, prevTotals.revenue),
      profitChange: pctChange(totals.profit, prevTotals.profit),
      expensesChange: pctChange(totals.expenses, prevTotals.expenses),
      salesChange: pctChange(totals.sales, prevTotals.sales),
    },
  };
}

export async function getPerformanceData(period: string, startDate?: string, endDate?: string) {
  const range = getDateRange(period, startDate, endDate);
  const rows = await getDailyRows("ALL", range);
  const count = rows.length || 1;

  return {
    daily: rows.map((r) => ({ date: r.date, revenue: r.revenue, profit: r.profit, expenses: r.expenses, sales: r.sales })),
    avgRevenue: rows.reduce((s, r) => s + r.revenue, 0) / count,
    avgProfit: rows.reduce((s, r) => s + r.profit, 0) / count,
    avgExpenses: rows.reduce((s, r) => s + r.expenses, 0) / count,
    period,
  };
}

export async function getOffersData(period: string, sortBy: string, startDate?: string, endDate?: string) {
  const range = getDateRange(period, startDate, endDate);

  const dbOffers = await db.select().from(offersTable);

  const results = await Promise.all(
    dbOffers.map(async (offer) => {
      const rows = await getDailyRows(offer.id, range);
      const totals = sumRows(rows);
      const roi = totals.expenses > 0 ? (totals.profit / totals.expenses) * 100 : 0;
      const avgTicket = totals.sales > 0 ? totals.revenue / totals.sales : 0;
      return {
        id: offer.id,
        name: offer.name,
        revenue: totals.revenue,
        profit: totals.profit,
        expenses: totals.expenses,
        roi,
        sales: totals.sales,
        avgTicket,
        refunds: totals.refunds,
      };
    })
  );

  const sortFn: Record<string, (a: (typeof results)[0], b: (typeof results)[0]) => number> = {
    profit: (a, b) => b.profit - a.profit,
    revenue: (a, b) => b.revenue - a.revenue,
    roi: (a, b) => b.roi - a.roi,
    sales: (a, b) => b.sales - a.sales,
  };

  return results.sort(sortFn[sortBy] ?? sortFn.profit);
}

export async function getOfferData(offerId: string, period: string, startDate?: string, endDate?: string) {
  const range = getDateRange(period, startDate, endDate);
  const [offer, rows] = await Promise.all([
    db.select().from(offersTable).where(eq(offersTable.id, offerId)).limit(1),
    getDailyRows(offerId, range),
  ]);

  if (offer.length === 0) return null;

  const totals = sumRows(rows);
  const roi = totals.expenses > 0 ? (totals.profit / totals.expenses) * 100 : 0;
  const avgTicket = totals.sales > 0 ? totals.revenue / totals.sales : 0;

  return {
    id: offerId,
    name: offer[0].name,
    revenue: totals.revenue,
    profit: totals.profit,
    expenses: totals.expenses,
    roi,
    sales: totals.sales,
    avgTicket,
    refunds: totals.refunds,
    daily: rows.map((r) => ({ date: r.date, revenue: r.revenue, profit: r.profit, expenses: r.expenses, sales: r.sales })),
  };
}

export async function getComparisonData(offerIds: string[], period: string, startDate?: string, endDate?: string) {
  const range = getDateRange(period, startDate, endDate);

  const offers = await Promise.all(
    offerIds.map(async (id) => {
      const [offerRow, rows] = await Promise.all([
        db.select().from(offersTable).where(eq(offersTable.id, id)).limit(1),
        getDailyRows(id, range),
      ]);
      const totals = sumRows(rows);
      const roi = totals.expenses > 0 ? (totals.profit / totals.expenses) * 100 : 0;
      const avgTicket = totals.sales > 0 ? totals.revenue / totals.sales : 0;

      return {
        id,
        name: offerRow[0]?.name ?? id,
        revenue: totals.revenue,
        profit: totals.profit,
        roi,
        sales: totals.sales,
        avgTicket,
        daily: rows.map((r) => ({ date: r.date, revenue: r.revenue, profit: r.profit, expenses: r.expenses, sales: r.sales })),
      };
    })
  );

  return { offers, period };
}

export async function getCashflowData(period: string, startDate?: string, endDate?: string) {
  const range = getDateRange(period, startDate, endDate);
  const rows = await getDailyRows("ALL", range);

  let cumRevenue = 0;
  let cumExpenses = 0;
  let cumProfit = 0;

  const entries = rows.map((r) => {
    cumRevenue += r.revenue;
    cumExpenses += r.expenses;
    cumProfit += r.profit;
    return {
      date: r.date,
      cumulativeRevenue: cumRevenue,
      cumulativeExpenses: cumExpenses,
      cumulativeProfit: cumProfit,
      dailyRevenue: r.revenue,
      dailyExpenses: r.expenses,
      dailyProfit: r.profit,
    };
  });

  const totals = sumRows(rows);
  return {
    entries,
    totalRevenue: totals.revenue,
    totalExpenses: totals.expenses,
    totalProfit: totals.profit,
    period,
  };
}
