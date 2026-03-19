# ONE-309 Frontend Evidence

## Scope Delivered
- Added deterministic publication blocker dependency graph board helpers and machine fields.
- Added evidence digest builder with `blockerFingerprint`, `upstreamDependencies[]`, `requiredArtifacts[]`, `canonicalLinkViolations[]`, `nextOwner`, `readyForQA`.
- Added canonical-link autofix preview for markdown with copy-ready output.
- Added keyboard shortcut resolver for `Alt+D`, `Alt+Shift+N/P`, `Ctrl+Shift+G`, `Ctrl+Shift+L`.
- Added fixture-mode frontend page: `frontend/pages/publication-blocker-dependency-graph-board.vue`.

## Deterministic Test Command
- `npm test -- test/frontend.wave1.spec.ts`

## Artifact Paths
- `artifacts/one-309/test-frontend-wave1.log`
- `artifacts/one-309/publication-blocker-dependency-graph-summary.md`
