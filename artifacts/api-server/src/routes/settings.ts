import { Router } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { runSync } from "../lib/sync";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(appSettingsTable);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (row.key === "utmify_token") {
        settings["utmify_token"] = row.value ? "••••••••" + row.value.slice(-4) : "";
      } else {
        settings[row.key] = row.value;
      }
    }
    const hasToken = rows.some((r) => r.key === "utmify_token" && r.value);
    res.json({ ...settings, hasToken });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro ao buscar configurações" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { utmify_token } = req.body as { utmify_token?: string };

    if (!utmify_token || typeof utmify_token !== "string" || utmify_token.trim() === "") {
      res.status(400).json({ error: "Token inválido" });
      return;
    }

    const token = utmify_token.trim();

    await db
      .insert(appSettingsTable)
      .values({ key: "utmify_token", value: token })
      .onConflictDoUpdate({
        target: appSettingsTable.key,
        set: { value: token, updatedAt: new Date() },
      });

    // Dispara sincronização automática em background após salvar o token
    runSync().catch(() => null);

    res.json({ success: true, message: "Token salvo! Sincronização iniciada automaticamente." });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erro ao salvar token" });
  }
});

export default router;
