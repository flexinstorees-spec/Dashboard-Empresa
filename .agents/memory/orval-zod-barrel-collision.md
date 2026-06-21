---
name: Orval Zod barrel TS2308 collision
description: How to fix TS2308 "already exported" errors in lib/api-zod when OpenAPI routes have path parameters
---

# Orval Zod barrel TS2308 collision

## The rule

When the OpenAPI spec has routes with path parameters (e.g. `GET /offers/{offerId}`), Orval generates `<OperationIdPascal>Params` in **both** `generated/api.ts` (as a Zod schema) and `generated/types/<operationId>Params.ts` (as a TypeScript type). The barrel `lib/api-zod/src/index.ts` re-exports both with `export *`, causing:

```
error TS2308: Module "./generated/api" has already exported a member named 'FetchOfferParams'
```

## Fix

In `lib/api-spec/orval.config.ts`, for the `zod` output:
- Set `mode: "single"` (not `"split"`)
- Set `target: "generated/api.ts"` (not just `"generated"`)
- Remove the `schemas: { path: "generated/types", type: "typescript" }` line entirely

Then update `lib/api-zod/src/index.ts` to only export from `./generated/api` (not `./generated/types`).

**Why:** In `mode: "split"`, Orval regenerates the barrel file on every codegen run, re-adding `export * from './generated/types'` even if you manually remove it. In `mode: "single"`, everything goes into one file and no separate types directory is generated, eliminating the collision.

**How to apply:** Any time you add new routes with `{paramId}` path parameters and codegen fails with TS2308, check the orval config for the zod output target.
