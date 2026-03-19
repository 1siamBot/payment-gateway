# ONE-293 Frontend Evidence

## Test Command

- `npm test -- test/frontend.wave1.spec.ts --runInBand`

## Result

- `PASS test/frontend.wave1.spec.ts`
- `Tests: 107 passed, 107 total`
- `Test Suites: 1 passed, 1 total`

## Scope Covered

- Deterministic publication-readiness board ordering by `(lanePriorityWeight, blockerWeight, issueIdentifier, evidenceFieldWeight)`
- Gap resolver machine fields (`missingFields[]`, `canonicalLinkViolations[]`, `blockedByCredential`, `readyToPublish`, `nextOwner`)
- Canonical-link autofix preview with copy-ready patched markdown output
- Keyboard workflow (`Alt+R`, `Alt+Shift+N`, `Alt+Shift+P`, `Ctrl+Shift+G`, `Ctrl+Shift+Enter`)
