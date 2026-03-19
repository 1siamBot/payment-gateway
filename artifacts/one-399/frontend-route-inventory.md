# ONE-399 Frontend Baseline Inventory

## Summary

- Total canonical routes: 22
- Present route files: 22
- Missing route files: 0

## Canonical Route Inventory

| Path | Page | Category | Source Issue | Status |
| --- | --- | --- | --- | --- |
| / | Main Operations Console | core | ONE-25 | present |
| /payment-operations-dashboard | Payment Operations Dashboard | operations | ONE-364 | present |
| /merchant-operations | Merchant Operations | operations | ONE-366 | present |
| /risk-alert-command-center | Risk Alert Command Center | operations | ONE-379 | present |
| /provider-failover-insights | Provider Failover Insights | operations | ONE-379 | present |
| /merchant-balance-anomaly-console | Merchant Balance Anomaly Console | operations | ONE-379 | present |
| /payout-monitoring-panel | Payout Monitoring Panel | operations | ONE-379 | present |
| /payment-reconciliation-workspace | Payment Reconciliation Workspace | operations | ONE-368 | present |
| /settlement-exceptions-inbox | Settlement Exceptions Inbox | operations | ONE-379 | present |
| /settlement-exceptions-operator-workbench | Settlement Exceptions Operator Workbench | operations | ONE-379 | present |
| /payment-attempt-timeline | Payment Attempt Timeline Lab | operations | ONE-199 | present |
| /payment-flow | Payment Flow Hub | flow | ONE-356 | present |
| /payment-flow/merchant-setup | Merchant Setup Flow | flow | ONE-356 | present |
| /payment-flow/create-intent | Create Intent Flow | flow | ONE-356 | present |
| /payment-flow/status-tracker | Status Tracker Flow | flow | ONE-356 | present |
| /payment-flow/fixture-harness | Fixture Harness Flow | flow | ONE-356 | present |
| /remediation-readiness-scoreboard | Remediation Readiness Scoreboard | remediation | ONE-344 | present |
| /remediation-plan-diff-inspector | Remediation Plan Diff Inspector | remediation | ONE-341 | present |
| /remediation-plan-explorer | Remediation Plan Explorer | remediation | ONE-341 | present |
| /remediation-queue-workspace | Remediation Queue Workspace | remediation | ONE-306 | present |
| /release-gate-verdict-explorer | Release Gate Verdict Explorer | remediation | ONE-307 | present |
| /route-map | Frontend Route Map | core | ONE-399 | present |

## Intentional Exclusions

- Reconciliation mismatch detail drawer split page (ONE-401): Drawer behavior is currently embedded in the reconciliation workspace until standalone scope is delivered.

## Delta Recorded In This Run

- Added dedicated route inventory page at `/route-map`.
- Added global navigation links (`Console Home`, `Route Map`) across all pages for discoverability.
- Established canonical frontend route inventory in `frontend/utils/routeInventory.ts`.