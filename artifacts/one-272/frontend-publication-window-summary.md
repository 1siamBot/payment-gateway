# ONE-272 Frontend Evidence

## Delivered
- Added publication-window plan board with deterministic sort tuple `(windowPriorityWeight, blockerRisk, etaDriftMinutes, issueIdentifier, bundleCode)`.
- Added release-bundle score explainer panel exposing `completenessScore`, `blockerDriftPenalty`, `dependencyRiskPenalty`, `finalScore`, and score-band labels.
- Added dependency-gate panel with canonical link validation and unresolved-reason visibility.
- Added keyboard workflow: `Alt+W`, `Alt+Shift+J`, `Alt+Shift+K`, `Ctrl+Shift+E`, `Ctrl+Shift+G`.
- Added frontend helper coverage for ordering stability, score-band boundaries, and dependency-gate link/render validation.

## Test Command
- `npm test -- test/frontend.wave1.spec.ts`
