# ONE-216 Backend Timeline Normalization Addendum

This artifact documents the backend timeline normalizer contract and deterministic malformed-event error taxonomy delivered for Feature Sprint C.

## Consumer links

- Frontend integration lane: [ONE-215](/ONE/issues/ONE-215)
- QA contract audit lane: [ONE-193](/ONE/issues/ONE-193)
- Input fixture pack dependency: [ONE-214](/ONE/issues/ONE-214)

## Contract shape (v2)

`GET /payments/:reference/attempt-timeline` now includes a `normalization` block in addition to the existing `events` and `summary` fields.

Sample response payload (trimmed):

```json
{
  "paymentReference": "pay_scn_malformed_001",
  "transactionId": "tx_sample_malformed",
  "merchantId": "merchant_timeline_echo",
  "finalStatus": "FAILED",
  "events": [
    {
      "id": "ev-301",
      "occurredAt": "2026-03-18T11:00:00.000Z",
      "stage": "Payment created",
      "status": "completed",
      "actor": "gateway",
      "note": "Valid row should render.",
      "source": "attempt_event"
    }
  ],
  "summary": {
    "eventCount": 2,
    "malformedCount": 2,
    "emptyTimeline": false
  },
  "normalization": {
    "contract": "payment-attempt-timeline.v2",
    "malformedByCode": {
      "TLN-001_INVALID_METADATA_JSON": 0,
      "TLN-002_MISSING_STAGE": 0,
      "TLN-003_INVALID_STATUS": 0,
      "TLN-004_INVALID_OCCURRED_AT": 2,
      "TLN-005_MISSING_TO_STATUS": 0
    },
    "errorCodeMap": [
      {
        "code": "TLN-001_INVALID_METADATA_JSON",
        "description": "Audit row metadata is not valid JSON object payload.",
        "remediationHint": "Ensure audit metadata is serialized as object JSON before writing payment timeline events."
      }
    ]
  }
}
```

## Deterministic malformed-event error code table

| Code                           | Trigger condition                                               | Remediation hint                                                                                      |
| ------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `TLN-001_INVALID_METADATA_JSON` | Metadata cannot be parsed into a JSON object                    | Ensure audit metadata is serialized as object JSON before writing payment timeline events.            |
| `TLN-002_MISSING_STAGE`         | `payment.attempt.event` is missing a non-empty `stage`         | Populate `metadata.stage` with a stable operator-facing stage label.                                 |
| `TLN-003_INVALID_STATUS`        | `payment.attempt.event` has unsupported `status`               | Normalize status to one of `completed`, `pending`, `failed`, `info` before persisting.              |
| `TLN-004_INVALID_OCCURRED_AT`   | `occurredAt` is absent or not parseable for timeline row       | Write `metadata.occurredAt` as a valid ISO-8601 UTC timestamp.                                       |
| `TLN-005_MISSING_TO_STATUS`     | `transaction.transition` metadata is missing `toStatus`        | Persist transition rows with `metadata.toStatus` set to the resulting transaction status.            |

## Regeneration and verification

- Regenerate sample pack: `npm run payments:timeline:fixtures:export`
- Backend regression tests:
  - `npm test -- test/payment-attempt-timeline-normalizer.spec.ts`
  - `npm test -- test/payments.service.spec.ts`

## Sample pack output

- `artifacts/one-214/payment-attempt-timeline-sample-pack.json`
