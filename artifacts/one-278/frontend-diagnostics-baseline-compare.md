# ONE-278 Frontend Evidence

## Scope delivered
- Added diagnostics baseline-compare workspace with deterministic tuple ordering:
  `(deltaSeverityWeight, scoreBandShiftWeight, issueIdentifier, bundleCode, fieldPath)`.
- Added regression gate override simulator with deterministic machine reason code handling:
  `missing_evidence`, `eta_drift`, `dependency_open`, `link_noncanonical`, `artifact_gap`.
- Added canonical internal link inspector with `/ONE/...` autofix preview for override scenario links.
- Added keyboard workflow:
  - `Alt+D` focus baseline-compare table
  - `Alt+Shift+J` next delta
  - `Alt+Shift+K` previous delta
  - `Ctrl+Shift+O` open override simulator
  - `Ctrl+Shift+Enter` validate active scenario

## Verification
- `npm test -- test/frontend.wave1.spec.ts`
  - Result: PASS (`91` tests)
- `npm run frontend:build`
  - Result: PASS
