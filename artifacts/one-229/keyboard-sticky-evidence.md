# ONE-229 Keyboard Triage + Sticky Anomaly Evidence

## Scope Delivered
- Added deterministic keyboard traversal for diff rows (`ArrowUp/ArrowDown`, `j/k`) with visible row focus indicator.
- Added reason-bucket shortcut jumps (`0=all`, `1=stale_version`, `2=malformed`, `3=high_delta`, `4=mixed_status`).
- Added sticky anomaly summary bar that remains visible while scrolling diff table.
- Added inspector-only reset action (`Esc` or `Reset Inspector View`) that preserves selected rows and clears temporary filter/focus state.

## Verification
- Command: `npm test -- test/frontend.wave1.spec.ts`
  - Result: `PASS` (30 tests, including new deterministic focus traversal + reason-shortcut mapping tests)
- Command: `npm run frontend:build`
  - Result: `Build complete` (Nuxt production build succeeds)

## UX Notes
- Focus state is highlighted with active row background + inline indicator dot.
- Sticky anomaly bar shows stable counts for `stale_version`, `malformed`, `high_delta`, `mixed_status` from deterministic inspector reason counts.
