# Pantry Lens — TODO

Actionable checklist derived from `IMPLEMENTATION_PLAN.md`.  
**Primary reviewer document:** `README.md`.

Check items only when they are verifiably complete.  
External verification (Docker/MySQL, live Stripe) remains unchecked where not executed.

**Locked decisions:** npm workspaces; Docker MySQL; barcode detail page; nutrition detail-only; entitlement `active`|`trialing` only; €4.99/mo Stripe test price; no Customer Portal; app name Pantry Lens; no shared types package; recent-search trim/empty-reject/case-normalize; OFF search `/cgi/search.pl` + product `/api/v3/product/{code}`; Stripe webhooks re-fetch subscription on created/updated.

---

## Phase 1: Project foundation

- [x] Initialize git repository (if not already)
- [x] Add root `.gitignore` (node_modules, .env, dist, .next, coverage)
- [x] Create npm workspaces root `package.json` with `apps/*`
- [x] Scaffold `apps/web` (Next.js App Router, TypeScript, Tailwind CSS)
- [x] Scaffold `apps/api` (Express, TypeScript, tsx/ts-node-dev)
- [x] Add root scripts: `dev:web`, `dev:api`, `build`, `lint`, `test`, `typecheck`
- [x] Add `docker-compose.yml` for MySQL
- [x] Create root `.env.example` with all intended variables
- [x] Verify `apps/web` starts on its port
- [x] Verify `apps/api` starts on its port (including basic `GET /api/health`)
- [x] Document local ports in README

## Phase 2: Prisma / MySQL / demo user

- [x] Add Prisma to `apps/api`
- [x] Define `User`, `RecentSearch` (`queryKey` + `queryDisplay`), `Subscription`, `StripeEvent` models
- [x] Create initial Prisma migration (generated via `prisma migrate diff --from-empty`; included under `apps/api/prisma/migrations/`)
- [x] Configure `DATABASE_URL` for local Docker MySQL
- [ ] Start MySQL via Docker Compose *(verification blocker: Docker unavailable in this environment)*
- [ ] Run migration successfully on empty database *(verification blocker)*
- [x] Write idempotent seed creating demo user
- [ ] Verify demo user exists in MySQL after seed *(verification blocker)*

## Phase 3: Express API foundation

- [x] Add env validation (fail fast on missing required vars in non-test)
- [x] Configure CORS for web origin
- [x] Add JSON body parser (exclude Stripe webhook path later)
- [x] Add centralized error middleware
- [x] Implement `GET /api/health` (may already exist from Phase 1)
- [x] Implement `GET /api/user` returning demo user + `hasNutritionAccess: false`
- [x] Verify with curl/HTTP client (`/api/health` 200; `/api/user` normalized 503 without MySQL — success path still DB-blocked)

## Phase 4: Open Food Facts integration

- [x] Create OFF client with User-Agent and timeout
- [x] Implement full-text search via `/cgi/search.pl` (intentional; not v2/v3 search)
- [x] Implement barcode lookup via `/api/v3/product/{code}` (fall back to v2 only if field compatibility fails)
- [x] Implement product normalizer (name, brand, image, nutrition fields) inside Express integration layer only
- [x] Implement language fallback for product names
- [x] Implement `GET /api/products/search` (never include nutrition fields)
- [x] Implement `GET /api/products/:barcode` (omit nutrition until Phase 11)
- [x] Handle upstream errors as safe API errors
- [x] Verify search and barcode manually with real OFF data (intermittent OFF 503/HTML overload observed; mapped to `OFF_UPSTREAM`)

## Phase 5: Search frontend

- [x] Add API client using `NEXT_PUBLIC_API_BASE_URL`
- [x] Build header with app name **Pantry Lens**
- [x] Build search input + submit
- [x] Wire loading state
- [x] Render results list (name, brand, image/placeholder)
- [x] Wire empty results state
- [x] Wire API error state
- [x] Add simple product detail page/route by barcode
- [x] Verify end-to-end search + detail against local API (detail + locked nutrition verified live; search results intermittently blocked by OFF `OFF_UPSTREAM` — error/retry UI verified; empty search verified via API `total/count=0`)

## Phase 6: Recent searches

- [x] Normalize queries before upsert: trim whitespace
- [x] Reject empty searches after trim
- [x] Case-normalize so `Oreo` / `oreo` / `OREO` share one entry (`queryKey`)
- [x] Store a reasonable `queryDisplay` value for UI
- [x] Cap list to last 10 by `updatedAt`
- [x] Implement `GET /api/searches/recent`
- [x] Display recent searches in UI
- [x] Clicking a recent search re-runs search
- [ ] Verify persistence across page reload (blocked: MySQL/Docker still unavailable)

## Phase 7: Internationalization

- [x] Add message dictionaries for `en`, `nl`, `de`, `fr`
- [x] Ensure identical key sets across languages
- [x] Add language context + `localStorage` persistence
- [x] Add manual language selector in header
- [x] Pass `lang` to product/search API calls
- [x] Translate all user-visible UI strings
- [x] Verify product names follow backend fallback for each language

## Phase 8: Subscription model & entitlement

