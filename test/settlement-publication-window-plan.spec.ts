import {
  buildSettlementPublicationWindowPlan,
  SETTLEMENT_PUBLICATION_WINDOW_SCORE_BANDS,
} from '../src/settlements/publication-window-plan';

describe('settlement publication window plan', () => {
  it('sorts windows deterministically by windowPriorityWeight, blockerRisk, etaDriftMinutes, issueIdentifier, bundleCode', () => {
    const payload = {
      asOfIso: '2026-03-19T11:00:00Z',
      manifest: {
        entries: [
          {
            issueIdentifier: 'ONE-271',
            bundleCode: 'lane-c',
            windowPriorityWeight: 2,
            blockerRisk: 20,
            etaDriftMinutes: 20,
            evidence: { isComplete: true },
          },
          {
            issueIdentifier: 'ONE-268',
            bundleCode: 'lane-b',
            windowPriorityWeight: 1,
            blockerRisk: 10,
            etaDriftMinutes: 20,
            evidence: { isComplete: true },
          },
          {
            issueIdentifier: 'ONE-269',
            bundleCode: 'lane-a',
            windowPriorityWeight: 1,
            blockerRisk: 10,
            etaDriftMinutes: 10,
            evidence: { isComplete: true },
          },
        ],
      },
    };

    const first = buildSettlementPublicationWindowPlan(payload);
    const second = buildSettlementPublicationWindowPlan({
      ...payload,
      manifest: {
        entries: [...payload.manifest.entries].reverse(),
      },
    });

    expect(
      first.windows.map(
        (window) =>
          `${window.windowPriorityWeight}:${window.blockerRisk}:${window.etaDriftMinutes}:${window.issueIdentifier}:${window.bundleCode}`,
      ),
    ).toEqual([
      '1:10:10:ONE-269:lane-a',
      '1:10:20:ONE-268:lane-b',
      '2:20:20:ONE-271:lane-c',
    ]);
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('classifies score bands at deterministic boundaries', () => {
    const plan = buildSettlementPublicationWindowPlan({
      manifest: {
        entries: [
          {
            issueIdentifier: 'ONE-500',
            bundleCode: 'ready-now',
            etaDriftMinutes: 0,
            dependencyGates: [],
            evidence: {
              completeness: {
                branch: true,
                fullSha: true,
                prMode: true,
                testCommand: true,
                artifactPath: true,
              },
            },
          },
          {
            issueIdentifier: 'ONE-501',
            bundleCode: 'ready-soon',
            etaDriftMinutes: 300,
            dependencyGates: [],
            evidence: {
              completeness: {
                branch: true,
                fullSha: true,
                prMode: true,
                testCommand: true,
                artifactPath: true,
              },
            },
          },
          {
            issueIdentifier: 'ONE-502',
            bundleCode: 'hold',
            etaDriftMinutes: 0,
            dependencyGates: [
              {
                issueIdentifier: 'ONE-999',
                status: 'unresolved',
                unresolvedReason: 'waiting for QA fixture replay',
              },
              {
                issueIdentifier: 'ONE-998',
                status: 'unresolved',
                unresolvedReason: 'waiting for PM signoff',
              },
              {
                issueIdentifier: 'ONE-997',
                status: 'unresolved',
                unresolvedReason: 'missing ops window',
              },
            ],
            evidence: {
              completeness: {
                branch: true,
                fullSha: true,
                prMode: true,
                testCommand: true,
                artifactPath: true,
              },
            },
          },
        ],
      },
    });

    const byBundle = Object.fromEntries(plan.windows.map((window) => [window.bundleCode, window.releaseBundleScore]));
    expect(byBundle['ready-now']).toMatchObject({ finalScore: 100, scoreBand: 'ready_now' });
    expect(byBundle['ready-soon']).toMatchObject({ finalScore: 80, scoreBand: 'ready_soon' });
    expect(byBundle['hold']).toMatchObject({ finalScore: 55, scoreBand: 'hold' });
    expect(Object.keys(plan.metadata.byScoreBand)).toEqual([...SETTLEMENT_PUBLICATION_WINDOW_SCORE_BANDS]);
  });

  it('validates unresolved dependency gates and emits canonical issue/document/comment links', () => {
    const valid = buildSettlementPublicationWindowPlan({
      manifest: {
        entries: [
          {
            issueIdentifier: 'ONE-271',
            bundleCode: 'lane-main',
            dependencyGates: [
              {
                issueIdentifier: 'one-269',
                status: 'unresolved',
                unresolvedReason: 'QA preflight pending',
                commentId: 44,
              },
            ],
            evidence: { isComplete: true },
          },
        ],
      },
    });

    expect(valid.windows[0]?.dependencyGates).toEqual([
      {
        issueIdentifier: 'ONE-269',
        status: 'unresolved',
        unresolvedReason: 'QA preflight pending',
        issueLink: '/ONE/issues/ONE-269',
        documentLink: '/ONE/issues/ONE-269#document-plan',
        commentLink: '/ONE/issues/ONE-269#comment-44',
      },
    ]);

    try {
      buildSettlementPublicationWindowPlan({
        manifest: {
          entries: [
            {
              issueIdentifier: 'ONE-271',
              bundleCode: 'lane-main',
              dependencyGates: [
                {
                  issueIdentifier: 'ONE-269',
                  status: 'unresolved',
                },
              ],
              evidence: { isComplete: true },
            },
          ],
        },
      });
      fail('Expected validation error');
    } catch (error) {
      expect(error).toMatchObject({
        response: {
          code: 'SETTLEMENT_PUBLICATION_WINDOW_PLAN_VALIDATION_FAILED',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'manifest.entries[ONE-271:lane-main].dependencyGates[0].unresolvedReason',
            }),
          ]),
        },
      });
    }
  });
});
