# Pantry Lens — Implementation Plan

Historical planning document. Decisions below were approved before implementation.

**For reviewers:** start with `README.md`. This file records locked decisions and phase sequencing; `TODO.md` tracks completion vs external verification blockers.

**Audit date:** 2026-09-05  
**Decisions locked:** 2026-09-05  
**Initial repository state:** Empty greenfield.

---

## 1. Repository findings

### What exists

| Area | Status |
|------|--------|
| Repository structure | Empty folder only |
| `package.json` | None |
| Frontend / backend | None |
| TypeScript / lint / format | None |
| Environment config | None |
| Database / Prisma | None |
| Tests | None |
| README / `.gitignore` | None |
| Git | Directory present; no tracked content observed |

### What can be reused

Nothing. This is a greenfield build.

### Implication for sequencing

Phase 1 must establish the monorepo foundation from scratch (apps, tooling, env templates, gitignore) before any feature work.

---

## 2. Requirement matrix

| # | Requirement | Proposed implementation | Responsibility | Edge cases | Verification |
|---|-------------|-------------------------|----------------|------------|--------------|
| R1 | Search by title / search term | Backend calls OFF full-text search; normalize; return list | API + OFF; Web displays | Empty query, special chars, rate limits, no results | Manual + API integration test |
| R2 | Graceful missing/incomplete OFF data | Normalizer fills nulls / fallbacks; UI placeholders | API normalize; Web UI | Missing name/brand/image/nutrients | Unit tests on normalizer + UI check |
| R3 | Languages: en, nl, de, fr | UI dictionary + OFF localized fields + `lang` query param | Web i18n; API lang | Unsupported `lang` → `en` | Manual all 4 langs |
| R4 | Manual language selector | Persist preference in `localStorage` | Web | Reload keeps language | Manual |
| R5 | Translate application UI | Lightweight message dictionaries | Web | Missing key → English key/fallback | Manual + type-safe keys |
| R6 | Product info in selected language when available | Name fallback chain in API | API | Only generic name exists | Unit tests |
| R7 | One demo user; no auth | Seeded `User`; API always uses that user | DB seed; API | Multiple instances / re-seed | Seed script idempotent |
| R8 | Store recent searches in MySQL | `RecentSearch` rows per demo user; trim, reject empty, case-normalize upsert key | API + DB; Web list | `Oreo`/`oreo`/`OREO` → one row; max 10 | Integration test |
| R9 | Everyone sees basic product info | Public fields always in response | API | Image URL broken | Manual |
| R10 | Nutrition only for active subscription | Omit `nutrition` from JSON unless entitled | API gate | UI must not receive fields | Unit/integration tests |
| R11 | Subscription enforced by backend | Entitlement helper from DB status | API | Spoofed frontend | Test free vs subscribed |
| R12 | Monthly Stripe Checkout (test) | Checkout Session `mode=subscription` | API + Stripe | Cancel mid-checkout | Stripe CLI + Dashboard |
| R13 | Webhooks sync subscription state | Verify signature; upsert Subscription | API + DB | Dupes, out-of-order | Webhook unit tests |
| R14 | Meaningful automated tests | Vitest (API) + a few RTL tests | Both | Flaky OFF network | Mock OFF/Stripe |
| R15 | Secrets in env vars | `.env` + `.env.example` | Both | Secrets in git | Review + `.gitignore` |
| R16 | Prisma migrations | Initial migration checked in | DB | Fresh migrate works | `prisma migrate deploy` |
| R17 | `.env.example` | Document all vars | Root / apps | Missing var fails clearly | Fresh clone setup |
| R18 | README | Setup, decisions, i18n, limits | Docs | Reviewer can run locally | Self-check against checklist |

### Locked decisions

