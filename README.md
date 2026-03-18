# Payment Gateway Backend + Frontend Console

NestJS + Prisma backend baseline for payment orchestration.

## Run

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

## Test

```bash
npm test
```

## Nuxt Frontend (ONE-25)

A Nuxt 3 customer/admin operations app is available in [`frontend/`](./frontend) with:

- Payment create flow (basic validation + idempotency key)
- Merchant payment dashboard with filter + detail lookup
- Customer search + customer payment history
- Manual refund trigger for support workflows
- Loading/error/empty states for each critical path

### Frontend env

```bash
cp frontend/.env.example frontend/.env
```

Key variable:

- `NUXT_PUBLIC_API_BASE_URL` (default: `http://localhost:3000`)

### Run frontend locally

```bash
npm run frontend:install
npm run frontend:dev
```

### Build frontend

```bash
npm run frontend:build
```

For combined backend + frontend build verification:

```bash
npm run build:all
```

## Implemented scope

- Prisma data model for tenants, shops, users/roles, wallets, transactions, providers, commissions, settlements, audit logs, api keys, idempotency keys, callback events
- Payment API: initiate deposit/withdraw, inquiry, provider callback handling
- Provider abstraction with two connectors and health-aware fallback
- Smart routing policy engine with deterministic scoring, tie-breakers, feature-gated rollout, dry-run shadow mode, and circuit breaker failover
- Idempotency for payment initiation and callback event handling
- API key create/rotate/revoke with audit logs
- RBAC/authz guards on sensitive API surfaces (maintenance, api keys, merchants, webhook retries, payment ops)
- Baseline controls: throttling, maintenance mode toggle, encrypted secret utility
- Built-in frontend console served at `/` for payment creation, list/filter, detail lookup, and refund trigger

## Authn/Authz headers

Sensitive endpoints now require explicit authentication:

- Merchant scope:
  - `x-api-key`: active merchant API key (hashed and matched in DB)
  - `x-merchant-id`: merchant id bound to that key
- Internal roles:
  - `x-internal-token`: must match `INTERNAL_API_TOKEN`
  - `x-actor-role`: one of `admin`, `ops`, `support`

Role expectations:

- `maintenance/*`: `admin`
- `api-keys/*`, `merchants/*`, `webhooks/retry-pending`: `admin` or `ops`
- `payments/*` and `customers/*`: merchant or internal roles
- `payments/:reference/refund`: `support`, `ops`, `admin`
- `payments/callbacks/provider`: callback signature-based validation (public callback ingress)

## Smart Routing Flags

- `ROUTING_POLICY_ENABLED`: enable policy-based routing (`true`/`false`)
- `ROUTING_POLICY_SHADOW_MODE`: evaluate policy but execute legacy order for dry runs
- `ROUTING_POLICY_ROLLOUT_PERCENT`: staged rollout gate (0-100, deterministic by reference)
- `ROUTING_LEGACY_FALLBACK_ENABLED`: if policy path exhausts candidates, allow legacy rollback path
- `ROUTING_CB_FAILURE_THRESHOLD`: consecutive failures before opening provider circuit
- `ROUTING_CB_COOLDOWN_MS`: cooldown before half-open probe
- `ROUTING_WEIGHT_SUCCESS|LATENCY|FEE|RISK`: policy score weights
- `ROUTING_MOCK_A_*`, `ROUTING_MOCK_B_*`: per-provider profile inputs (`SUCCESS_RATE`, `LATENCY_MS`, `FEE_PERCENT`, `RISK_SCORE`)

## Routing Telemetry Feed API

Frontend/dashboard can read the authoritative routing telemetry for each payment:

- `GET /payments/:reference/routing-telemetry`
- `GET /payments/observability?merchantId=...&timeframeHours=24&provider=&segment=&take=250`

Response shape (high level):

- `decision`: selected provider + `reasonCode`, score cards (with `circuitState`), `failovers`, and `marginKpi`
- `failover.events`: ordered failover attempts with failed provider + count
- `breaker.transitions`: circuit breaker state changes (`from`/`to`) when captured during routing
- `events`: raw ordered routing event stream (`routing.decision`, `routing.failover`, `routing.breaker.transition`, etc.)
- observability dashboard: aggregated `decisions`, `failovers`, `breakerTransitions`, `margins`, and alert summaries derived from backend routing telemetry records

