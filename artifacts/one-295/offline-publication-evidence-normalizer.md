# ONE-295 Frontend Evidence

## Scope Delivered
- Added offline publication evidence normalizer helpers in `frontend/utils/wave1.ts`.
- Added deterministic lane ordering tuple: `(lanePriorityWeight, readinessWeight, issueIdentifier, evidenceTypeWeight, evidencePath)`.
- Added machine fields per lane: `hasBranch`, `hasCommit`, `hasPr`, `hasTestCommand`, `hasArtifactPath`, `credentialBlocked`, `nextOwner`, `dispatchReady`.
- Added canonical patch preview for issue/comment/document links with copy-ready markdown output.
- Added keyboard workflow helpers for focus/navigation/handoff/normalize pass.

## Test Command
- `npm test -- test/frontend.wave1.spec.ts`

## Result
- PASS (110 tests)