| Topic | Decision |
|-------|----------|
| Package manager | **npm workspaces** |
| MySQL | **Docker Compose** for local MySQL |
| Product detail | Simple detail page by barcode |
| Nutrition placement | **Detail-only**; search responses never include nutrition |
| Entitlement | `active` \| `trialing` only; deny `past_due`, `unpaid`, `canceled`, `incomplete`, `incomplete_expired`, `paused` |
| Stripe price | **€4.99/month** test Price in Dashboard; Price ID in env |
| Customer portal / cancel UI | **Do not build** |
| App name | **Pantry Lens** |
| Shared types package | **Do not create** unless duplication becomes genuinely problematic |
| Recent searches | Last **10**; trim; reject empty; case-insensitive uniqueness (`oreo` ≡ `OREO`) |
| Nutrition fields | Per 100g: energy kcal, fat, saturated fat, carbs, sugars, fiber, proteins, salt |
| Demo identity | No cookies/JWT; backend uses seeded demo user by fixed email |

---

## 3. Proposed architecture

### Repository structure

```
pantry-lens/
├── apps/
│   ├── web/                 # Next.js (App Router) + Tailwind + TS
│   └── api/                 # Express + Prisma + TS
├── docker-compose.yml       # MySQL only
├── package.json             # npm workspaces root scripts
├── .env.example
├── .gitignore
├── README.md
├── IMPLEMENTATION_PLAN.md
└── TODO.md
```

**Why:** Separate apps match the assignment, keep boundaries clear for review, and avoid Turborepo complexity with no meaningful build graph benefit at this size.

**Shared packages:** Do **not** create `packages/shared` unless type duplication becomes genuinely problematic. Prefer small duplicated DTOs for review clarity.

### Frontend / backend boundaries

- Browser → **only** `apps/api` (CORS-configured).
- `apps/api` → Open Food Facts + Stripe.
- Web never imports OFF field names or Stripe SDK for product/billing reads (Checkout redirect URL is fine).

### Why this fits an assessment

Reviewers can open two folders, follow request flow end-to-end, and modify one concern without hunting through abstractions.

---

## 4. Data model (Prisma / MySQL)

```prisma
model User {
  id                   String          @id @default(cuid())
  email                String          @unique
  displayName          String
  stripeCustomerId     String?         @unique
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt
  recentSearches       RecentSearch[]
  subscription         Subscription?
}

model RecentSearch {
  id           String   @id @default(cuid())
  userId       String
  queryKey     String   @db.VarChar(255) // lowercased trim key for uniqueness
  queryDisplay String   @db.VarChar(255) // last submitted display form (e.g. "Oreo")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, queryKey])
  @@index([userId, updatedAt])
}

model Subscription {
  id                   String   @id @default(cuid())
  userId               String   @unique
  stripeSubscriptionId String   @unique
  stripePriceId        String
  status               String   // mirror Stripe status string
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean  @default(false)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status])
}

// Webhook delivery idempotency only (does NOT fix out-of-order events)
model StripeEvent {
  id          String   @id // Stripe event id evt_...
  type        String
  processedAt DateTime @default(now())
}
```

**Demo user seed:** `demo@pantry-lens.local` / display name `Demo User`, no subscription row initially.

**Why store Stripe status as string:** Avoid fighting Stripe’s enum evolution; map to entitlement in one pure function.

**Recent search normalization:** trim whitespace; reject empty; store `queryKey = trimmed.toLowerCase()` for uniqueness and `queryDisplay = trimmed` (last seen casing) for UI.

---

## 5. API design

Base URL: `http://localhost:4000` (example). Prefix `/api`.

| Method | Path | Purpose | Authz |
|--------|------|---------|-------|
| `GET` | `/api/health` | Liveness | Public |
| `GET` | `/api/user` | Demo user + subscription summary (`hasNutritionAccess`, status) | Demo user |
| `GET` | `/api/products/search?q=&lang=&page=` | Search products (basic fields **only**; never nutrition) | Public basics |
| `GET` | `/api/products/:barcode?lang=` | Product detail page data | Nutrition only if entitled |
| `GET` | `/api/searches/recent` | Last searches for demo user | Demo user |
| `POST` | `/api/billing/checkout` | Create Checkout Session → `{ url }` | Demo user |
| `POST` | `/api/webhooks/stripe` | Raw body + signature verification | Stripe |

No Customer Portal or in-app cancellation endpoints.

### Response shapes (normalized)

**Search item (always safe):**
```json
{
  "barcode": "3017620422003",
  "name": "Nutella",
  "brand": "Ferrero",
  "imageUrl": "https://...",
  "languageUsed": "en"
}
```

