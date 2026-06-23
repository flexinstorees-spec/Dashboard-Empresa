import { Router } from "express";
import { getOverviewMetrics } from "../lib/metrics";
import { GetOverviewQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const parsed = GetOverviewQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    const period = params.period ?? "today";
    const startDate = params.startDate as string | undefined;
    const endDate = params.endDate as string | undefined;

    const data = await getOverviewMetrics(period, startDate, endDate);
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar visão geral";
    res.status(500).json({ error: msg });
  }
});

export default router;
