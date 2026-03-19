# ONE-369 Payout Monitoring Panel Evidence

Route under test:

- `/payout-monitoring-panel`

Screenshot artifacts:

- Desktop: `artifacts/one-369/payout-monitoring-panel-desktop.png`
- Mobile: `artifacts/one-369/payout-monitoring-panel-mobile.png`

Validation commands:

- `npm test -- test/payout-monitoring-panel.spec.ts`
- `npm --prefix frontend run build`
- `npx --yes playwright screenshot --device="Desktop Chrome" "http://127.0.0.1:3000/payout-monitoring-panel" "artifacts/one-369/payout-monitoring-panel-desktop.png"`
- `npx --yes playwright screenshot --device="Pixel 5" "http://127.0.0.1:3000/payout-monitoring-panel" "artifacts/one-369/payout-monitoring-panel-mobile.png"`
