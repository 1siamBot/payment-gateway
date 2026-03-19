import { createHash } from 'node:crypto';

const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;
const DRIFT_CODE_ORDER = [
  'missing_field',
  'type_changed',
  'enum_contract_gap',
  'ordering_regression',
  'checksum_mismatch',
] as const;

type DriftCode = (typeof DRIFT_CODE_ORDER)[number];
type DriftSeverity = 'none' | 'low' | 'medium' | 'high';

type SnapshotFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';

type SnapshotField = {
  sectionWeight: number;
  fieldPath: string;
  fieldTypeWeight: number;
  sourceIssueIdentifier: string;
  fieldType: SnapshotFieldType;
  value: unknown;
};

type ExpectedFieldSchema = {
  fieldPath: string;
  fieldType: SnapshotFieldType;
  allowedValues?: string[];
};

export type SettlementPublicationDiagnosticsContractSnapshot = {
  contract: 'settlement-publication-diagnostics-contract-snapshot.v1';
  snapshot: {
    schemaVersion: string;
    generatedAtIso: string;
    inputFingerprint: string;
    snapshotSha256: string;
    orderingKeySpec: string[];
    fields: SnapshotField[];
  };
  driftReport: {
    schemaVersion: string;
    inputFingerprint: string;
    snapshotSha256: string;
    driftSeverity: DriftSeverity;
    driftCodes: DriftCode[];
    breakingChangeCount: number;
    nonBreakingChangeCount: number;
  };
};

export function buildSettlementPublicationDiagnosticsContractSnapshot(input: {
  diagnostics: Record<string, unknown>;
  expectedSchema: Record<string, unknown>;
  asOfIso?: string;
}): SettlementPublicationDiagnosticsContractSnapshot {
  const generatedAtIso = toIsoOrDefault(input.asOfIso);
  const diagnostics = normalizeValue(toRecord(input.diagnostics));
  const expectedSchema = toRecord(input.expectedSchema);

  const fields: SnapshotField[] = [];
  collectSnapshotFields(diagnostics, '', 'UNSPECIFIED', fields);
  fields.sort(compareSnapshotField);

  const inputFingerprint = sha256Hex(stableSerialize(diagnostics));
  const schemaVersion = normalizeString(expectedSchema.schemaVersion)
    ?? 'settlement-publication-diagnostics-contract-snapshot.v1';
  const snapshotWithoutChecksum = {
    schemaVersion,
    generatedAtIso,
    inputFingerprint,
    orderingKeySpec: ['sectionWeight', 'fieldPath', 'fieldTypeWeight', 'sourceIssueIdentifier'],
    fields,
  };
  const snapshotSha256 = sha256Hex(stableSerialize(snapshotWithoutChecksum));

  const driftCodes = resolveDriftCodes(fields, expectedSchema, snapshotSha256);
  const breakingChangeCount = driftCodes.filter((code) => isBreakingCode(code)).length;
  const nonBreakingChangeCount = driftCodes.length - breakingChangeCount;

  return {
    contract: 'settlement-publication-diagnostics-contract-snapshot.v1',
    snapshot: {
      ...snapshotWithoutChecksum,
      snapshotSha256,
    },
    driftReport: {
      schemaVersion,
      inputFingerprint,
      snapshotSha256,
      driftSeverity: classifyDriftSeverity(breakingChangeCount, nonBreakingChangeCount),
      driftCodes,
      breakingChangeCount,
      nonBreakingChangeCount,
    },
  };
}

function collectSnapshotFields(
  value: unknown,
  basePath: string,
  sourceIssueIdentifier: string,
  fields: SnapshotField[],
): void {
  const valueType = detectFieldType(value);
  if (basePath) {
    fields.push({
      sectionWeight: resolveSectionWeight(basePath),
      fieldPath: basePath,
      fieldTypeWeight: resolveFieldTypeWeight(valueType),
      sourceIssueIdentifier,
      fieldType: valueType,
      value: normalizeValue(value),
    });
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const nextSource = resolveSourceIssueIdentifier(entry, sourceIssueIdentifier);
      collectSnapshotFields(entry, `${basePath}[${index}]`, nextSource, fields);
    });
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  Object.keys(value as Record<string, unknown>)
    .sort((left, right) => left.localeCompare(right))
    .forEach((key) => {
      const record = value as Record<string, unknown>;
      const child = record[key];
      const childPath = basePath ? `${basePath}.${key}` : key;
      const nextSource = resolveSourceIssueIdentifier(child, resolveSourceIssueIdentifier(value, sourceIssueIdentifier));
      collectSnapshotFields(child, childPath, nextSource, fields);
    });
}

function resolveDriftCodes(
  fields: SnapshotField[],
  expectedSchemaRecord: Record<string, unknown>,
  snapshotSha256: string,
): DriftCode[] {
  const observedByPath = new Map<string, SnapshotField>();
  fields.forEach((field) => {
    observedByPath.set(field.fieldPath, field);
  });

  const expectedFields = toExpectedFields(expectedSchemaRecord.fields);
  const expectedPaths = expectedFields.map((field) => field.fieldPath);
  const expectedByPath = new Map(expectedFields.map((field) => [field.fieldPath, field]));

  const driftCodes = new Set<DriftCode>();

  expectedPaths.forEach((path) => {
    const expected = expectedByPath.get(path);
    const observed = observedByPath.get(path);
    if (!expected) {
      return;
    }
    if (!observed) {
      driftCodes.add('missing_field');
      return;
    }
    if (observed.fieldType !== expected.fieldType) {
      driftCodes.add('type_changed');
      return;
    }
    if (expected.allowedValues?.length && !expected.allowedValues.includes(String(observed.value))) {
      driftCodes.add('enum_contract_gap');
    }
  });

  const sharedPaths = expectedPaths.filter((path) => observedByPath.has(path));
  if (hasOrderingRegression(sharedPaths, fields, expectedFields)) {
    driftCodes.add('ordering_regression');
  }

  const expectedChecksum = normalizeString(expectedSchemaRecord.snapshotSha256);
  if (expectedChecksum && expectedChecksum !== snapshotSha256) {
    driftCodes.add('checksum_mismatch');
  }

  return DRIFT_CODE_ORDER.filter((code) => driftCodes.has(code));
}

