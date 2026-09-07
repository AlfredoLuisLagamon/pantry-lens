# Pantry Lens

Pantry Lens is a small full-stack product-search application built for a technical assessment.

Users can search Open Food Facts for packaged food products, switch between English, Dutch, German, and French, and view basic product information. Nutritional information is protected by a Stripe subscription and enforced by the Express backend.

## Features

- Search packaged foods by product name / search term
- Product detail by barcode
- Graceful handling of incomplete Open Food Facts data
- Manual UI language selection: English, Dutch, German, French
- Recent searches for a single seeded demo user (MySQL)
- Stripe-hosted monthly subscription Checkout (€4.99 EUR)
- Webhook-synchronized subscription state in MySQL
- Backend-only nutrition authorization (frontend never receives locked nutrition payloads)
- Responsive Next.js UI
- Automated API and frontend tests

Out of scope by design: authentication, multi-user accounts, Stripe Customer Portal, in-app cancellation, production caching.

## Architecture

```text
Browser / Next.js
        |
        v
Express API
   |       |       |
   v       v       v
 MySQL   Stripe   Open Food Facts
Prisma
```

- Next.js never calls Open Food Facts or Stripe secret APIs directly.
- Express is the backend boundary for products, billing, webhooks, and user state.
- Stripe webhook state is persisted in MySQL; product-detail authorization reads that stored subscription state (it does not query Stripe on each request).
- Product search remains independent of MySQL (history is recorded via a separate POST).

## Tech Stack

**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS 4  
**Backend:** Express, TypeScript, Prisma 6, MySQL 8  
**Integrations:** Open Food Facts, Stripe Checkout / Subscriptions / Webhooks  
**Testing:** Vitest, React Testing Library, Supertest

Requires **Node.js ≥ 20** (see root `package.json` `engines`).

## Project Structure

```text
apps/
  web/
    src/app            # App Router pages (search, product, billing)
    src/components
    src/lib            # API client, i18n
  api/
    src/routes
    src/services
    src/integrations   # Open Food Facts, Stripe
    src/lib
    prisma/            # schema, seed, migrations
docker-compose.yml
.env.example
```

## Prerequisites

- Node.js ≥ 20 and npm
- Docker + Docker Compose (local MySQL)
- Stripe test-mode account
- Stripe CLI (local webhook forwarding)

## Environment Variables

Copy values from the root `.env.example` into:

| File | Purpose |
|------|---------|
| `apps/api/.env` | API, Prisma, OFF, Stripe |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_BASE_URL` |

Do not commit real secrets. Placeholders such as `sk_test_replace_me` / `whsec_replace_me` / `price_replace_me` are intentional.

### Core (API startup)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Matches `docker-compose.yml` credentials for local MySQL |
| `DEMO_USER_EMAIL` | Seeded demo user email |
| `PORT` | Defaults to `4000` if omitted |
| `CORS_ORIGIN` | Defaults to `http://localhost:3000` |

### Open Food Facts

| Variable | Notes |
|----------|--------|
| `OPEN_FOOD_FACTS_BASE_URL` | Defaults to `https://world.openfoodfacts.org` |
| `OPEN_FOOD_FACTS_USER_AGENT` | **Required** when OFF is used (e.g. search/detail) |

### Stripe Checkout (lazy-loaded)

| Variable | Notes |
|----------|--------|
| `STRIPE_SECRET_KEY` | Test secret key |
| `STRIPE_PRICE_ID` | Recurring €4.99 / month price id |
| `CHECKOUT_SUCCESS_URL` | e.g. `http://localhost:3000/billing/success` |
| `CHECKOUT_CANCEL_URL` | e.g. `http://localhost:3000/billing/cancel` |

### Stripe webhooks (lazy-loaded)

| Variable | Notes |
|----------|--------|
| `STRIPE_WEBHOOK_SECRET` | CLI `whsec_...` for local listen, or Dashboard endpoint secret |

### Web

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | e.g. `http://localhost:4000` |

## Local Setup

```bash
npm ci
# or: npm install

cp .env.example apps/api/.env
# create apps/web/.env.local with NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Database Setup

```bash
docker compose up -d
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

- `db:migrate:deploy` applies the committed Prisma migration(s) (non-interactive).
- `db:migrate` runs `prisma migrate dev` (interactive development workflow).
- Seed upserts one demo user from `DEMO_USER_EMAIL` (idempotent). The user starts **unsubscribed**.

The initial migration SQL was generated from the Prisma schema with `prisma migrate diff --from-empty` (no live MySQL required for generation). Applying it against MySQL still requires Docker/MySQL.

## Running the Application

```bash
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:3000
```

Health check: `GET http://localhost:4000/api/health`

## Stripe Test Setup

1. In Stripe Dashboard (test mode), create product **Pantry Lens Nutrition** with a recurring price **€4.99 EUR / month**.
2. Set `STRIPE_PRICE_ID` to that price id.
3. Set `STRIPE_SECRET_KEY` to a test secret key.
4. Backend creates/reuses a Stripe Customer for the demo user and starts hosted Checkout (`POST /api/billing/checkout`).

