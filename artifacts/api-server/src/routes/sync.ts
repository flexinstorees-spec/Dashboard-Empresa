import { Router } from "express";
import { getLastSyncStatus, runSync } from "../lib/sync";

const router = Router();

router.get("/status", async (_req, res) => {
  const status = await getLastSyncStatus();
  res.json(status);
});

router.post("/", async (_req, res) => {
  // Fire-and-forget: start sync in background, return immediately
  runSync().catch(() => null);

  res.json({
    status: "syncing",
    lastSyncAt: null,
    offersCount: 0,
    message: "Sincronização iniciada...",
  });
});

export default router;
