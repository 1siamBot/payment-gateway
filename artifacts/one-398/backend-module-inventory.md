# ONE-398 Backend Module Inventory (brand/main parity audit)

## Branch context
- Working branch: `frontend/one-394-operator-workbench` (contains backend feature lineage through ONE-390)
- Baseline checked: `origin/main`

## Expected backend module groups
- Provider routing policy controls and health visibility
- Webhook delivery query/read model for operations and merchant support
- Existing payment/settlement core modules (already present)

## Present vs missing (file-level)
Compared to `origin/main`, this branch already carries the extended backend module set used by the full payment-gateway system, including:

- `src/payments/payment-callback-guard.service.ts`
- `src/payments/dto/create-refund.dto.ts`
- `src/payments/dto/list-refunds.dto.ts`
- `src/payments/dto/update-payout-chargeback.dto.ts`
- `src/payments/dto/update-refund-lifecycle.dto.ts`
- `src/settlements/adjudication-routing-manifest.ts`
- `src/settlements/publication-evidence-manifest.ts`
- `src/settlements/qa-release-gate-verdict-packet.ts`
- `src/settlements/release-candidate-handoff-packet.ts`
- `src/settlements/release-candidate-remediation-queue.ts`
- `src/settlements/release-candidate-scorecard.ts`
- `src/settlements/release-evidence-adjudication-snapshot.ts`
- `src/settlements/release-ready-dependency-graph-snapshot.ts`
- `src/settlements/remediation-execution-blueprint-packet.ts`
- `src/settlements/remediation-publication-readiness-envelope.ts`
- `src/settlements/reconciliation-discrepancy-fixtures.ts`
- `src/settlements/settlement-exception-activity.controller.ts`

No unresolved missing backend module files were found for the current architecture after this alignment pass.

## Gap closures delivered in ONE-398 patch
- Added routing policy admin control plane and provider health snapshot API surface:
  - `src/providers/routing-admin.controller.ts`
  - `src/providers/provider-router.service.ts`
  - `src/providers/providers.module.ts`
- Added webhook delivery listing endpoint + filtering/merchant scoping in backend:
  - `src/webhooks/webhooks.controller.ts`
  - `src/webhooks/webhooks.service.ts`
- Added regression coverage for both new backend capabilities:
  - `test/provider-router.service.spec.ts`
  - `test/webhooks.service.spec.ts`

## Verification evidence
- `npm test -- --runInBand` -> 71/71 suites passed (402 tests)
- `npm run build` -> success
