# ONE-384 Merchant Balance Anomaly Console Evidence

Route under test:

- `/merchant-balance-anomaly-console`

Screenshot artifacts:

- Desktop: `artifacts/one-384/merchant-balance-anomaly-console-desktop.png`
- Mobile: `artifacts/one-384/merchant-balance-anomaly-console-mobile.png`

Validation commands:

- `npm test -- test/merchant-balance-anomaly-console.spec.ts`
- `npm --prefix frontend run build`
- `cd frontend && npx nuxi dev --host 127.0.0.1 --port 3101`
- `npx --yes playwright screenshot --device="Desktop Chrome" "http://127.0.0.1:3101/merchant-balance-anomaly-console" "artifacts/one-384/merchant-balance-anomaly-console-desktop.png"`
- `npx --yes playwright screenshot --device="Pixel 5" "http://127.0.0.1:3101/merchant-balance-anomaly-console" "artifacts/one-384/merchant-balance-anomaly-console-mobile.png"`
