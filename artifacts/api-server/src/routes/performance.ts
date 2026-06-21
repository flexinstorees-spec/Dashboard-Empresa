import { Router } from "express";
import { getPerformanceData } from "../lib/metrics";
import { GetPerformanceQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = GetPerformanceQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const period = params.period ?? "last30days";
  const startDate = params.startDate ?? undefined;
  const endDate = params.endDate ?? undefined;

  const data = await getPerformanceData(period, startDate as string | undefined, endDate as string | undefined);
  res.json(data);
});

export default router;
