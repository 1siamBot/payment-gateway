# ONE-234 Compare Drawer + Quick Actions Evidence

## Scope Evidence
- Added deterministic compare drawer from bulk diff inspector row selections (two-row side-by-side current/incoming field comparison).
- Added deterministic reason quick actions in stable order: `stale_version`, `malformed`, `high_delta`, `mixed_status`.
- Added safe compare reset that clears compare state while preserving selected exception rows.

## Deterministic Verification
### 1) Targeted helper tests
Command:
```bash
npm test -- frontend.wave1.spec.ts
```
Result: `PASS test/frontend.wave1.spec.ts` with 33 passing tests.

### 2) Frontend build verification
Command:
```bash
npm run frontend:build
```
Result: successful Nuxt production build with no template/type errors.

## Files Touched
- `frontend/utils/wave1.ts`
- `frontend/pages/index.vue`
- `frontend/assets/css/main.css`
- `test/frontend.wave1.spec.ts`
