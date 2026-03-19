import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const VALIDATION_CODE_ORDER = [
  'missing_evidence',
  'dependency_open',
  'link_noncanonical',
  'artifact_gap',
  'checksum_mismatch',
] as const;

type ValidationCode = (typeof VALIDATION_CODE_ORDER)[number];
type FixtureSourceType = 'lane_diagnostic' | 'dependency_gate_diagnostic';

type PublicationDiagnosticsFixture = {
  id: string;
  sourceType: FixtureSourceType;
  laneWeight: number;
  severityWeight: number;
  issueIdentifier: string;
  bundleCode: string;
  recordKey: string;
  validationDiagnostics: ValidationCode[];
  payload: Record<string, unknown>;
};

export type SettlementPublicationDiagnosticsFixtureExport = {
  contract: 'settlement-publication-diagnostics-fixture-export.v1';
  fixtures: PublicationDiagnosticsFixture[];
  manifest: {
    schemaVersion: 'settlement-publication-diagnostics-fixture-export.v1';
    generatedAtIso: string;
    inputFingerprint: string;
    recordCount: number;
    checksumSha256: string;
    orderingKeySpec: string[];
  };
};

export function buildSettlementPublicationDiagnosticsFixtureExport(input: {
  diagnostics: Record<string, unknown>;
  asOfIso?: string;
}): SettlementPublicationDiagnosticsFixtureExport {
  const generatedAtIso = toIsoOrDefault(input.asOfIso);
  const diagnostics = toRecord(input.diagnostics);
  const laneDiagnostics = Array.isArray(diagnostics.laneDiagnostics) ? diagnostics.laneDiagnostics : [];
  const dependencyGateDiagnostics = Array.isArray(diagnostics.dependencyGateDiagnostics)
    ? diagnostics.dependencyGateDiagnostics
    : [];

  const fixtures = [
    ...laneDiagnostics.map((value, index) => buildFixture(value, index, 'lane_diagnostic')),
    ...dependencyGateDiagnostics.map((value, index) => buildFixture(value, index, 'dependency_gate_diagnostic')),
  ].sort(compareFixture);

  const inputFingerprint = sha256Hex(stableSerialize(normalizeValue(diagnostics)));
  const manifestWithoutChecksum = {
    schemaVersion: 'settlement-publication-diagnostics-fixture-export.v1' as const,
    generatedAtIso,
    inputFingerprint,
    recordCount: fixtures.length,
    orderingKeySpec: ['laneWeight', 'severityWeight', 'issueIdentifier', 'bundleCode', 'recordKey'],
  };
  const checksumSha256 = sha256Hex(
    stableSerialize({
      fixtures,
      manifest: manifestWithoutChecksum,
    }),
  );

  return {
    contract: 'settlement-publication-diagnostics-fixture-export.v1',
    fixtures,
    manifest: {
      ...manifestWithoutChecksum,
      checksumSha256,
    },
  };
}

function buildFixture(value: unknown, index: number, sourceType: FixtureSourceType): PublicationDiagnosticsFixture {
  const row = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(row.issueIdentifier) ?? `UNKNOWN-${index + 1}`;
  const bundleCode = normalizeString(row.bundleCode) ?? 'bundle-unknown';
  const laneWeight = normalizeNumber(
    row.laneWeight ?? row.lanePriorityWeight ?? row.windowRank ?? row.windowRankTo ?? row.windowRankFrom,
    999,
  );
  const severityWeight = sourceType === 'lane_diagnostic'
    ? normalizeNumber(row.severityWeight ?? row.deltaSeverityWeight, 2)
    : normalizeNumber(
      row.severityWeight ?? row.gateSeverityWeight ?? (normalizeStatus(row.statusTo ?? row.status) === 'unresolved' ? 1 : 2),
      2,
    );
  const recordKey = normalizeString(row.recordKey ?? row.fieldPath ?? row.laneId ?? row.dependencyIssueIdentifier)
    ?? `${sourceType}-${index + 1}`;
  const validationDiagnostics = resolveValidationDiagnostics(row, sourceType);

  return {
    id: `${sourceType}:${issueIdentifier}:${bundleCode}:${recordKey}`,
    sourceType,
    laneWeight,
    severityWeight,
    issueIdentifier,
    bundleCode,
    recordKey,
    validationDiagnostics,
    payload: normalizeValue(row) as Record<string, unknown>,
  };
}

function resolveValidationDiagnostics(
  row: Record<string, unknown>,
  sourceType: FixtureSourceType,
): ValidationCode[] {
  const collected = new Set<ValidationCode>();
  const fromArrays = [
    ...(toArray(row.validationDiagnostics)),
    ...(toArray(row.gateReasonCodes)),
    ...(toArray(row.deltaReasonCodes)),
    ...(toArray(row.reasonCodes)),
  ];

  fromArrays.forEach((value) => {
    const normalized = mapValidationCode(value);
    if (normalized) {
      collected.add(normalized);
    }
  });

  const combinedText = [
    normalizeString(row.unresolvedReason),
    normalizeString(row.message),
    normalizeString(row.notes),
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();

  if (combinedText.includes('missing evidence')) {
    collected.add('missing_evidence');
  }
  if (combinedText.includes('noncanonical') || combinedText.includes('non-canonical')) {
    collected.add('link_noncanonical');
  }
  if (combinedText.includes('artifact gap') || combinedText.includes('missing artifact')) {
    collected.add('artifact_gap');
  }
  if (combinedText.includes('checksum mismatch') || combinedText.includes('hash mismatch')) {
    collected.add('checksum_mismatch');
  }

  if (sourceType === 'dependency_gate_diagnostic' && normalizeStatus(row.statusTo ?? row.status) === 'unresolved') {
    collected.add('dependency_open');
  }

  return VALIDATION_CODE_ORDER.filter((code) => collected.has(code));
}

function mapValidationCode(value: unknown): ValidationCode | null {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === 'missing_evidence') {
    return 'missing_evidence';
  }
  if (normalized === 'dependency_open' || normalized === 'unresolved_dependency') {
    return 'dependency_open';
  }
  if (normalized === 'link_noncanonical' || normalized === 'noncanonical_link') {
    return 'link_noncanonical';
  }
  if (normalized === 'artifact_gap' || normalized === 'missing_artifact') {
    return 'artifact_gap';
  }
  if (normalized === 'checksum_mismatch' || normalized === 'hash_mismatch') {
    return 'checksum_mismatch';
  }
  return null;
}

function compareFixture(left: PublicationDiagnosticsFixture, right: PublicationDiagnosticsFixture): number {
  if (left.laneWeight !== right.laneWeight) {
    return left.laneWeight - right.laneWeight;
  }
  if (left.severityWeight !== right.severityWeight) {
    return left.severityWeight - right.severityWeight;
  }
  const issue = left.issueIdentifier.localeCompare(right.issueIdentifier);
  if (issue !== 0) {
    return issue;
  }
  const bundle = left.bundleCode.localeCompare(right.bundleCode);
  if (bundle !== 0) {
    return bundle;
  }
  const record = left.recordKey.localeCompare(right.recordKey);
  if (record !== 0) {
    return record;
  }
  return left.id.localeCompare(right.id);
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

function normalizeStatus(value: unknown): 'resolved' | 'unresolved' | null {
  const normalized = normalizeString(value)?.toLowerCase();
  if (normalized === 'resolved' || normalized === 'unresolved') {
    return normalized;
  }
  return null;
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
  if (Number.isNaN(date.getTime())) {
    return '1970-01-01T00:00:00.000Z';
  }
  return date.toISOString();
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(value);
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
  return value;
}
