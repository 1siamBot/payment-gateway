# ONE-356 Frontend Fixture Harness Evidence

## Scope Delivered
- Added an offline fixture harness route: `/payment-flow/fixture-harness`.
- Implemented deterministic scenario packs for:
  - `success`
  - `validation_error`
  - `timeout_retry`
  - `malformed_payload`
- Added query-based scenario toggle (`?scenario=`) so QA/PM can switch fixture journeys without backend calls.

## Verification
- `npm test -- test/payment-flow-harness.spec.ts`
- `npm --prefix frontend run build`

## Notes
- Harness logic is centralized in `frontend/utils/paymentFlowHarness.ts` for deterministic ordering and recovery messaging.
