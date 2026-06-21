import { Router } from "express";
import { getOffersData, getOfferData, getComparisonData } from "../lib/metrics";
import { GetOffersQueryParams, FetchOfferQueryParams, FetchOfferPerformanceQueryParams, GetComparisonQueryParams } from "@workspace/api-zod";
import { getPerformanceData } from "../lib/metrics";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = GetOffersQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const period = params.period ?? "last30days";
  const sortBy = params.sortBy ?? "profit";
  const startDate = params.startDate ?? undefined;
  const endDate = params.endDate ?? undefined;

  const data = await getOffersData(period, sortBy, startDate as string | undefined, endDate as string | undefined);
  res.json(data);
});

router.get("/comparison", async (req, res) => {
  const parsed = GetComparisonQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : { offerIds: "" };
  const offerIds = (params.offerIds ?? "").split(",").filter(Boolean);
  const period = params.period ?? "last30days";
  const startDate = params.startDate ?? undefined;
  const endDate = params.endDate ?? undefined;

  const data = await getComparisonData(offerIds, period, startDate as string | undefined, endDate as string | undefined);
  res.json(data);
});

router.get("/:offerId", async (req, res) => {
  const parsed = FetchOfferQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const period = params.period ?? "last30days";
  const startDate = params.startDate ?? undefined;
  const endDate = params.endDate ?? undefined;

  const data = await getOfferData(req.params.offerId, period, startDate as string | undefined, endDate as string | undefined);
  if (!data) {
    res.status(404).json({ error: "Oferta não encontrada" });
    return;
  }
  res.json(data);
});

router.get("/:offerId/performance", async (req, res) => {
  const parsed = FetchOfferPerformanceQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const period = params.period ?? "last30days";
  const startDate = params.startDate ?? undefined;
  const endDate = params.endDate ?? undefined;

  const data = await getPerformanceData(period, startDate as string | undefined, endDate as string | undefined);
  res.json(data);
});

export default router;
