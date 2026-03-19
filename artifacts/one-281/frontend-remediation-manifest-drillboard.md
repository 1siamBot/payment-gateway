# ONE-281 Frontend Evidence

## Scope delivered
- Added deterministic remediation-manifest drillboard panel in fixture/mock mode.
- Added dependency graph inspector grouped by canonical blocker classes.
- Added canonical-link autofix preview and deterministic export packet surface.
- Added keyboard workflow: `Alt+M`, `Alt+Shift+J`, `Alt+Shift+K`, `Ctrl+Shift+G`, `Ctrl+Shift+E`.

## Determinism contracts
- Drillboard order key: `(priorityWeight, dependencyDepth, issueIdentifier, runbookStepCode, artifactPath)`.
- Dependency graph order key: `(classWeight, issueIdentifier, createdAt)`.
- Export packet generated via deterministic ordering and canonicalized/sorted links.

## Verification
- Command: `npm run test -- test/frontend.wave1.spec.ts`
- Result: pass (`96` tests)

## Changed files
- `frontend/utils/wave1.ts`
- `frontend/pages/index.vue`
- `test/frontend.wave1.spec.ts`
