# ONE-80 Mock Triage Walkthrough Pack

This pack demonstrates mock-driven settlement exception triage states without backend credentials.

## Local Run Command

```bash
npm --prefix frontend run dev -- --port 3310
```

Verified: 2026-03-18 (Asia/Bangkok)

## Route Map

All fixtures are available from the frontend home route:

- Base: `http://localhost:3310/`
- Loading: `http://localhost:3310/?exceptionFixture=loading`
- Empty: `http://localhost:3310/?exceptionFixture=empty`
- Permission denied: `http://localhost:3310/?exceptionFixture=permission_error`
- Stale version conflict: `http://localhost:3310/?exceptionFixture=stale_conflict`
- Retry recovery: `http://localhost:3310/?exceptionFixture=action_failure_retry`

## Operator Walkthrough Notes

1. Loading
- What operator sees: exception list and detail remain in loading state.
- Expected action: wait for load completion before triage actions.

2. Empty
- What operator sees: no exception rows and detail pane requires selection.
- Expected action: adjust filters (merchant/provider/date) or confirm no active incidents.

3. Permission denied
- What operator sees: explicit permission error and action controls are unavailable.
- Expected action: request role elevation before attempting resolve/ignore.

4. Stale version conflict
- What operator sees: action submit fails with version conflict guidance.
- Expected action: refresh exception detail, inspect latest audit entries, retry with current version.

5. Retry recovery
- What operator sees: first submit path fails with retryable error, then succeeds on retry.
- Expected action: keep reason/note, retry once, and verify status/audit update.

## Evidence Bundle

- Loading: `artifacts/one-80/triage-loading.png`
- Empty: `artifacts/one-80/triage-empty.png`
- Permission denied: `artifacts/one-80/triage-permission-denied.png`
- Stale version conflict: `artifacts/one-80/triage-stale-version.png`
- Retry recovery: `artifacts/one-80/triage-retry-recovery.png`
