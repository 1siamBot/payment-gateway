# ONE-221 Evidence

## Scope delivered
- Fixture-driven bulk-action preview panel in settlement exception triage.
- Deterministic CSV/JSON export summary preview for selected rows.
- Empty-selection and malformed-selection fallback copy with operator-safe recovery hint.

## Deterministic QA steps
1. Run `npm run frontend:dev`.
2. Open `/` and scroll to **Settlement Exception Triage Console**.
3. Set **Triage fixture mode** to `action_failure_retry`, click **Apply Fixture**.
4. Select both rows (the second row is intentionally malformed fixture data).
5. Verify preview shows `Malformed: 1`, warning copy, and CSV contains `warning,malformed_rows_present`.
6. Deselect malformed row and keep one valid row selected.
7. Verify summary counts, risk bucket values, and JSON preview remain deterministic.
8. Click **Confirm Bulk Resolve Preview** and verify confirmation state message appears.

## Command evidence
- `npm test -- test/frontend.wave1.spec.ts` (19/19 passing)
- `npm run frontend:build` (Nuxt production build successful)

## Evidence paths
- `artifacts/one-221/README.md`
