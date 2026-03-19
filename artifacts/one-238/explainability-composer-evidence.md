# ONE-238 Evidence

## Scope delivered
- Explainability preset composer drawer with 4 editable slots.
- Deterministic anomaly header filter-chip row driven by active slot and reason counts.
- Keyboard shortcuts implemented:
  - `Alt+1..4` apply preset slot
  - `Alt+Shift+1..4` overwrite slot
  - `Esc` closes composer without mutating currently applied chips
- Reset-safe behavior implemented:
  - Query reset clears unsaved composer draft
  - Applied chips remain unchanged until replacement is explicitly confirmed

## Verification
- Unit tests:
  - `npm test -- test/frontend.wave1.spec.ts`
  - Result: PASS (36 passed, 0 failed)
- Frontend production build:
  - `npm run frontend:build`
  - Result: PASS

## Files changed
- `frontend/utils/wave1.ts`
- `frontend/pages/index.vue`
- `frontend/assets/css/main.css`
- `test/frontend.wave1.spec.ts`
