# Payment Gateway Backend

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

## Implemented scope

- Prisma data model for tenants, shops, users/roles, wallets, transactions, providers, commissions, settlements, audit logs, api keys, idempotency keys, callback events
- Payment API: initiate deposit/withdraw, inquiry, provider callback handling
- Provider abstraction with two connectors and health-aware fallback
- Idempotency for payment initiation and callback event handling
- API key create/rotate/revoke with audit logs
- Baseline controls: throttling, maintenance mode toggle, encrypted secret utility
