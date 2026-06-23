import { Router } from "express";
import { getPerformanceData } from "../lib/metrics";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;
    const period = q.period && q.period !== "custom" ? q.period : (q.startDate && q.endDate ? "custom" : "last30days");
    const startDate = q.startDate || undefined;
    const endDate = q.endDate || undefined;

    const data = await getPerformanceData(period, startDate, endDate);
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar desempenho";
    res.status(500).json({ error: msg });
  }
});

export default router;
