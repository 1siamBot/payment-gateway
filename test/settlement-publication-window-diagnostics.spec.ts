import { buildSettlementPublicationWindowDiagnostics } from '../src/settlements/publication-window-diagnostics';

describe('settlement publication window diagnostics', () => {
  it('sorts lane diagnostics deterministically by severity, score-band shift, issueIdentifier, bundleCode, and fieldPath', () => {
    const diagnostics = buildSettlementPublicationWindowDiagnostics({
      asOfIso: '2026-03-19T12:00:00Z',
      baselinePlan: {
        windows: [
          {
            issueIdentifier: 'ONE-273',
            bundleCode: 'lane-a',
            windowRank: 1,
            releaseBundleScore: { finalScore: 95, scoreBand: 'ready_now' },
          },
          {
            issueIdentifier: 'ONE-274',
            bundleCode: 'lane-b',
            windowRank: 2,
            releaseBundleScore: { finalScore: 70, scoreBand: 'ready_soon' },
          },
          {
            issueIdentifier: 'ONE-275',
            bundleCode: 'lane-c',
            windowRank: 3,
            releaseBundleScore: { finalScore: 60, scoreBand: 'ready_soon' },
          },
        ],
      },
      candidatePlan: {
        windows: [
          {
            issueIdentifier: 'ONE-273',
            bundleCode: 'lane-a',
            windowRank: 2,
            releaseBundleScore: { finalScore: 50, scoreBand: 'hold' },
          },
          {
            issueIdentifier: 'ONE-274',
            bundleCode: 'lane-b',
            windowRank: 1,
            releaseBundleScore: { finalScore: 75, scoreBand: 'ready_soon' },
          },
          {
            issueIdentifier: 'ONE-275',
            bundleCode: 'lane-c',
            windowRank: 3,
            releaseBundleScore: { finalScore: 60, scoreBand: 'ready_soon' },
          },
        ],
      },
    });

    expect(diagnostics.laneDiagnostics.map((lane) => `${lane.issueIdentifier}:${lane.bundleCode}:${lane.fieldPath}`)).toEqual([
      'ONE-273:lane-a:releaseBundleScore.scoreBand',
      'ONE-275:lane-c:releaseBundleScore.finalScore',
      'ONE-274:lane-b:windowRank',
    ]);
  });

  it('classifies score-band transitions and emits required machine fields', () => {
    const diagnostics = buildSettlementPublicationWindowDiagnostics({
      baselinePlan: {
        windows: [
          {
            issueIdentifier: 'ONE-280',
            bundleCode: 'lane-score-band',
            windowRank: 2,
            releaseBundleScore: { finalScore: 90, scoreBand: 'ready_now' },
          },
        ],
      },
      candidatePlan: {
        windows: [
          {
            issueIdentifier: 'ONE-280',
            bundleCode: 'lane-score-band',
            windowRank: 4,
            releaseBundleScore: { finalScore: 55, scoreBand: 'hold' },
          },
        ],
      },
    });

    expect(diagnostics.laneDiagnostics).toHaveLength(1);
    expect(diagnostics.laneDiagnostics[0]).toMatchObject({
      issueIdentifier: 'ONE-280',
      bundleCode: 'lane-score-band',
      scoreDelta: -35,
      scoreBandFrom: 'ready_now',
      scoreBandTo: 'hold',
      windowRankFrom: 2,
      windowRankTo: 4,
      deltaReasonCodes: ['score_band_downgrade', 'score_decrease', 'window_rank_down'],
    });
  });

  it('normalizes dependency-gate reason codes and canonical links', () => {
    const diagnostics = buildSettlementPublicationWindowDiagnostics({
      baselinePlan: {
        windows: [],
      },
      candidatePlan: {
        windows: [
          {
            issueIdentifier: 'ONE-273',
            bundleCode: 'lane-gates',
            releaseBundleScore: { finalScore: 80, scoreBand: 'ready_soon' },
            dependencyGates: [
              {
                issueIdentifier: 'one-269',
                status: 'unresolved',
                unresolvedReason: 'Missing evidence pack; ETA drift and artifact gap',
                issueLink: '/issues/ONE-269',
                documentLink: '/issues/ONE-269#document-plan',
                commentLink: '/issues/ONE-269#comment-88',
              },
            ],
          },
        ],
      },
    });

    expect(diagnostics.dependencyGateDiagnostics).toHaveLength(1);
    expect(diagnostics.dependencyGateDiagnostics[0]).toEqual({
      issueIdentifier: 'ONE-273',
      bundleCode: 'lane-gates',
      fieldPath: 'dependencyGates',
      dependencyIssueIdentifier: 'ONE-269',
      statusFrom: null,
      statusTo: 'unresolved',
      issueLink: '/ONE/issues/ONE-269',
      documentLink: '/ONE/issues/ONE-269#document-plan',
      commentLink: '/ONE/issues/ONE-269#comment-88',
      gateReasonCodes: [
        'missing_evidence',
        'eta_drift',
        'dependency_open',
        'link_noncanonical',
        'artifact_gap',
      ],
    });
  });
});
