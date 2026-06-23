import { Router } from "express";
import { getOverviewMetrics } from "../lib/metrics";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;
    const period = q.period && q.period !== "custom" ? q.period : (q.startDate && q.endDate ? "custom" : "today");
    const startDate = q.startDate || undefined;
    const endDate = q.endDate || undefined;

    const data = await getOverviewMetrics(period, startDate, endDate);
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar visão geral";
    res.status(500).json({ error: msg });
  }
});

export default router;