**Product detail when entitled:**
```json
{
  "barcode": "...",
  "name": "...",
  "brand": "...",
  "imageUrl": "...",
  "languageUsed": "fr",
  "nutrition": {
    "per100g": {
      "energyKcal": 539,
      "fat": 30.9,
      "saturatedFat": 10.6,
      "carbohydrates": 57.5,
      "sugars": 56.3,
      "fiber": null,
      "proteins": 6.3,
      "salt": 0.107
    }
  },
  "nutritionAccess": "granted"
}
```

**Product detail when not entitled:**
```json
{
  "barcode": "...",
  "name": "...",
  "brand": "...",
  "imageUrl": "...",
  "languageUsed": "en",
  "nutrition": null,
  "nutritionAccess": "locked"
}
```

**Why `nutritionAccess` flag:** Lets the UI show a lock/CTA without inferring from missing data (incomplete OFF nutrition vs paywall).

### Improvements vs suggested surface

1. Keep suggested routes; add `/api/health`.
2. Prefer **detail endpoint** for nutrition rather than stuffing nutrition into every search hit (smaller payloads, clearer gate).
3. Search responses never include nutrition (even for subscribers) — fetch on detail. **Why:** Forces correct authorization path and keeps list fast. Subscribers still see nutrition on product detail.
4. Reject empty/`q` shorter than 2 chars with `400`.

### Error format

```json
{ "error": { "code": "OFF_UPSTREAM", "message": "..." } }
```

---

## 6. Open Food Facts integration strategy

### Endpoints

| Need | Endpoint | Notes |
|------|----------|-------|
| Full-text search by title/terms | **Legacy** `GET https://world.openfoodfacts.org/cgi/search.pl` | Intentional: OFF does not provide normal full-text via v2/v3 search. Use `search_terms`, `search_simple=1`, `action=process`, `json=1`, `page_size`, `page`, `lc`, `fields`. |
| Product by barcode | `GET /api/v3/product/{barcode}` | Current product API. Use `fields=` allowlist. Fall back to v2 only if a real field-compatibility issue is discovered. |
| User-Agent | Required | Identify app + contact email per OFF etiquette |

**Why legacy search:** Meeting “search by title or search term” requires full-text. Document this clearly in README as intentional, not accidental use of old API.

**Why v3 product lookup:** Prefer current API for new integration; keep OFF response parsing inside the Express integration layer only.

### Fields to request

- Identity: `code`
- Names: `product_name`, `product_name_en`, `product_name_nl`, `product_name_de`, `product_name_fr`, `generic_name`, `generic_name_en`, …
- Brand: `brands`
- Image: `image_front_url` (fallback: `image_url` if present)
- Nutrition: `nutriments` (read `*_100g` keys)

### Normalization layer

`apps/api/src/integrations/openFoodFacts/`

- `client.ts` — fetch + timeout + User-Agent
- `normalizeProduct.ts` — map raw → `ProductDto`
- `types.ts` — raw OFF types (internal only)

Frontend never sees OFF keys like `energy-kcal_100g`.

### Name fallback

1. `product_name_{lang}`
2. `product_name_en`
3. `product_name` (product main language)
4. `generic_name_{lang}` → `generic_name_en` → `generic_name`
5. `"Unknown product"` (UI string key on web for display; API may return `null` name + web translates, **or** API returns English fallback — prefer API returns resolved string + `languageUsed` for honesty)

**Recommendation:** API returns final display `name` string (never null; use `"Unknown product"` English constant) **and** `languageUsed`. UI can still replace exact sentinel with translated “Unknown product” if desired — simpler: API returns null name and web shows i18n `product.unknown`.

**Chosen:** `name: string | null`; web shows i18n fallback when null. Brand/image similarly nullable.

### Nutrition mapping (commonly missing)

| Our field | OFF keys (try in order) |
|-----------|-------------------------|
| energyKcal | `energy-kcal_100g`, `energy-kcal`, convert from `energy-kj_100g` if needed |
| fat | `fat_100g` |
| saturatedFat | `saturated-fat_100g` |
| carbohydrates | `carbohydrates_100g` |
| sugars | `sugars_100g` |
| fiber | `fiber_100g` |
| proteins | `proteins_100g` |
| salt | `salt_100g` (or sodium_100g * 2.5 if salt missing — optional; document if used) |

