import { Router } from "express";
import { getCashflowData } from "../lib/metrics";
import { GetCashflowQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = GetCashflowQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const period = params.period ?? "last30days";
  const startDate = params.startDate ?? undefined;
  const endDate = params.endDate ?? undefined;

  const data = await getCashflowData(period, startDate as string | undefined, endDate as string | undefined);
  res.json(data);
});

export default router;