- [x] Confirm Prisma `Subscription` fields cover Stripe sync needs
- [x] Implement `hasNutritionAccess(status)` (`active` | `trialing` only; deny `past_due` and other non-entitled statuses)
- [x] Include `hasNutritionAccess` and subscription summary on `GET /api/user`
- [x] Unit-test entitlement matrix

## Phase 9: Stripe Checkout

- [ ] Create Stripe test Product + monthly Price at **€4.99** (Dashboard) *(reviewer / local Stripe account)*
- [x] Add `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` to env
- [x] Ensure demo user can get/create `stripeCustomerId`
- [x] Implement `POST /api/billing/checkout` returning session URL
- [x] Add success / cancel pages or query handling on web
- [x] Add Subscribe CTA in UI for free users
- [x] Do **not** build Customer Portal or in-app cancellation
- [ ] Complete one test Checkout with test card *(verification blocker: no real Stripe credentials)*
- [ ] Verify Stripe Dashboard shows subscription (webhook may still be pending)

## Phase 10: Stripe webhook handling

- [x] Mount webhook route with raw body parser
- [x] Verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`
- [x] Persist processed `StripeEvent` ids (duplicate-delivery idempotency)
- [x] Handle `checkout.session.completed` (link user; retrieve current subscription before persist)
- [x] Handle `customer.subscription.created` by retrieving current subscription from Stripe before persist
- [x] Handle `customer.subscription.updated` by retrieving current subscription from Stripe before persist
- [x] Handle `customer.subscription.deleted` by persisting canceled/deleted state
- [x] Do not rely on webhook arrival order
- [x] Do not call Stripe during product authorization requests
- [ ] Forward events with Stripe CLI to local API *(verification blocker)*
- [ ] Verify DB subscription status becomes `active` after checkout *(verification blocker)*
- [ ] Verify `GET /api/user` reports `hasNutritionAccess: true` *(verification blocker)*

## Phase 11: Backend nutrition authorization

- [x] Load demo user subscription inside product detail handler (from DB only)
- [x] Omit `nutrition` and set `nutritionAccess: "locked"` when not entitled
- [x] Include `nutrition` and set `nutritionAccess: "granted"` when entitled
- [x] Ensure search results never include nutrition fields
- [x] Update UI locked nutrition panel (no real values from API)
- [x] Update UI nutrition table for subscribed state
- [x] Verify free user cannot obtain nutrition via direct API call *(automated + live without DB returns 503 before OFF)*
- [ ] Verify subscribed user receives nutrition via API *(live path blocked; covered by automated tests with mocks)*

## Phase 12: Automated tests

- [x] Configure Vitest for `apps/api`
- [x] Unit: OFF name fallback
- [x] Unit: OFF missing brand/image/nutrients
- [x] Unit: nutrition field mapping
- [x] Unit: entitlement helper
- [x] Integration: recent search persistence + case normalization
- [x] Integration: free user product detail locks nutrition
- [x] Integration: subscribed user product detail grants nutrition
- [x] Integration: webhook signature rejection
- [x] Integration: webhook subscription sync (mocked Stripe retrieve + event)
- [x] Optional web: search empty/loading component tests
- [x] Ensure tests do not call live OFF/Stripe
- [x] Configure Vitest + RTL for `apps/web`
- [x] Cover search validation/empty/upstream/retry, language persistence/refetch, recent-history isolation, nutrition locked/granted/incomplete, billing states

## Phase 13: UI / error / loading polish

- [x] Responsive header + search on mobile width
- [x] Consistent placeholder for missing images
- [x] Polish locked vs unlocked nutrition presentation
- [x] Show subscribed state clearly after refresh
- [x] Avoid decorative non-functional UI chrome
- [x] Accessibility basics: labels, focus, button types

## Phase 14: README and final QA

- [x] Write README setup instructions (Node, npm, Docker, Stripe CLI)
- [x] Document technical decisions
- [x] Document i18n approach (UI vs OFF)
- [x] Document simplifications and known limitations
- [x] Document OFF search (`/cgi/search.pl`) + product (`/api/v3/product/{code}`) choices
- [x] Document subscription entitlement rule and webhook retrieve-before-persist
- [x] Finalize `.env.example`
- [x] Confirm Prisma migration files are included in the repository
- [x] Remove dead code / temp screenshots / debug dumps (none found beyond legitimate seed/startup logs)
- [x] Confirm no secrets in tracked files (placeholders only in `.env.example`; local `.env` / `.env.local` gitignored)

---

## Final verification

- [x] Automated tests passing
- [x] TypeScript checks passing
- [x] Linting passing
- [x] Production builds passing (`web` + `api`)
- [x] Prisma migration **included** (not yet **applied** to live MySQL in this environment)
- [x] `.env.example` complete
- [ ] Stripe test flow verified (Checkout → webhook → DB → nutrition access) *(verification blocker)*
- [x] Responsive behavior checked (Phase 13)
- [x] English / Dutch / German / French checked (Phase 7 + tests)
- [x] README complete
- [x] Known limitations documented
- [x] No secrets committed (tracked tree)
- [x] Submission repository cleanup

### Classification reminder

| Kind | Examples still open |
|------|---------------------|
| Hard blocker | None after migration file inclusion |
| Verification blocker | MySQL apply/seed; live Stripe Checkout + CLI webhooks; live subscribed nutrition |
| Non-blocking | No auth / portal / multi-user / OFF cache |
