# ONE-209 Timeline Drawer Evidence

Route under test:

- `/payment-attempt-timeline`

Scenario screenshots:

- Success: `artifacts/one-209/timeline-success.png`
- Success (mobile): `artifacts/one-209/timeline-success-mobile.png`
- Empty: `artifacts/one-209/timeline-empty.png`
- Malformed: `artifacts/one-209/timeline-malformed.png`

Capture commands:

- `npx --yes playwright screenshot --device="Desktop Chrome" "http://127.0.0.1:3001/payment-attempt-timeline?scenario=successful_capture&openDrawer=1" "artifacts/one-209/timeline-success.png"`
- `npx --yes playwright screenshot --device="Pixel 5" "http://127.0.0.1:3001/payment-attempt-timeline?scenario=successful_capture&openDrawer=1" "artifacts/one-209/timeline-success-mobile.png"`
- `npx --yes playwright screenshot --device="Desktop Chrome" "http://127.0.0.1:3001/payment-attempt-timeline?scenario=empty&openDrawer=1" "artifacts/one-209/timeline-empty.png"`
- `npx --yes playwright screenshot --device="Desktop Chrome" "http://127.0.0.1:3001/payment-attempt-timeline?scenario=malformed&openDrawer=1" "artifacts/one-209/timeline-malformed.png"`