Product/Price provisioning is done in the Dashboard — not in application code.

### Webhooks

Handled events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Local forwarding:

```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

Use the CLI-provided `whsec_...` as `STRIPE_WEBHOOK_SECRET`.

## Open Food Facts Integration

| Operation | Endpoint | Why |
|-----------|----------|-----|
| Text search | `/cgi/search.pl` | Modern product APIs do not provide the required plain-text full-text search behavior |
| Product detail | `/api/v3/product/{barcode}` | Structured product lookup |

Additional client behavior:

- Field allowlist on requests
- Custom `User-Agent` (required)
- 8s timeout
- No aggressive retries

Pantry Lens does not control OFF completeness, localization quality, rate limits, or intermittent availability.

### Product name localization

Backend fallback order:

1. Requested localized `product_name_*`
2. English `product_name_en`
3. Generic `product_name`
4. Localized / English / generic `generic_name_*` equivalents
5. `null`

UI chrome is fully translated in the app. Product names depend on data available from Open Food Facts (“where possible”).

## Internationalization

Languages: `en`, `nl`, `de`, `fr`.

- Typed message dictionaries in the web app (no `next-intl` / locale routing — four static languages did not justify that infrastructure).
- Preference stored in `localStorage` key `pantry-lens.lang`.
- Language changes update UI immediately, are passed to backend product requests, and refetch active search/detail **without** creating recent-search history.

## Subscription and Nutrition Authorization

### Entitlement rule

| Stripe status | Nutrition access |
|---------------|------------------|
| `active` | granted |
| `trialing` | granted |
| all others (including `past_due`) | denied |

`past_due` is intentionally denied for this assessment.  
`cancelAtPeriodEnd=true` does **not** revoke access while Stripe status remains `active` or `trialing`.

### Enforcement

Nutrition authorization is enforced in Express. The frontend does not receive nutrition data for a non-entitled user.

Product detail flow:

1. Load demo user + stored subscription from MySQL  
2. Calculate entitlement  
3. Fetch/normalize OFF product  
4. Return allowlisted response (`nutrition: null` + `locked`, or nutrition + `granted`)

Product authorization never queries Stripe directly:

```text
Stripe webhook → MySQL subscription → entitlement helper → product API
```

Reasons: lower latency, fewer external dependencies, deterministic backend checks.

### Webhook behavior (summary)

- `StripeEvent` ids prevent duplicate delivery processing (same transaction as subscription update).
- Created/updated events retrieve the current Stripe Subscription before persistence (event order is not guaranteed).
- Late deletion of an older subscription is prevented from overwriting a newer current subscription.

## Recent Searches

- One demo user (no auth)
- Last **10** successful searches
- Case-insensitive normalized `queryKey`; display text preserved as `queryDisplay`
- Pagination / language-triggered refetch does not create duplicate history
- Persistence failure does **not** discard successful OFF search results (explicit history POST; search GET remains side-effect-free)

## Automated Tests

```bash
npm test
npm test -w @pantry-lens/api
npm test -w @pantry-lens/web
```

Coverage includes OFF normalization and language fallback, incomplete data, recent-search normalization, entitlement, Stripe Checkout, webhook signature/idempotency/synchronization, backend nutrition denial/grant, search UI states, language switching, recent-history failure isolation, locked/granted nutrition UI, and billing states. Tests do not call live OFF or Stripe.

## Technical Decisions

| Decision | Why |
|----------|-----|
| Separate Next.js + Express apps | Clear required frontend/backend boundary |
| Backend OFF normalization | Frontend does not depend on unstable third-party field shapes |
| Nutrition omitted from search | Lightweight list; protected nutrition only on detail |
| Webhook-synchronized entitlement | Product requests do not depend on Stripe availability |
| Explicit recent-search POST | Search GET stays side-effect-free; DB failure is isolated |
| Lightweight i18n dictionaries | Four languages without locale-routing infrastructure |

## Known Limitations

- Single seeded demo user; no authentication
- Open Food Facts data may be incomplete or unavailable in the selected language
- Open Food Facts search can be rate-limited or temporarily unavailable
- No application-level OFF cache
- Stripe test mode only
- No Customer Portal or in-app cancellation
- One current subscription row per user (no subscription history)
- Webhook processing is synchronous (assessment simplicity)

## Verification Notes

**Automated (verified in this environment):**

- API and web Vitest suites
- Typecheck / lint
- Next.js production build

**Not executed here** (Docker/MySQL and real Stripe credentials unavailable):

- Applying the MySQL migration against a live instance
- Running seed against real MySQL
- Real Stripe Checkout
- Stripe CLI webhook forwarding
- Live subscribed nutrition access end-to-end

## Useful Commands

```bash
npm run dev:web
npm run dev:api
npm test
npm run typecheck
npm run lint
npm run build
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```
