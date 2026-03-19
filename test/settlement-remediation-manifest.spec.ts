import { buildSettlementExceptionRemediationManifest } from '../src/settlements/remediation-manifest';

describe('settlement remediation manifest', () => {
  it('sorts entries deterministically by lanePriorityWeight, blockerRisk, etaDriftMinutes, issueIdentifier, artifactCode', () => {
    const payload = {
      asOfIso: '2026-03-19T10:00:00Z',
      runbook: [
        {
          issueIdentifier: 'ONE-300',
          artifactCode: 'qa-verify',
          lanePriorityWeight: 2,
          blockerRisk: 80,
          baselineEta: '2026-03-19T09:00:00Z',
          latestEta: '2026-03-19T10:00:00Z',
          evidence: {
            branch: 'feature/one-300',
            fullSha: '0123456789abcdef0123456789abcdef01234567',
            prMode: 'with_pr',
            testCommand: 'npm test -- test/settlement-remediation-manifest.spec.ts',
            artifactPath: 'artifacts/one-300/qa.md',
          },
        },
        {
          issueIdentifier: 'ONE-299',
          artifactCode: 'backend-fix',
          lanePriorityWeight: 1,
          blockerRisk: 10,
          baselineEta: '2026-03-19T09:00:00Z',
          latestEta: '2026-03-19T08:45:00Z',
          evidence: {
            branch: 'feature/one-299',
            fullSha: '89abcdef0123456789abcdef0123456789abcdef',
            prMode: 'with_pr',
            testCommand: 'npm test -- test/settlement-remediation-manifest.spec.ts',
            artifactPath: 'artifacts/one-299/backend.md',
          },
        },
        {
          issueIdentifier: 'ONE-299',
          artifactCode: 'ops-unblock',
          lanePriorityWeight: 1,
          blockerRisk: 10,
          baselineEta: '2026-03-19T09:00:00Z',
          latestEta: '2026-03-19T09:30:00Z',
          evidence: {
            branch: 'feature/one-299',
            fullSha: '89abcdef0123456789abcdef0123456789abcdef',
            prMode: 'with_pr',
            testCommand: 'npm test -- test/settlement-remediation-manifest.spec.ts',
            artifactPath: 'artifacts/one-299/ops.md',
          },
        },
      ],
    };

    const first = buildSettlementExceptionRemediationManifest(payload);
    const second = buildSettlementExceptionRemediationManifest({
      ...payload,
      runbook: [...payload.runbook].reverse(),
    });

    expect(first.entries.map((entry) => `${entry.issueIdentifier}:${entry.artifactCode}:${entry.deltaMinutes}`)).toEqual([
      'ONE-299:backend-fix:-15',
      'ONE-299:ops-unblock:30',
      'ONE-300:qa-verify:60',
    ]);
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('classifies eta drift deltas stably into ahead/on_track/at_risk/critical', () => {
    const manifest = buildSettlementExceptionRemediationManifest({
      runbook: [
        {
          issueIdentifier: 'ONE-310',
          artifactCode: 'a',
          lanePriorityWeight: 1,
          blockerRisk: 1,
          baselineEta: '2026-03-19T10:00:00Z',
          latestEta: '2026-03-19T09:00:00Z',
          evidence: {
            branch: 'a',
            fullSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            prMode: 'with_pr',
            testCommand: 'npm test',
            artifactPath: 'artifacts/a.md',
          },
        },
        {
          issueIdentifier: 'ONE-311',
          artifactCode: 'b',
          lanePriorityWeight: 1,
          blockerRisk: 2,
          baselineEta: '2026-03-19T10:00:00Z',
          latestEta: '2026-03-19T10:00:00Z',
          evidence: {
            branch: 'b',
            fullSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            prMode: 'with_pr',
            testCommand: 'npm test',
            artifactPath: 'artifacts/b.md',
          },
        },
        {
          issueIdentifier: 'ONE-312',
          artifactCode: 'c',
          lanePriorityWeight: 1,
          blockerRisk: 3,
          baselineEta: '2026-03-19T10:00:00Z',
          latestEta: '2026-03-19T11:30:00Z',
          evidence: {
            branch: 'c',
            fullSha: 'cccccccccccccccccccccccccccccccccccccccc',
            prMode: 'with_pr',
            testCommand: 'npm test',
            artifactPath: 'artifacts/c.md',
          },
        },
        {
          issueIdentifier: 'ONE-313',
          artifactCode: 'd',
          lanePriorityWeight: 1,
          blockerRisk: 4,
          baselineEta: '2026-03-19T10:00:00Z',
          latestEta: '2026-03-19T13:00:00Z',
          evidence: {
            branch: 'd',
            fullSha: 'dddddddddddddddddddddddddddddddddddddddd',
            prMode: 'with_pr',
            testCommand: 'npm test',
            artifactPath: 'artifacts/d.md',
          },
        },
      ],
    });

    const byArtifact = Object.fromEntries(manifest.entries.map((entry) => [entry.artifactCode, entry.deltaClass]));
    expect(byArtifact).toEqual({
      a: 'ahead',
      b: 'on_track',
      c: 'at_risk',
      d: 'critical',
    });
  });

  it('enforces blocker owner/eta only when prMode is no_pr_yet', () => {
    try {
      buildSettlementExceptionRemediationManifest({
        runbook: [
          {
            issueIdentifier: 'ONE-320',
            artifactCode: 'backend-fix',
            lanePriorityWeight: 1,
            blockerRisk: 90,
            baselineEta: '2026-03-19T10:00:00Z',
            latestEta: '2026-03-19T11:00:00Z',
            evidence: {
              branch: 'feature/one-320',
              fullSha: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
              prMode: 'no_pr_yet',
              testCommand: 'npm test',
              artifactPath: 'artifacts/one-320/backend.md',
            },
          },
        ],
      });
      fail('Expected validation error');
    } catch (error) {
      expect(error).toMatchObject({
        response: {
          code: 'SETTLEMENT_REMEDIATION_MANIFEST_VALIDATION_FAILED',
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'runbook[ONE-320:backend-fix].evidence.blockerEta',
            }),
            expect.objectContaining({
              field: 'runbook[ONE-320:backend-fix].evidence.blockerOwner',
            }),
          ]),
        },
      });
    }

    const withPr = buildSettlementExceptionRemediationManifest({
      runbook: [
        {
          issueIdentifier: 'ONE-321',
          artifactCode: 'backend-fix',
          lanePriorityWeight: 1,
          blockerRisk: 50,
          baselineEta: '2026-03-19T10:00:00Z',
          latestEta: '2026-03-19T10:30:00Z',
          evidence: {
            branch: 'feature/one-321',
            fullSha: 'ffffffffffffffffffffffffffffffffffffffff',
            prMode: 'with_pr',
            testCommand: 'npm test',
            artifactPath: 'artifacts/one-321/backend.md',
          },
        },
      ],
    });

    expect(withPr.entries[0]?.evidence.isComplete).toBe(true);
    expect(withPr.entries[0]?.evidence.missingRequiredFields).toEqual([]);
  });
});
