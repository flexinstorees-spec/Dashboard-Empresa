# Painel Financeiro

Uma central financeira consolidada que conecta ao MCP da UTMify para exibir métricas de todas as ofertas em uma única visão.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/painel-financeiro run dev` — run the frontend (port 21752)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + Shadcn UI + Recharts (at `/`)
- API: Express 5 (at `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- MCP: UTMify MCP over HTTP/SSE at `https://mcp.utmify.com.br/mcp/`

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/db/src/schema/index.ts` — DB schema (sync_logs, offers, daily_metrics)
- `artifacts/api-server/src/lib/mcp-client.ts` — MCP HTTP client
- `artifacts/api-server/src/lib/sync.ts` — MCP sync logic
- `artifacts/api-server/src/lib/metrics.ts` — metric aggregation from DB
- `artifacts/api-server/src/routes/` — API route handlers
- `artifacts/painel-financeiro/src/` — React frontend

## Architecture decisions

- MCP is called server-side (backend), never from the frontend — avoids CORS issues and keeps the token secure
- Metrics are persisted to PostgreSQL after each sync so historical data survives between sessions
- `daily_metrics` table uses `offerId = "ALL"` for consolidated metrics; per-offer rows use the offer ID
- Orval config uses `mode: "single"` (no separate types directory) for the Zod output to avoid TS2308 barrel collisions when path params exist
- `lib/api-zod/src/index.ts` only exports from `./generated/api` (not `./generated/types`) for the same reason

## Product

- **Visão Geral** — consolidated KPIs with period filter (today/yesterday/7d/30d/this month/last month)
- **Desempenho** — daily charts for revenue, profit, expenses with period comparison
- **Ofertas** — all offers sortable by profit/revenue/ROI/sales
- **Detalhes da Oferta** — per-offer metrics + historical charts
- **Comparação** — multi-offer side-by-side comparison charts
- **Fluxo de Caixa** — cumulative cash flow area charts
- Sync status badge + manual sync button in sidebar
- Dark/light theme toggle, mobile-first with bottom navigation

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change that adds path-param routes, re-check for TS2308 collisions. Use entity-shaped operationIds (avoid `get<Entity>` + `{entityId}` combos that produce `Get<Entity>Params` collisions)
- The Orval `mode: "split"` for the Zod output regenerates the barrel with `export * from "./generated/types"` which causes TS2308 collisions — keep `mode: "single"` and `target: "generated/api.ts"` for the zod config
- Sync runs fire-and-forget (POST /api/sync returns immediately, sync happens in background)
- The MCP token is embedded in the URL — do not log the full MCP_URL in production

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
