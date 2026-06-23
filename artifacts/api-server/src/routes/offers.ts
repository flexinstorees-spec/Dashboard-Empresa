import { Router } from "express";
import { getOffersData, getOfferData, getComparisonData, getPerformanceData } from "../lib/metrics";

const router = Router();

function extractParams(q: Record<string, string>, defaultPeriod: string) {
  const period = q.period && q.period !== "custom" ? q.period : (q.startDate && q.endDate ? "custom" : defaultPeriod);
  return {
    period,
    startDate: q.startDate || undefined,
    endDate: q.endDate || undefined,
  };
}

router.get("/", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;
    const { period, startDate, endDate } = extractParams(q, "last30days");
    const sortBy = q.sortBy ?? "profit";

    const data = await getOffersData(period, sortBy, startDate, endDate);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro ao buscar ofertas" });
  }
});

router.get("/comparison", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;
    const { period, startDate, endDate } = extractParams(q, "last30days");
    const offerIds = (q.offerIds ?? "").split(",").filter(Boolean);

    const data = await getComparisonData(offerIds, period, startDate, endDate);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro ao buscar comparação" });
  }
});

router.get("/:offerId", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;
    const { period, startDate, endDate } = extractParams(q, "last30days");

    const data = await getOfferData(req.params.offerId, period, startDate, endDate);
    if (!data) {
      res.status(404).json({ error: "Oferta não encontrada" });
      return;
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro ao buscar oferta" });
  }
});

router.get("/:offerId/performance", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;
    const { period, startDate, endDate } = extractParams(q, "last30days");

    const data = await getPerformanceData(period, startDate, endDate, req.params.offerId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro ao buscar desempenho" });
  }
});

export default router;
