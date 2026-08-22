# Hybris Test Automation Dashboard

A web-based test automation and performance monitoring dashboard for SAP Hybris B2C e-commerce storefronts. QA engineers enter a storefront URL, select modules to test, and get an interactive results dashboard with pass/fail status, performance trends, and drill-down detail.

## Run & Operate

- `pnpm --filter @workspace/dashboard run dev` — run the frontend dashboard (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Environment Variables

- `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)
- `VITE_SUPABASE_URL` — Supabase project URL (for Auth)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (for Auth)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + shadcn/ui + Recharts + wouter + @supabase/supabase-js
- API: Express 5 (artifacts/api-server)
- DB: PostgreSQL + Drizzle ORM (built-in Replit DB)
- Auth: Supabase Auth — Email/Password + GitHub OAuth (Replit Auth explicitly excluded)
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- Test Engine: Simulated runner (MVP) — produces realistic pass/fail/warning results for all 10 modules

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (testRuns, testResults, performanceMetrics)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/testRunner.ts` — Simulated Playwright test runner
- `artifacts/api-server/src/middlewares/auth.ts` — Supabase JWT decode middleware
- `artifacts/dashboard/src/` — React frontend (pages, components, auth context)
- `artifacts/dashboard/src/lib/supabase.ts` — Supabase client (uses VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
- `artifacts/dashboard/src/contexts/AuthContext.tsx` — Auth state, session management
- `lib/api-client-react/src/custom-fetch.ts` — Patched to inject Bearer token from Supabase session

## Architecture decisions

- Uses the built-in Replit Postgres DB (not Supabase DB) for all test data — keeps data in one place with rollback support.
- Supabase is used exclusively for Auth (email/password + GitHub OAuth) per the PRD requirement.
- The backend decodes Supabase JWTs without full verification (sufficient for MVP); add `jsonwebtoken` + `SUPABASE_JWT_SECRET` for production hardening.
- Test execution is simulated in-process (fire-and-forget async) for Phase 1 MVP; Phase 2 would wire real Playwright sessions.
- Orval 8.x generates `zod.int()` (Zod v4 syntax) but the workspace uses Zod v3; the codegen script post-processes the generated file with `sed` to replace `zod.int()` → `zod.number()`.

## Test Modules

Home, Login, Navigation, Search, Category, Filters, PLP, PDP, Cart, Checkout (10 modules, ~50 total scenarios)

## Performance Pages

Home (2500ms threshold), PLP (3000ms threshold), PDP (3000ms threshold) — TTFB, FCP, LCP, Load Time captured per run.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, re-run codegen AND `pnpm run typecheck:libs` before checking artifact packages.
- The codegen `sed` fix for `zod.int()` only patches `lib/api-zod/src/generated/api.ts` — if Orval changes its output path, update the script in `lib/api-spec/package.json`.
- Do not add artifact routes to root `tsconfig.json` references.
