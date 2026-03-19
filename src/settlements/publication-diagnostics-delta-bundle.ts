import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;

const CANONICAL_VALIDATOR_REASON_CODES = [
  'missing_required_field',
  'enum_drift',
  'type_mismatch',
  'ordering_regression',
  'checksum_mismatch',
] as const;

type CanonicalValidatorReasonCode = (typeof CANONICAL_VALIDATOR_REASON_CODES)[number];

type PublicationDiagnosticsDeltaBundleEntry = {
  deltaSeverityWeight: number;
  scoreBandShiftWeight: number;
  issueIdentifier: string;
  bundleCode: string;
  fieldPath: string;
  baselineValue: unknown;
  candidateValue: unknown;
  validatorReasonCodes: CanonicalValidatorReasonCode[];
};

export type SettlementPublicationDiagnosticsDeltaBundle = {
  contract: 'settlement-publication-diagnostics-delta-bundle.v1';
  deltaBundle: {
    schemaVersion: 'settlement-publication-diagnostics-delta-bundle.v1';
    generatedAtIso: string;
    inputFingerprint: string;
    checksumSha256: string;
    orderingKeySpec: string[];
    entryCount: number;
    entries: PublicationDiagnosticsDeltaBundleEntry[];
  };
  contractValidation: {
    schemaVersion: 'settlement-publication-diagnostics-delta-bundle.v1';
    inputFingerprint: string;
    requiredFieldCoverage: number;
    missingFieldPaths: string[];
    enumDriftCodes: string[];
    isContractSafe: boolean;
    validatorReasonCodes: CanonicalValidatorReasonCode[];
  };
};

type NormalizedEntry = {
  issueIdentifier: string;
  bundleCode: string;
  fieldPath: string;
  deltaSeverityWeight: number;
  scoreBandShiftWeight: number;
  value: unknown;
  reasonCodes: CanonicalValidatorReasonCode[];
};

type DigestSignals = {
  checksum: string | null;
};

type ParsedDigest = {
  entries: NormalizedEntry[];
  signals: DigestSignals;
};

export function buildSettlementPublicationDiagnosticsDeltaBundle(input: {
  baselineDigest: Record<string, unknown>;
  candidateDigest: Record<string, unknown>;
  asOfIso?: string;
}): SettlementPublicationDiagnosticsDeltaBundle {
  const generatedAtIso = toIsoOrDefault(input.asOfIso);
  const baselineDigest = toRecord(input.baselineDigest);
  const candidateDigest = toRecord(input.candidateDigest);

  const baselineParsed = parseDigest(baselineDigest);
  const candidateParsed = parseDigest(candidateDigest);
  const baselineByKey = new Map(baselineParsed.entries.map((entry) => [entryKey(entry), entry]));
  const candidateByKey = new Map(candidateParsed.entries.map((entry) => [entryKey(entry), entry]));

  const keys = [...new Set([...baselineByKey.keys(), ...candidateByKey.keys()])];

  const deltaEntries = keys
    .map((key) => {
      const baseline = baselineByKey.get(key) ?? null;
      const candidate = candidateByKey.get(key) ?? null;

      const issueIdentifier = candidate?.issueIdentifier ?? baseline?.issueIdentifier ?? 'UNKNOWN-0';
      const bundleCode = candidate?.bundleCode ?? baseline?.bundleCode ?? 'bundle-unknown';
      const fieldPath = candidate?.fieldPath ?? baseline?.fieldPath ?? 'unknown.field';
      const deltaSeverityWeight = candidate?.deltaSeverityWeight ?? baseline?.deltaSeverityWeight ?? 999;
      const scoreBandShiftWeight = candidate?.scoreBandShiftWeight ?? baseline?.scoreBandShiftWeight ?? 999;

      const reasonSet = new Set<CanonicalValidatorReasonCode>([
        ...(baseline?.reasonCodes ?? []),
        ...(candidate?.reasonCodes ?? []),
      ]);

      if (candidate === null || baseline === null) {
        reasonSet.add('missing_required_field');
      }
      if (baseline && candidate && valueType(baseline.value) !== valueType(candidate.value)) {
        reasonSet.add('type_mismatch');
      }

      return {
        deltaSeverityWeight,
        scoreBandShiftWeight,
        issueIdentifier,
        bundleCode,
        fieldPath,
        baselineValue: baseline?.value ?? null,
        candidateValue: candidate?.value ?? null,
        validatorReasonCodes: CANONICAL_VALIDATOR_REASON_CODES.filter((code) => reasonSet.has(code)),
      };
    })
    .sort(compareDeltaEntry);

  const requiredFieldChecks = collectRequiredFieldChecks(deltaEntries);
  const missingFieldPaths = requiredFieldChecks
    .filter((check) => !check.present)
    .map((check) => check.path)
    .sort((left, right) => left.localeCompare(right));

  const reasonCodes = new Set<CanonicalValidatorReasonCode>();
  deltaEntries.forEach((entry) => {
    entry.validatorReasonCodes.forEach((code) => reasonCodes.add(code));
  });

  const baselineChecksum = baselineParsed.signals.checksum;
  const candidateChecksum = candidateParsed.signals.checksum;
  if (baselineChecksum && candidateChecksum && baselineChecksum !== candidateChecksum) {
    reasonCodes.add('checksum_mismatch');
  }

  if (missingFieldPaths.length > 0) {
    reasonCodes.add('missing_required_field');
  }

  const enumDriftCodes = reasonCodes.has('enum_drift') ? ['enum_drift'] : [];
  const validatorReasonCodes = CANONICAL_VALIDATOR_REASON_CODES.filter((code) => reasonCodes.has(code));
  const requiredFieldCoverage = requiredFieldChecks.length === 0
    ? 1
    : Number(((requiredFieldChecks.length - missingFieldPaths.length) / requiredFieldChecks.length).toFixed(6));

  const inputFingerprint = sha256Hex(stableSerialize({
    baselineEntries: baselineParsed.entries,
    candidateEntries: candidateParsed.entries,
    baselineChecksum: baselineParsed.signals.checksum,
    candidateChecksum: candidateParsed.signals.checksum,
  }));

  const deltaBundleWithoutChecksum = {
    schemaVersion: 'settlement-publication-diagnostics-delta-bundle.v1' as const,
    generatedAtIso,
    inputFingerprint,
    orderingKeySpec: [
      'deltaSeverityWeight',
      'scoreBandShiftWeight',
      'issueIdentifier',
      'bundleCode',
      'fieldPath',
    ],
    entryCount: deltaEntries.length,
    entries: deltaEntries,
  };

  const checksumSha256 = sha256Hex(stableSerialize(deltaBundleWithoutChecksum));

  return {
    contract: 'settlement-publication-diagnostics-delta-bundle.v1',
    deltaBundle: {
      ...deltaBundleWithoutChecksum,
      checksumSha256,
    },
    contractValidation: {
      schemaVersion: 'settlement-publication-diagnostics-delta-bundle.v1',
      inputFingerprint,
      requiredFieldCoverage,
      missingFieldPaths,
      enumDriftCodes,
      isContractSafe: missingFieldPaths.length === 0 && enumDriftCodes.length === 0,
      validatorReasonCodes,
    },
  };
}

