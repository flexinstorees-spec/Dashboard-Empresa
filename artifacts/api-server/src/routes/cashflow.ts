import { Router } from "express";
import { getCashflowData } from "../lib/metrics";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;
    const period = q.period && q.period !== "custom" ? q.period : (q.startDate && q.endDate ? "custom" : "last30days");
    const startDate = q.startDate || undefined;
    const endDate = q.endDate || undefined;

    const data = await getCashflowData(period, startDate, endDate);
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar fluxo de caixa";
    res.status(500).json({ error: msg });
  }
});

export default router;
