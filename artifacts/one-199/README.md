# ONE-199 Timeline Drawer Evidence

Route under test:

- `/payment-attempt-timeline`

Scenario evidence links:

- Successful capture: [`frontend/utils/paymentAttemptTimeline.ts`](../../frontend/utils/paymentAttemptTimeline.ts) (`successful_capture`)
- Retry then success: [`frontend/utils/paymentAttemptTimeline.ts`](../../frontend/utils/paymentAttemptTimeline.ts) (`retry_then_success`)
- Terminal failure: [`frontend/utils/paymentAttemptTimeline.ts`](../../frontend/utils/paymentAttemptTimeline.ts) (`terminal_failure`)
- Empty state: [`test/payment-attempt-timeline.spec.ts`](../../test/payment-attempt-timeline.spec.ts) (`returns empty rows for empty fixture scenario`)
- Malformed fallback: [`test/payment-attempt-timeline.spec.ts`](../../test/payment-attempt-timeline.spec.ts) (`flags malformed rows and keeps valid timeline rows`)
