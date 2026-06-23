import { Router } from "express";
import { getOffersData, getOfferData, getComparisonData, getPerformanceData } from "../lib/metrics";
import { GetOffersQueryParams, FetchOfferQueryParams, FetchOfferPerformanceQueryParams, GetComparisonQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const parsed = GetOffersQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    const period = params.period ?? "last30days";
    const sortBy = params.sortBy ?? "profit";
    const startDate = params.startDate as string | undefined;
    const endDate = params.endDate as string | undefined;

    const data = await getOffersData(period, sortBy, startDate, endDate);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro ao buscar ofertas" });
  }
});

router.get("/comparison", async (req, res) => {
  try {
    const parsed = GetComparisonQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : { offerIds: "" };
    const offerIds = (params.offerIds ?? "").split(",").filter(Boolean);
    const period = params.period ?? "last30days";
    const startDate = params.startDate as string | undefined;
    const endDate = params.endDate as string | undefined;

    const data = await getComparisonData(offerIds, period, startDate, endDate);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro ao buscar comparação" });
  }
});

router.get("/:offerId", async (req, res) => {
  try {
    const parsed = FetchOfferQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    const period = params.period ?? "last30days";
    const startDate = params.startDate as string | undefined;
    const endDate = params.endDate as string | undefined;

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
    const parsed = FetchOfferPerformanceQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    const period = params.period ?? "last30days";
    const startDate = params.startDate as string | undefined;
    const endDate = params.endDate as string | undefined;

    const data = await getPerformanceData(period, startDate, endDate, req.params.offerId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro ao buscar desempenho" });
  }
});

export default router;
