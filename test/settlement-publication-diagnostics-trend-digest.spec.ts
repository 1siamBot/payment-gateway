import { buildSettlementPublicationDiagnosticsTrendDigest } from '../src/settlements/publication-diagnostics-trend-digest';

describe('settlement publication diagnostics trend digest', () => {
  it('sorts digest rows deterministically and remains byte-stable across input order', () => {
    const payload = {
      snapshotSummaries: [
        {
          sourceIssueIdentifier: 'ONE-300',
          snapshotSha256: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
          generatedAt: '2026-03-19T01:00:00Z',
          driftSeverity: 'none',
          driftCodes: [],
          breakingChangeCount: 0,
        },
        {
          sourceIssueIdentifier: 'ONE-200',
          snapshotSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          generatedAt: '2026-03-19T01:05:00Z',
          driftSeverity: 'low',
          driftCodes: ['type_changed'],
          breakingChangeCount: 1,
        },
        {
          sourceIssueIdentifier: 'ONE-200',
          snapshotSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          generatedAt: '2026-03-19T01:06:00Z',
          driftSeverity: 'medium',
          driftCodes: ['new_field'],
          breakingChangeCount: 1,
        },
      ],
    };

    const first = buildSettlementPublicationDiagnosticsTrendDigest(payload);
    const second = buildSettlementPublicationDiagnosticsTrendDigest({
      snapshotSummaries: [...payload.snapshotSummaries].reverse(),
    });

    expect(first.trendDigest.rows.map((row) => `${row.sourceIssueIdentifier}:${row.snapshotSha256}`)).toEqual([
      'ONE-200:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'ONE-200:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'ONE-300:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    ]);
    expect(first.trendDigest.windowFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('applies gate thresholds for pass, warn, and block recommendations', () => {
    const passDigest = buildSettlementPublicationDiagnosticsTrendDigest({
      snapshotSummaries: [
        {
          sourceIssueIdentifier: 'ONE-401',
          snapshotSha256: '1111111111111111111111111111111111111111111111111111111111111111',
          generatedAt: '2026-03-19T00:00:00Z',
          driftSeverity: 'none',
          driftCodes: [],
          breakingChangeCount: 0,
        },
      ],
    });
    const warnDigest = buildSettlementPublicationDiagnosticsTrendDigest({
      snapshotSummaries: [
        {
          sourceIssueIdentifier: 'ONE-402',
          snapshotSha256: '2222222222222222222222222222222222222222222222222222222222222222',
          generatedAt: '2026-03-19T00:00:00Z',
          driftSeverity: 'medium',
          driftCodes: ['type_changed'],
          breakingChangeCount: 1,
        },
      ],
    });
    const blockDigest = buildSettlementPublicationDiagnosticsTrendDigest({
      snapshotSummaries: [
        {
          sourceIssueIdentifier: 'ONE-403',
          snapshotSha256: '3333333333333333333333333333333333333333333333333333333333333333',
          generatedAt: '2026-03-19T00:00:00Z',
          driftSeverity: 'high',
          driftCodes: ['breaking_change_spike', 'new_contract_gap'],
          breakingChangeCount: 2,
        },
      ],
    });

    expect(passDigest.regressionGateSummary.recommendedGate).toBe('pass');
    expect(warnDigest.regressionGateSummary.recommendedGate).toBe('warn');
    expect(blockDigest.regressionGateSummary.recommendedGate).toBe('block');
  });

  it('normalizes risk reason aliases into the canonical reason-code set', () => {
    const digest = buildSettlementPublicationDiagnosticsTrendDigest({
      snapshotSummaries: [
        {
          sourceIssueIdentifier: 'ONE-500',
          snapshotSha256: '4444444444444444444444444444444444444444444444444444444444444444',
          generatedAt: '2026-03-19T00:00:00Z',
          driftSeverity: 'low',
          driftCodes: [],
          breakingChangeCount: 0,
          riskReasonCodes: [
            'breaking_change_spike',
            'new_drift',
            'hash_mismatch',
            'severity_increase',
            'missing_window',
          ],
        },
      ],
    });

    expect(digest.regressionGateSummary.riskReasonCodes).toEqual([
      'spike_in_breaking_changes',
      'new_drift_code',
      'checksum_instability',
      'severity_escalation',
      'missing_snapshot_window',
    ]);
    expect(digest.trendDigest.rows[0]?.riskReasonCodes).toEqual([
      'spike_in_breaking_changes',
      'new_drift_code',
      'checksum_instability',
      'severity_escalation',
      'missing_snapshot_window',
    ]);
  });
});
