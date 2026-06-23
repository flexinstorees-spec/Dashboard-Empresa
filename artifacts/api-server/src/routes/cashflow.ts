import { Router } from "express";
import { getCashflowData } from "../lib/metrics";
import { GetCashflowQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const parsed = GetCashflowQueryParams.safeParse(req.query);
    const params = parsed.success ? parsed.data : {};
    const period = params.period ?? "last30days";
    const startDate = params.startDate as string | undefined;
    const endDate = params.endDate as string | undefined;

    const data = await getCashflowData(period, startDate, endDate);
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar fluxo de caixa";
    res.status(500).json({ error: msg });
  }
});

export default router;
