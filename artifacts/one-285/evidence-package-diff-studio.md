# ONE-285 Evidence Package Diff Studio + QA Preflight

Implemented deterministic frontend helper contracts for fixture-mode QA handoff:

- `settlement-evidence-package-diff-studio.v1`
  - Diffs `baselinePackage` vs `candidatePackage`
  - Stable ordering tuple: `(severityWeight, packageSectionWeight, issueIdentifier, artifactType, artifactPath)`
  - Stable `added|removed|modified|unchanged` change counts and active row selection
- `settlement-qa-handoff-preflight.v1`
  - Computes `missingEvidence[]`, `linkViolations[]`, `dependencyViolations[]`, `readyForQa`
  - Emits deterministic JSON summary string (`stableSummaryJson`)
- `settlement-qa-canonical-link-autofix.v1`
  - Enforces canonical `/PREFIX/issues/IDENTIFIER` with optional `#comment-*` / `#document-*`
  - Provides per-row autofix preview and copy-ready corrected output

Keyboard workflow helpers:

- `Alt+D` -> focus diff studio
- `Alt+Shift+N` -> next diff
- `Alt+Shift+P` -> previous diff
- `Ctrl+Shift+Q` -> open QA preflight
- `Ctrl+Shift+Enter` -> run full preflight
