# ONE-215 QA Handoff

## Route

- Console route: `http://127.0.0.1:3001/`
- Shareable query keys: `exceptionPreset`, `exceptionMerchant`, `exceptionProvider`, `exceptionStatus`, `exceptionStartDate`, `exceptionEndDate`, `exceptionPage`, `exceptionPageSize`

## Preset Definitions

- `Open`: `status=open`
- `Investigating`: `status=investigating`
- `Resolved`: `status=resolved`
- `Ignored`: `status=ignored`
- `High-Risk Merchant`: `merchantId=merchant-high-risk`, `status=open`

## URL State Restore Steps

1. Open `http://127.0.0.1:3001/?exceptionPreset=investigating&exceptionPage=2&exceptionPageSize=25`.
2. Confirm filters and preset bar restore to the query state.
3. Refresh the browser.
4. Confirm the same preset/filter/page state is preserved after refresh.

## Invalid/Expired Query Fallback Steps

1. Open `http://127.0.0.1:3001/?exceptionStatus=not-valid&exceptionEndDate=2025-01-01&exceptionPage=-2`.
2. Confirm warning copy appears: invalid or expired query state detected.
3. Click `Reset Query To Safe Defaults`.
4. Confirm defaults are restored (`Open` preset, page 1, page size 10).

## Evidence

- Open preset: `artifacts/one-215/preset-open.png`
- Investigating preset: `artifacts/one-215/preset-investigating.png`
- High-risk merchant preset: `artifacts/one-215/preset-high-risk-merchant.png`
- Invalid query fallback: `artifacts/one-215/invalid-query-fallback.png`
