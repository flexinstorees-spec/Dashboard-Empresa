import { Router } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
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
});

router.post("/", async (req, res) => {
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

  res.json({ success: true, message: "Token salvo com sucesso!" });
});

export default router;
