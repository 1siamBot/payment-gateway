# ONE-237 Evidence

- Scope: Deterministic anomaly reason timeline + sticky decision note templates in fixture-mode inspector.
- UI evidence path: `frontend/pages/index.vue` (bulk diff inspector panel, timeline panel, decision-note widget).
- Template shortcuts: `Shift+1..4` mapped to reason buckets (`stale_version`, `malformed`, `high_delta`, `mixed_status`).
- Reset behavior evidence: `resetExceptionCompareState` now clears note draft/template while preserving selected row ids and timeline focus target.

## Verification Log

1. `npm test -- frontend.wave1.spec.ts`
   - Result: PASS (35 tests)
   - Covers ordering stability, template mapping, reset behavior.
2. `npm run frontend:build`
   - Result: PASS (Nuxt production build completed).
