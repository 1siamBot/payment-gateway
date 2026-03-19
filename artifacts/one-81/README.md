# ONE-81 Mock Triage Walkthrough Pack

This pack demonstrates mock-driven settlement exception triage states without requiring backend credentials.

## Local Run Command (verified)

```bash
npm --prefix frontend run dev -- --port 3310
```

Verification timestamp: 2026-03-18 (Asia/Bangkok)

## Route Map

All states run from the triage fixture route parameter on the frontend home page:

- Base: `http://localhost:3310/`
- Loading: `http://localhost:3310/?exceptionFixture=loading`
- Empty: `http://localhost:3310/?exceptionFixture=empty`
- Permission denied: `http://localhost:3310/?exceptionFixture=permission_error`
- Stale version conflict: `http://localhost:3310/?exceptionFixture=stale_conflict`
- Retry recovery: `http://localhost:3310/?exceptionFixture=action_failure_retry`

## Operator Walkthrough Notes

1. Loading
- What operator sees: list and detail remain in loading state while fixture simulates fetch in progress.
- Expected action: wait for load completion before taking resolve/ignore action.

2. Empty
- What operator sees: exception table has no rows; detail pane asks for selection.
- Expected action: widen date/provider/merchant filters or confirm no active incidents.

3. Permission denied
- What operator sees: triage state shows explicit forbidden error and detail lockout.
- Expected action: request admin/ops role elevation before attempting triage.

4. Stale version conflict
- What operator sees: action modal opened with pre-filled reason and version conflict error message.
- Expected action: refresh detail, review latest audit trail, then resubmit action on current version.

5. Retry recovery
- What operator sees: first submission path fails with retryable backend error in action modal.
- Expected action: keep reason/note, retry action, confirm state transitions to updated detail.

## Evidence Bundle

- Loading: `artifacts/one-81/triage-loading.png`
- Empty: `artifacts/one-81/triage-empty.png`
- Permission denied: `artifacts/one-81/triage-permission-denied.png`
- Stale version conflict: `artifacts/one-81/triage-stale-version.png`
- Retry recovery: `artifacts/one-81/triage-retry-recovery.png`