function parseDigest(digest: Record<string, unknown>): ParsedDigest {
  const rawEntries = resolveRawEntries(digest);
  const normalizedInInputOrder = rawEntries.map((entry, index) => normalizeEntry(entry, index));
  const sortedEntries = [...normalizedInInputOrder].sort(compareNormalizedEntry);

  return {
    entries: sortedEntries,
    signals: {
      checksum: resolveChecksum(digest),
    },
  };
}

function resolveRawEntries(digest: Record<string, unknown>): unknown[] {
  if (Array.isArray(digest.entries)) {
    return digest.entries;
  }
  const laneDiagnostics = Array.isArray(digest.laneDiagnostics) ? digest.laneDiagnostics : [];
  const dependencyGateDiagnostics = Array.isArray(digest.dependencyGateDiagnostics)
    ? digest.dependencyGateDiagnostics
    : [];
  return [...laneDiagnostics, ...dependencyGateDiagnostics];
}

function normalizeEntry(value: unknown, index: number): NormalizedEntry {
  const row = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`;
  const bundleCode = normalizeString(row.bundleCode) ?? 'bundle-unknown';
  const fieldPath = normalizeString(row.fieldPath ?? row.recordKey ?? row.laneId ?? row.dependencyIssueIdentifier)
    ?? `field-${index + 1}`;
  const deltaSeverityWeight = normalizeNumber(row.deltaSeverityWeight ?? row.severityWeight, 999);
  const scoreBandShiftWeight = normalizeNumber(
    row.scoreBandShiftWeight ?? row.scoreBandDeltaWeight ?? row.scoreBandWeight,
    999,
  );
  const reasonCodes = normalizeReasonCodes([
    ...toArray(row.validatorReasonCodes),
    ...toArray(row.validationDiagnostics),
    ...toArray(row.deltaReasonCodes),
    ...toArray(row.gateReasonCodes),
    ...toArray(row.reasonCodes),
    row.unresolvedReason,
    row.message,
    row.notes,
  ]);

  const valueCandidate = row.value ?? row.payload ?? row.candidateValue ?? row.currentValue ?? row.scoreBandTo ?? null;

  return {
    issueIdentifier,
    bundleCode,
    fieldPath,
    deltaSeverityWeight,
    scoreBandShiftWeight,
    value: normalizeValue(valueCandidate),
    reasonCodes,
  };
}

function compareDeltaEntry(
  left: PublicationDiagnosticsDeltaBundleEntry,
  right: PublicationDiagnosticsDeltaBundleEntry,
): number {
  if (left.deltaSeverityWeight !== right.deltaSeverityWeight) {
    return left.deltaSeverityWeight - right.deltaSeverityWeight;
  }
  if (left.scoreBandShiftWeight !== right.scoreBandShiftWeight) {
    return left.scoreBandShiftWeight - right.scoreBandShiftWeight;
  }
  const issueIdentifier = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issueIdentifier !== 0) {
    return issueIdentifier;
  }
  const bundleCode = left.bundleCode.localeCompare(right.bundleCode);
  if (bundleCode !== 0) {
    return bundleCode;
  }
  return left.fieldPath.localeCompare(right.fieldPath);
}

function compareNormalizedEntry(left: NormalizedEntry, right: NormalizedEntry): number {
  if (left.deltaSeverityWeight !== right.deltaSeverityWeight) {
    return left.deltaSeverityWeight - right.deltaSeverityWeight;
  }
  if (left.scoreBandShiftWeight !== right.scoreBandShiftWeight) {
    return left.scoreBandShiftWeight - right.scoreBandShiftWeight;
  }
  const issueIdentifier = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issueIdentifier !== 0) {
    return issueIdentifier;
  }
  const bundleCode = left.bundleCode.localeCompare(right.bundleCode);
  if (bundleCode !== 0) {
    return bundleCode;
  }
  return left.fieldPath.localeCompare(right.fieldPath);
}

function collectRequiredFieldChecks(entries: PublicationDiagnosticsDeltaBundleEntry[]): Array<{ path: string; present: boolean }> {
  return entries.flatMap((entry) => {
    const pathPrefix = `${entry.issueIdentifier}:${entry.bundleCode}:${entry.fieldPath}`;
    return [
      {
        path: `${pathPrefix}.issueIdentifier`,
        present: normalizeString(entry.issueIdentifier) !== null,
      },
      {
        path: `${pathPrefix}.bundleCode`,
        present: normalizeString(entry.bundleCode) !== null,
      },
      {
        path: `${pathPrefix}.fieldPath`,
        present: normalizeString(entry.fieldPath) !== null,
      },
      {
        path: `${pathPrefix}.deltaSeverityWeight`,
        present: Number.isFinite(entry.deltaSeverityWeight),
      },
      {
        path: `${pathPrefix}.scoreBandShiftWeight`,
        present: Number.isFinite(entry.scoreBandShiftWeight),
      },
    ];
  });
}

function normalizeReasonCodes(values: unknown[]): CanonicalValidatorReasonCode[] {
  const collected = new Set<CanonicalValidatorReasonCode>();
  values.forEach((value) => {
    const mapped = mapReasonCode(value);
    if (mapped) {
      collected.add(mapped);
    }
  });

  return CANONICAL_VALIDATOR_REASON_CODES.filter((code) => collected.has(code));
}

function mapReasonCode(value: unknown): CanonicalValidatorReasonCode | null {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  if (
    normalized === 'missing_required_field'
    || normalized === 'missing_field'
    || normalized === 'required_field_missing'
  ) {
    return 'missing_required_field';
  }
  if (
    normalized === 'enum_drift'
    || normalized === 'enum_contract_gap'
    || normalized === 'new_drift_code'
  ) {
    return 'enum_drift';
  }
  if (
    normalized === 'type_mismatch'
    || normalized === 'type_changed'
    || normalized === 'invalid_type'
  ) {
    return 'type_mismatch';
  }
  if (normalized === 'ordering_regression') {
    return 'ordering_regression';
  }
  if (
    normalized === 'checksum_mismatch'
    || normalized === 'hash_mismatch'
    || normalized === 'checksum_instability'
  ) {
    return 'checksum_mismatch';
  }
  return null;
}

function resolveChecksum(digest: Record<string, unknown>): string | null {
  const checksums = [
    normalizeString(digest.checksumSha256),
    normalizeString(digest.snapshotSha256),
    normalizeString(digest.fingerprint),
    normalizeString(digest.windowFingerprint),
    normalizeString(toRecord(digest.snapshot).snapshotSha256),
    normalizeString(toRecord(digest.manifest).checksumSha256),
  ].filter((value): value is string => value !== null);

  return checksums[0] ?? null;
}

function valueType(value: unknown): string {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value === null) {
    return 'null';
  }
  return typeof value;
}

function entryKey(entry: Pick<NormalizedEntry, 'issueIdentifier' | 'bundleCode' | 'fieldPath'>): string {
  return `${entry.issueIdentifier}::${entry.bundleCode}::${entry.fieldPath}`;
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const matches = normalized.match(ISSUE_IDENTIFIER_PATTERN);
  if (!matches) {
    return null;
  }
  return `${matches[1].toUpperCase()}-${matches[2]}`;
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toIsoOrDefault(value?: string): string {
  const raw = normalizeString(value);
  if (!raw) {
    return '1970-01-01T00:00:00.000Z';
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '1970-01-01T00:00:00.000Z' : date.toISOString();
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return 'NaN';
    }
    if (!Number.isFinite(value)) {
      return value > 0 ? 'Infinity' : '-Infinity';
    }
  }
  return value;
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(normalizeValue(value));
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
