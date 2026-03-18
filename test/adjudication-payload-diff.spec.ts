import { runAdjudicationPayloadDiff } from '../src/settlements/adjudication-payload-diff';

function buildValidPayload() {
  return {
    packet: {
      issue: 'ONE-104',
      generatedAt: '2026-03-19T03:40:00.000Z',
      owner: 'frontend-engineer',
      correlationId: 'corr_104_20260319_010',
      sourceIssue: '/ONE/issues/ONE-104',
    },
    naming: {
      artifactPrefix: 'one104_pub_pass3',
      filePattern: '^one125_c10_[a-z0-9_]+_[0-9]{8}T[0-9]{6}Z\\.json$',
      artifactFileNames: ['one125_c10_packet_20260319T034000Z.json'],
    },
    version: {
      expectedVersion: 22,
      expectedUpdatedAt: '2026-03-19T03:39:10.000Z',
      isLatestSnapshot: true,
    },
    idempotency: {
      key: 'one104-pass3-v22',
    },
  };
}

describe('adjudication payload diff', () => {
  it('passes when payload matches canonical schema', () => {
    const summary = runAdjudicationPayloadDiff(buildValidPayload(), 'fixtures/pass.json');

    expect(summary.verdict).toBe('PASS_FINAL');
    expect(summary.totals.mismatches).toBe(0);
    expect(summary.mismatches).toEqual([]);
    expect(summary.checkResults).toEqual([
      { checkId: '10', verdict: 'PASS_FINAL', mismatchCodes: [] },
      { checkId: '11', verdict: 'PASS_FINAL', mismatchCodes: [] },
      { checkId: '12', verdict: 'PASS_FINAL', mismatchCodes: [] },
    ]);
  });

  it('reports deterministic missing field mismatch', () => {
    const payload = buildValidPayload();
    delete (payload.version as { expectedUpdatedAt?: string }).expectedUpdatedAt;

    const summary = runAdjudicationPayloadDiff(payload, 'fixtures/missing.json');

    expect(summary.verdict).toBe('FAIL');
    expect(summary.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PAYLOAD_MISSING_REQUIRED_FIELD',
          path: 'version.expectedUpdatedAt',
        }),
      ]),
    );
  });

  it('reports deterministic wrong-type mismatch', () => {
    const payload = buildValidPayload();
    (payload.naming as { artifactFileNames: unknown }).artifactFileNames = 'not-an-array';

    const summary = runAdjudicationPayloadDiff(payload, 'fixtures/wrong-type.json');

    expect(summary.verdict).toBe('FAIL');
    expect(summary.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PAYLOAD_TYPE_MISMATCH',
          path: 'naming.artifactFileNames',
          expected: 'array',
          actual: 'string',
        }),
      ]),
    );
  });

  it('reports deterministic extra-field mismatch', () => {
    const payload = buildValidPayload() as Record<string, unknown>;
    payload.extraField = { injected: true };

    const summary = runAdjudicationPayloadDiff(payload, 'fixtures/extra.json');

    expect(summary.verdict).toBe('FAIL');
    expect(summary.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PAYLOAD_EXTRA_FIELD',
          path: 'extraField',
        }),
      ]),
    );
  });
});
