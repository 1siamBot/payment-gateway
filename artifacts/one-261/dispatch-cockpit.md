# ONE-261 Dispatch Cockpit Evidence

## Scope Delivered
- Added deterministic blocker-aware dispatch cockpit with tuple ordering: blockerSeverity, updatedAt, issueIdentifier, laneType.
- Added queued evidence draft bank with per-lane save/load, conditional blocker metadata reset, and draft validation.
- Added canonical internal link normalizer preview integrated with draft dependency links.
- Added keyboard workflow: Alt+B, Alt+Shift+N/P, Ctrl+Shift+S, Ctrl+Shift+Enter.

## Verification
- Command: `npm test -- test/frontend.wave1.spec.ts`
- Result: PASS (70 tests)

## Related Issues
- /ONE/issues/ONE-260
- /ONE/issues/ONE-259
- /ONE/issues/ONE-241
