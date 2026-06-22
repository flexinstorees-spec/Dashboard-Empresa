import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { runSync } from "./lib/sync";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// ── Cron: sincroniza todo dia às 00:00 horário de Brasília (03:00 UTC) ──────
cron.schedule(
  "0 3 * * *",
  () => {
    logger.info("Cron: iniciando sincronização automática (00:00 BRT)");
    runSync()
      .then((result) => logger.info({ result }, "Cron: sincronização concluída"))
      .catch((err) => logger.error({ err }, "Cron: erro na sincronização"));
  },
  { timezone: "UTC" }
);

logger.info("Cron agendado: sincronização automática todo dia às 00:00 BRT (03:00 UTC)");
