# ONE-228 Diff Inspector Evidence

## Evidence Window
- Captured at: 2026-03-19 (Asia/Bangkok)
- Source: deterministic helper outputs from `test/frontend.wave1.spec.ts`

## State A: Mixed conflicts (stale_version + high_delta + mixed_status)
- Selected rows: `exc-a`, `exc-b`, `malformed-3`
- Drilldown counts:
  - stale_version: 1
  - malformed: 1
  - high_delta: 1
  - mixed_status: 1
- High-delta filter rows: `exc-a`
- Malformed filter rows: `malformed-3`

## State B: Empty drilldown fallback
- Active drilldown: `stale_version`
- Total inspector rows: 2
- Filtered rows: 0
- Empty fallback title: `No rows in this drilldown`
- Empty fallback copy includes safe reset guidance to return to confirmation state.

## Verification Commands
- `npm test -- test/frontend.wave1.spec.ts`
- `npm run frontend:build`
