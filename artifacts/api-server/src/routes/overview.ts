import { Router } from "express";
import { getOverviewMetrics } from "../lib/metrics";
import { GetOverviewQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = GetOverviewQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const period = params.period ?? "today";
  const startDate = params.startDate ?? undefined;
  const endDate = params.endDate ?? undefined;

  const data = await getOverviewMetrics(period, startDate as string | undefined, endDate as string | undefined);
  res.json(data);
});

export default router;