Missing → `null`. Entire `nutrition.per100g` still returned if entitled even when all null (distinct from locked).

### Rate limits / resilience

- Timeout (~8s), catch upstream errors → `502` with safe message.
- Do not retry aggressively (OFF limits).
- Cache: **skip** for assessment unless needed; keep deterministic.

---

## 7. Internationalization strategy

### A. Application UI (we control)

**Recommendation: lightweight dictionaries**, not `next-intl`.

| Approach | Pros | Cons |
|----------|------|------|
| Plain `messages/{en,nl,de,fr}.ts` + `LanguageProvider` | Easy to explain, no RSC complexity, enough for 4 langs | Manual wiring |
| `next-intl` | Routing, formatting, ecosystem | Heavier; more magic for a small assessment |

**Implementation sketch:**

- `lib/i18n/messages/*.ts`
- `useTranslation()` → `t('search.placeholder')`
- Language in React context + `localStorage` key `pantry-lens.lang`
- Pass `lang` on every API call

### B. Product content (OFF)

- Backend resolves localized name via fallback chain.
- Brands generally language-agnostic.
- Nutrition labels (Energy, Fat, …) are **UI strings**, not OFF.

### Language validation

API accepts only `en|nl|de|fr`; default `en`.

---

## 8. Stripe flow

```
Demo user
  → POST /api/billing/checkout
  → Create/retrieve stripeCustomerId on User
  → stripe.checkout.sessions.create({
       mode: 'subscription',
       customer,
       line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],  // €4.99/month test price
       success_url, cancel_url,
       client_reference_id: user.id,
       metadata: { userId }
     })
  → Redirect browser to session.url
  → Stripe Checkout (test card)
  → Webhooks update DB
  → GET /api/user shows hasNutritionAccess
  → GET /api/products/:barcode includes nutrition
```

No Customer Portal and no in-app cancellation UI.

### IDs to store

| ID | Where |
|----|-------|
| `stripeCustomerId` | `User` |
| `stripeSubscriptionId` | `Subscription` |
| `stripePriceId` | `Subscription` |
| Stripe `status` | `Subscription.status` |
| `current_period_end` | `Subscription.currentPeriodEnd` |
| Event `id` | `StripeEvent` (duplicate-delivery idempotency only) |

Do **not** store secret keys in DB.

### Webhook events to handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Link customer/subscription to user if needed; then retrieve current subscription from Stripe and upsert local row |
| `customer.subscription.created` | Take subscription id from event → **`stripe.subscriptions.retrieve`** → persist that current state |
| `customer.subscription.updated` | Same: retrieve current subscription from Stripe before writing DB |
| `customer.subscription.deleted` | Persist as canceled/deleted (status `canceled`); no need to treat payload as fresher than retrieve if retrieve fails because already deleted |

**Out-of-order delivery:** `StripeEvent` IDs prevent duplicate *processing work*, but do **not** protect against unordered events. Always re-fetch the subscription from Stripe on created/updated before persisting. Do **not** trust event arrival order. Do **not** call Stripe during normal product authorization — use DB state synced by webhooks.

Optional (nice-to-have): `invoice.payment_failed` — status usually arrives via `subscription.updated` (`past_due`).

### Signature verification

