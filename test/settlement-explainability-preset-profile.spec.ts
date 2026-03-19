import {
  BULK_SETTLEMENT_ROLLBACK_REASON_CODES,
  SETTLEMENT_EXPLAINABILITY_PROFILE_VALIDATION_REASON_CODES,
  SETTLEMENT_EXPLAINABILITY_SEVERITY_WINDOWS,
  buildSettlementExplainabilityPresetProfile,
} from '../src/settlements/bulk-settlement-preview';

describe('settlement explainability preset profile', () => {
  it('returns deterministic default profile contract with explicit keys', () => {
    const profile = buildSettlementExplainabilityPresetProfile({});

    expect(profile.contract).toBe('settlement-explainability-preset-profile.v1');
    expect(profile.presetSlots.map((slot) => slot.key)).toEqual([
      'all_anomalies',
      'critical_guardrails',
      'stale_and_mixed',
    ]);
    expect(profile.reasonBuckets.map((row) => row.code)).toEqual([...BULK_SETTLEMENT_ROLLBACK_REASON_CODES]);
    expect(profile.severityWindows.map((row) => row.code)).toEqual([...SETTLEMENT_EXPLAINABILITY_SEVERITY_WINDOWS]);
    expect(profile.defaultSelection).toEqual({
      presetSlotKey: 'all_anomalies',
      reasonBuckets: {
        MALFORMED_ROW: true,
        STALE_VERSION_RISK: true,
        MIXED_STATUS_SELECTION: true,
        HIGH_DELTA_ANOMALY: true,
      },
      severityWindows: {
        warning: true,
        critical: true,
      },
    });
    expect(profile.metadata.validationReasonCodes).toEqual([]);
  });

  it('normalizes mixed custom preset payloads with deterministic ordering', () => {
    const profile = buildSettlementExplainabilityPresetProfile({
      presetSlots: [
        {
          key: 'OPS-CUSTOM',
          label: 'Ops custom',
          reasonCodes: ['STALE_VERSION_RISK', 'MIXED_STATUS_SELECTION'],
          severityWindows: ['warning'],
        },
        {
          key: 'critical_guardrails',
          label: 'Critical override',
          reasonCodes: ['HIGH_DELTA_ANOMALY'],
          severityWindows: ['critical'],
        },
      ],
      defaultSelection: {
        presetSlotKey: 'ops-custom',
      },
    });

    expect(profile.presetSlots.map((slot) => slot.key)).toEqual([
      'all_anomalies',
      'critical_guardrails',
      'stale_and_mixed',
      'ops-custom',
    ]);
    expect(profile.presetSlots.find((slot) => slot.key === 'ops-custom')).toEqual({
      key: 'ops-custom',
      label: 'Ops custom',
      reasonBuckets: {
        MALFORMED_ROW: false,
        STALE_VERSION_RISK: true,
        MIXED_STATUS_SELECTION: true,
        HIGH_DELTA_ANOMALY: false,
      },
      severityWindows: {
        warning: true,
        critical: false,
      },
      isDefault: true,
    });
    expect(profile.defaultSelection.presetSlotKey).toBe('ops-custom');
    expect(profile.metadata.validationReasonCodes).toEqual([]);
  });

  it('returns machine-readable validation reason codes for malformed and partial payloads', () => {
    const profile = buildSettlementExplainabilityPresetProfile({
      presetSlots: [
        { key: '', reasonCodes: ['MALFORMED_ROW'], severityWindows: ['critical'] },
        { key: 'dup_slot', reasonCodes: ['UNKNOWN_CODE'], severityWindows: ['critical', 'bad'] },
        { key: 'dup_slot', reasonCodes: ['MIXED_STATUS_SELECTION'] },
      ],
      defaultSelection: {
        reasonCodes: ['MALFORMED_ROW', 'not-real'],
      },
    });

    expect(profile.presetSlots.map((slot) => slot.key)).toEqual([
      'all_anomalies',
      'critical_guardrails',
      'stale_and_mixed',
      'dup_slot',
    ]);
    expect(profile.metadata.validationReasonCodes).toEqual([
      ...SETTLEMENT_EXPLAINABILITY_PROFILE_VALIDATION_REASON_CODES.filter((code) => (
        code !== 'BEP-001_INVALID_PRESET_SLOTS' && code !== 'BEP-006_INVALID_DEFAULT_SELECTION'
      )),
    ]);
    expect(profile.defaultSelection.severityWindows).toEqual({
      warning: false,
      critical: false,
    });
  });

  it('remains byte-stable across deterministic replay', () => {
    const payload = {
      presetSlots: [
        {
          key: 'slot-z',
          label: 'Slot Z',
          reasonCodes: ['HIGH_DELTA_ANOMALY', 'MALFORMED_ROW'],
          severityWindows: ['critical'],
        },
      ],
      defaultSelection: {
        reasonCodes: ['MALFORMED_ROW'],
        severityWindows: ['critical'],
      },
    };

    const first = buildSettlementExplainabilityPresetProfile(payload);
    const second = buildSettlementExplainabilityPresetProfile(payload);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
