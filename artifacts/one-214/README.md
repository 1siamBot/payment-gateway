# ONE-214 Backend Timeline Contract Pack

This artifact bundle is the frontend handoff payload pack for the payment-attempt timeline API contract.

## Included file

- `artifacts/one-214/payment-attempt-timeline-sample-pack.json`

## Scenarios covered

- `successful_capture`
- `retry_then_success`
- `terminal_failure`
- `empty`
- `malformed`

## Regeneration command

- `npm run payments:timeline:fixtures:export`

## Backend regression command

- `npm test -- test/payments.service.spec.ts`