- Express: register webhook route with `express.raw({ type: 'application/json' })` **before** `express.json()`.
- `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.

### Entitlement mapping

```ts
function hasNutritionAccess(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}
```

| Status | Access |
|--------|--------|
| `active` | Yes |
| `trialing` | Yes |
| `past_due`, `unpaid`, `canceled`, `incomplete`, `incomplete_expired`, `paused` | No |

**Why deny `past_due`:** Locked decision — clear rule for the assessment; real products may keep access during dunning.

### Cancel / payment changes

- No in-app cancel/portal. Cancellation is via Stripe Dashboard / test tools only.
- If status remains `active` with `cancel_at_period_end` → **keep access** until period ends.
- When status is `canceled` / subscription deleted → deny.

### Local testing

```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
# Use printed whsec_... as STRIPE_WEBHOOK_SECRET locally
# Prefer a real Checkout flow over stripe trigger for end-to-end verification
```

---

## 9. Testing strategy

**Runner:** Vitest in `apps/api` (primary). Optional Vitest + Testing Library in `apps/web`.

| Area | Type | What |
|------|------|------|
| Name/nutrition normalization | Unit | Missing fields, lang fallback, kj→kcal |
| Entitlement helper | Unit | Status matrix |
| Nutrition omission | Integration (supertest) | Free user detail has `nutrition: null`; subscribed has object |
| Recent searches | Integration | Persist, case-normalize upsert, limit 10 |
| Stripe webhook | Integration | Invalid sig → 400; created/updated path uses retrieve-then-persist (mocked) |
| Search UI loading/empty | Component | Mock fetch |
| Language dictionary | Unit | All langs have same keys |

**Avoid:** Live OFF/Stripe in CI. Mock `fetch` / Stripe client.

**Target count:** ~10–20 focused tests, not 50 shallow ones.

---

## 10. UI / UX plan

**Visual direction:** Clean editorial food-app feel — warm off-white page background, strong typography (e.g. something like Source Serif + IBM Plex Sans via `next/font`), single accent (deep olive/forest), minimal chrome. No dashboard grids, no purple gradients, no badge spam.

### Layout

1. **Header:** App name “Pantry Lens”, language `<select>`, subscription status chip (text only: Free / Subscribed), Subscribe button when free.
2. **Search row:** Input + submit; shows loading spinner/text in-place.
3. **Recent searches:** Horizontal text buttons under search (not cards).
4. **Results:** Simple list/grid of product rows: image | name | brand. Click → detail.
5. **Empty:** One sentence + suggestion.
6. **API error:** Inline alert, retry.
7. **Detail:** Basic info always; nutrition table or locked panel with CTA.
8. **Missing image:** Neutral placeholder block with initials or icon (SVG, not emoji).

### States

| State | Behavior |
|-------|----------|
| Loading | Disable submit; skeleton or “Searching…” |
| Empty results | “No products found for …” |
| Error | Message from API `error.message` |
| Locked nutrition | Blurred/placeholder rows **without** real values + Subscribe CTA |
| Subscribed | Full table; header shows Subscribed |

**Responsive:** Stack header on mobile; results single column; touch-friendly recent chips.

---

## 11. Implementation phases

### Phase 1 — Repository / workspace foundation
- **Goal:** `apps/web` and `apps/api` boot independently.
- **Files:** root `package.json`, `apps/web/*`, `apps/api/*`, `.gitignore`, `.env.example`, `docker-compose.yml`
- **Tasks:** Scaffold Next.js+Tailwind; scaffold Express+TS; workspace scripts `dev:web`, `dev:api`
- **Deps:** None
- **Done when:** Both start; health or home page loads
- **Checks:** `npm run dev:web`, `npm run dev:api`

### Phase 2 — Prisma / MySQL / demo user
- **Goal:** DB schema + seed
- **Files:** `apps/api/prisma/*`, seed script
- **Tasks:** Models, migration, seed demo user
- **Deps:** Phase 1, Docker MySQL
- **Done when:** `prisma migrate` + seed creates demo user
- **Checks:** Query DB / script output

### Phase 3 — Express API foundation
- **Goal:** Routing, env validation, CORS, error middleware
- **Files:** `src/index.ts`, `src/app.ts`, `src/config.ts`, routes skeleton
- **Deps:** Phase 2
- **Done when:** `/api/health`, `/api/user` work
- **Checks:** curl user returns demo

### Phase 4 — Open Food Facts integration
- **Goal:** Search + barcode normalize
- **Files:** `integrations/openFoodFacts/*`, product routes
- **Tasks:** Full-text via `/cgi/search.pl`; barcode via `/api/v3/product/{code}`; fields allowlist; User-Agent; omit nutrition from search responses always
- **Deps:** Phase 3
- **Done when:** Search + detail return normalized JSON (nutrition omitted until Phase 11)
- **Checks:** Manual curl + unit tests for normalizer (can add early)

### Phase 5 — Search frontend
- **Goal:** Search UI + simple barcode detail page talking to API
- **Files:** `apps/web` pages/components, API client
- **Deps:** Phase 4
- **Done when:** User can search, open detail by barcode, and see basic product info
- **Checks:** Manual browser

### Phase 6 — Recent searches
- **Goal:** Persist and display with normalization
- **Files:** search service, route, web recent list
- **Tasks:** trim; reject empty; case-insensitive `queryKey`; store `queryDisplay`; cap last 10
- **Deps:** Phase 5
- **Done when:** `Oreo`/`oreo`/`OREO` collapse to one entry; list survives refresh
- **Checks:** DB rows + UI

### Phase 7 — Internationalization
- **Goal:** 4 languages UI + `lang` param
- **Files:** messages, LanguageProvider, selector
- **Deps:** Phase 5 (can parallel earlier)
- **Done when:** Switching language changes UI + product names when available
- **Checks:** Manual en/nl/de/fr

### Phase 8 — Subscription DB model
- **Goal:** Subscription model live (may already be in Phase 2 — if so, verify entitlement helper)
- **Files:** prisma, `entitlements.ts`
- **Deps:** Phase 2
- **Done when:** Helper + user payload includes `hasNutritionAccess`
- **Checks:** Unit tests

### Phase 9 — Stripe Checkout
- **Goal:** Checkout session redirect for €4.99/month test Price
- **Files:** billing route, Stripe SDK, env price id
- **Deps:** Phase 8, Stripe test account
- **Done when:** Test card reaches success URL (no portal/cancel UI)
- **Checks:** Stripe Dashboard session

### Phase 10 — Stripe webhooks
- **Goal:** Sync subscription using retrieve-before-persist on created/updated
- **Files:** webhook route, raw body, handlers
- **Deps:** Phase 9, Stripe CLI
- **Done when:** After checkout, DB status `active`; duplicates ignored via `StripeEvent`
- **Checks:** CLI forward + DB

### Phase 11 — Backend nutrition authorization
- **Goal:** Gate detail nutrition
- **Files:** product detail mapper
- **Deps:** Phase 4 + 8/10
- **Done when:** Free omit / paid include
- **Checks:** Integration tests

### Phase 12 — Automated tests
- **Goal:** Meaningful suite green
- **Files:** `*.test.ts`
- **Deps:** Phases 4–11
- **Done when:** CI-local `npm test` passes
- **Checks:** Vitest

### Phase 13 — UI / error / loading polish
- **Goal:** Assessment-ready UX
- **Files:** web components/styles
- **Deps:** Phase 7, 11
- **Done when:** All UI states covered responsively
- **Checks:** Manual mobile width

### Phase 14 — README and final QA
- **Goal:** Submission ready
- **Files:** README, `.env.example`, cleanup
- **Deps:** All
- **Done when:** TODO final section complete
- **Checks:** Fresh clone path

**Ordering note:** Phases 8 can merge into Phase 2 schema-wise; keep entitlement wiring before Stripe. Tests for normalizer can start in Phase 4.

---

## 12. Environment variables

```bash
# apps/api
DATABASE_URL=
PORT=4000
CORS_ORIGIN=http://localhost:3000
OPEN_FOOD_FACTS_BASE_URL=https://world.openfoodfacts.org
OPEN_FOOD_FACTS_USER_AGENT=PantryLens/1.0 (contact@example.com)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
CHECKOUT_SUCCESS_URL=http://localhost:3000/billing/success
CHECKOUT_CANCEL_URL=http://localhost:3000/billing/cancel
DEMO_USER_EMAIL=demo@pantry-lens.local

# apps/web
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

---

## 13. Risks / residual notes

1. OFF legacy search.pl availability / rate limits under assessment load.
2. Incomplete localized names for nl/de/fr on many products.
3. Webhook local setup friction (Stripe CLI required).
4. Reviewer must run Docker for MySQL.
5. OFF v3 product response shape may differ slightly from older examples — validate fields during Phase 4; fall back to v2 only if required fields are unavailable.

---

## 14. Decisions status

All previously open questions are **locked** (see §2 Locked decisions). No further product decisions are blocking Phase 1.
