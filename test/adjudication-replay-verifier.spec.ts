import {
  DEFAULT_ADJUDICATION_REPLAY_FIXTURES,
  ReplayFixture,
  runAdjudicationReplayVerifier,
} from '../src/settlements/adjudication-replay-verifier';

describe('adjudication replay verifier', () => {
  it('returns PASS_FINAL for checks 10/11/12 when only pass fixtures are provided', () => {
    const passFixtures = DEFAULT_ADJUDICATION_REPLAY_FIXTURES.filter((fixture) => fixture.type === 'pass');

    const summary = runAdjudicationReplayVerifier(passFixtures);

    expect(summary.checkResults).toEqual([
      {
        checkId: '10',
        verdict: 'PASS_FINAL',
        signatureKey: null,
        failureSignatureKeys: [],
        firstOwner: null,
        escalationOwner: null,
      },
      {
        checkId: '11',
        verdict: 'PASS_FINAL',
        signatureKey: null,
        failureSignatureKeys: [],
        firstOwner: null,
        escalationOwner: null,
      },
      {
        checkId: '12',
        verdict: 'PASS_FINAL',
        signatureKey: null,
        failureSignatureKeys: [],
        firstOwner: null,
        escalationOwner: null,
      },
    ]);
  });

  it('returns mixed fail signatures and owner routing for checks 10/11/12', () => {
    const summary = runAdjudicationReplayVerifier(DEFAULT_ADJUDICATION_REPLAY_FIXTURES);

    const check10 = summary.checkResults.find((row) => row.checkId === '10');
    const check11 = summary.checkResults.find((row) => row.checkId === '11');
    const check12 = summary.checkResults.find((row) => row.checkId === '12');

    expect(check10).toMatchObject({
      verdict: 'FAIL',
      firstOwner: 'frontend',
      escalationOwner: 'backend',
    });
    expect(check10?.failureSignatureKeys).toEqual(
      expect.arrayContaining([
        'TXN_GUARD_FIELDS_MISSING',
        'TXN_STALE_VERSION_CONFLICT',
        'TXN_CONFLICT_ENVELOPE_INCOMPLETE',
      ]),
    );

    expect(check11).toMatchObject({
      verdict: 'FAIL',
      firstOwner: 'qa',
      escalationOwner: 'frontend',
    });
    expect(check11?.failureSignatureKeys).toEqual(
      expect.arrayContaining(['TXN_EVIDENCE_FILENAME_DRIFT', 'MX_08_QA_CHECKLIST_MISSING']),
    );

    expect(check12).toMatchObject({
      verdict: 'FAIL',
      firstOwner: 'frontend',
      escalationOwner: 'pm',
    });
    expect(check12?.failureSignatureKeys).toEqual(
      expect.arrayContaining(['MX_08_QA_CHECKLIST_MISSING', 'AC1_OWNER_ROUTE_MISSING']),
    );
  });

  it('throws on invalid fixture shape', () => {
    const invalidFixture = {
      ...DEFAULT_ADJUDICATION_REPLAY_FIXTURES[0],
      checks: ['13'],
    } as unknown as ReplayFixture;

    expect(() => runAdjudicationReplayVerifier([invalidFixture])).toThrow('Invalid adjudication fixture check id');
  });

  it('emits machine-readable artifact schema with required fields', () => {
    const summary = runAdjudicationReplayVerifier(DEFAULT_ADJUDICATION_REPLAY_FIXTURES);

    expect(summary).toEqual(
      expect.objectContaining({
        generatedAt: expect.any(String),
        checkResults: expect.any(Array),
        fixtureResults: expect.any(Array),
        totals: expect.objectContaining({
          fixtures: expect.any(Number),
          passed: expect.any(Number),
          failed: expect.any(Number),
        }),
      }),
    );

    for (const row of summary.checkResults) {
      expect(row).toEqual(
        expect.objectContaining({
          checkId: expect.stringMatching(/^(10|11|12)$/),
          verdict: expect.stringMatching(/^(PASS_FINAL|FAIL)$/),
          signatureKey: expect.anything(),
          failureSignatureKeys: expect.any(Array),
          firstOwner: expect.anything(),
          escalationOwner: expect.anything(),
        }),
      );
    }
  });
});