function hasOrderingRegression(
  sharedPaths: string[],
  fields: SnapshotField[],
  expectedFields: ExpectedFieldSchema[],
): boolean {
  if (sharedPaths.length < 2) {
    return false;
  }

  const actualOrder = new Map<string, number>();
  fields.forEach((field, index) => {
    actualOrder.set(field.fieldPath, index);
  });

  const expectedOrder = new Map<string, number>();
  expectedFields.forEach((field, index) => {
    expectedOrder.set(field.fieldPath, index);
  });

  for (let leftIndex = 0; leftIndex < sharedPaths.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sharedPaths.length; rightIndex += 1) {
      const leftPath = sharedPaths[leftIndex];
      const rightPath = sharedPaths[rightIndex];
      const expectedLeft = expectedOrder.get(leftPath) ?? -1;
      const expectedRight = expectedOrder.get(rightPath) ?? -1;
      const actualLeft = actualOrder.get(leftPath) ?? -1;
      const actualRight = actualOrder.get(rightPath) ?? -1;
      if (expectedLeft < expectedRight && actualLeft > actualRight) {
        return true;
      }
    }
  }

  return false;
}

function toExpectedFields(value: unknown): ExpectedFieldSchema[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const mapped: ExpectedFieldSchema[] = [];
  value.forEach((entry) => {
    const record = toRecord(entry);
    const fieldPath = normalizeString(record.fieldPath);
    const fieldType = normalizeFieldType(record.fieldType);
    if (!fieldPath || !fieldType) {
      return;
    }
    const allowedValues = toAllowedValues(record.allowedValues);
    mapped.push(
      allowedValues
        ? { fieldPath, fieldType, allowedValues }
        : { fieldPath, fieldType },
    );
  });

  return mapped;
}

function toAllowedValues(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => entry !== null);
  if (!normalized.length) {
    return undefined;
  }
  return [...new Set(normalized)];
}

function compareSnapshotField(left: SnapshotField, right: SnapshotField): number {
  if (left.sectionWeight !== right.sectionWeight) {
    return left.sectionWeight - right.sectionWeight;
  }
  const fieldPath = left.fieldPath.localeCompare(right.fieldPath);
  if (fieldPath !== 0) {
    return fieldPath;
  }
  if (left.fieldTypeWeight !== right.fieldTypeWeight) {
    return left.fieldTypeWeight - right.fieldTypeWeight;
  }
  const sourceIssueIdentifier = left.sourceIssueIdentifier.localeCompare(right.sourceIssueIdentifier);
  if (sourceIssueIdentifier !== 0) {
    return sourceIssueIdentifier;
  }
  return stableSerialize(left.value).localeCompare(stableSerialize(right.value));
}

function classifyDriftSeverity(breakingChangeCount: number, nonBreakingChangeCount: number): DriftSeverity {
  if (breakingChangeCount > 0) {
    return 'high';
  }
  if (nonBreakingChangeCount > 1) {
    return 'medium';
  }
  if (nonBreakingChangeCount === 1) {
    return 'low';
  }
  return 'none';
}

function isBreakingCode(code: DriftCode): boolean {
  return code === 'missing_field' || code === 'type_changed' || code === 'enum_contract_gap';
}

function resolveSectionWeight(fieldPath: string): number {
  const normalized = fieldPath.toLowerCase();
  if (normalized.startsWith('lanediagnostics') || normalized.includes('.lanediagnostics')) {
    return 1;
  }
  if (normalized.startsWith('dependencygatediagnostics') || normalized.includes('.dependencygatediagnostics')) {
    return 2;
  }
  return 9;
}

function resolveFieldTypeWeight(fieldType: SnapshotFieldType): number {
  switch (fieldType) {
    case 'number':
      return 1;
    case 'string':
      return 2;
    case 'boolean':
      return 3;
    case 'array':
      return 4;
    case 'object':
      return 5;
    case 'null':
    default:
      return 6;
  }
}

function detectFieldType(value: unknown): SnapshotFieldType {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  return 'object';
}

function resolveSourceIssueIdentifier(value: unknown, fallback: string): string {
  const record = toRecord(value);
  const issueIdentifier = normalizeIssueIdentifier(record.issueIdentifier);
  if (issueIdentifier) {
    return issueIdentifier;
  }
  return fallback;
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

function normalizeFieldType(value: unknown): SnapshotFieldType | null {
  const normalized = normalizeString(value)?.toLowerCase();
  if (
    normalized === 'string'
    || normalized === 'number'
    || normalized === 'boolean'
    || normalized === 'array'
    || normalized === 'object'
    || normalized === 'null'
  ) {
    return normalized;
  }
  return null;
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