## Routing Admin APIs (ONE-42)

Internal admin/ops endpoints for live routing policy control (no redeploy required):

- `GET /admin/routing/policy`: current runtime policy (weights, feature flags, circuit breaker, provider profiles)
- `PUT /admin/routing/policy`: partial update runtime policy configuration
- `GET /admin/routing/health`: provider health + circuit breaker/runtime counters snapshot

`PUT /admin/routing/policy` payload example:

```json
{
  "featureFlags": { "rolloutPercent": 50, "shadowMode": false },
  "weights": { "fee": 0.35, "successRate": 0.4 },
  "providerProfiles": {
    "mock-a": { "feePercent": 1.8, "riskScore": 14 }
  }
}
```

## Settlement Reconciliation APIs (ONE-42)

Daily reconciliation and mismatch query APIs:

- `POST /settlements/reconciliation/generate?date=YYYY-MM-DD`
  - Generates a daily merchant settlement summary and writes `settlement.reconciliation.generated` audit event.
- `GET /settlements/reconciliation/mismatches?date=YYYY-MM-DD&merchantId=&transactionReference=`
  - Returns mismatches queryable by merchant and transaction reference.

Mismatch reason codes:

- `paid_without_success_callback`
- `failed_with_success_callback`
- `stuck_non_terminal`

## Settlement Exception QA Fixtures (ONE-77)

Deterministic fixture seeding and replay utilities for settlement exception triage QA.

### 1) Reset + seed deterministic fixtures

```bash
npm run settlements:fixtures:seed
```

Expected output (shape):

```text
Seeded deterministic settlement exception fixtures
merchant=merchant_demo
windowDate=2026-03-18
fixtures=7
statusCounts={"OPEN":4,"INVESTIGATING":1,"RESOLVED":1,"IGNORED":1}
fixtureIds=se_fx_resolve_success,se_fx_ignore_success,se_fx_stale_conflict,se_fx_action_retry,se_fx_investigating_reference,se_fx_resolved_reference,se_fx_ignored_reference
```

### 2) Replay required scenarios (API must be running)

```bash
INTERNAL_API_TOKEN=<your-internal-token> npm run settlements:fixtures:replay
# Optional override when API is not on :3000
# SETTLEMENT_QA_API_BASE_URL=http://localhost:3001
```

Expected output (shape):

```text
Settlement exception fixture replay results
apiBaseUrl=http://localhost:3001
resolve_success=201:ok
ignore_success=201:ok
stale_conflict_first=201:ok
stale_conflict_second=409:failed
stale_conflict_reason=stale_updated_at
retry_failure=409:failed
retry_failure_reason=idempotency_in_progress
retry_success=201:ok
```

## QA Handoff Package (ONE-38)

Release baseline and execution package for QA rerun:

- Baseline repo: `https://github.com/1siamBot/payment-gateway`
- API base URL (local/staging equivalent): `http://localhost:3000`
- Seeded merchant id: `merchant_demo`
- Seeded API key (local seed): `pk_demo_live_key_for_local_seed_only`
- Internal role token (set in env): `INTERNAL_API_TOKEN`
- Callback signing method:
  - payload format: `provider:eventId:transactionReference:status`
  - algorithm: `HMAC-SHA256`
  - secret env: `CALLBACK_SIGNING_SECRET`
- Load profile for AC2:
  - target endpoint: `POST /payments`
  - concurrency: `50`
  - duration: `5m`
  - request timeout: `10s`
  - pass threshold: p95 latency `< 750ms`, non-2xx error rate `< 1%`
  - sample command:

```bash
npx autocannon -m POST -c 50 -d 300 -t 10 \
  -H "content-type: application/json" \
  -H "x-api-key: pk_demo_live_key_for_local_seed_only" \
  -H "x-merchant-id: merchant_demo" \
  -b '{"merchantId":"merchant_demo","amount":100,"currency":"USD","type":"deposit","idempotencyKey":"load-test-1"}' \
  http://localhost:3000/payments
```
