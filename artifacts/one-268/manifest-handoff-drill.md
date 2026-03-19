# ONE-268 Frontend Evidence

## Scope Delivered
- Manifest diff viewer with deterministic ordering `(severityWeight, deltaClassWeight, issueIdentifier, fieldPath)`.
- Blocked-lane handoff drill console with validation for `branch`, `fullSha`, `prMode`, `testCommand`, `artifactPath`, dependency links, and conditional blocker metadata.
- Canonical internal link autofix preview for issue/comment/document links.
- Keyboard workflow: `Alt+M`, `Alt+Shift+J`, `Alt+Shift+K`, `Ctrl+Shift+D`, `Ctrl+Shift+Enter`.

## Test Commands
- `npm test -- test/frontend.wave1.spec.ts`
- `npm run frontend:build`
