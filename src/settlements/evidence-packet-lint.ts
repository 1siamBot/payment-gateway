import { createHash } from 'node:crypto';

export const SETTLEMENT_EVIDENCE_PACKET_PR_MODES = ['pr_link', 'no_pr_yet'] as const;

export const SETTLEMENT_EVIDENCE_PACKET_LINT_FINDING_CODES = [
  'MISSING_BRANCH',
  'MISSING_FULL_SHA',
  'INVALID_FULL_SHA',
  'MISSING_PR_MODE',
  'INVALID_PR_MODE',
  'MISSING_TEST_COMMAND',
  'MISSING_ARTIFACT_PATH',
  'MISSING_DEPENDENCY_ISSUE_LINKS',
  'INVALID_DEPENDENCY_ISSUE_LINK',
  'NON_CANONICAL_DEPENDENCY_ISSUE_LINK',
  'MISSING_BLOCKER_OWNER',
  'MISSING_BLOCKER_ETA',
] as const;

type SettlementEvidencePacketLintFindingCode =
  (typeof SETTLEMENT_EVIDENCE_PACKET_LINT_FINDING_CODES)[number];

type SettlementEvidencePacketPrMode = (typeof SETTLEMENT_EVIDENCE_PACKET_PR_MODES)[number];

type SettlementEvidencePacketLintSeverity = 'error' | 'warning';

type NormalizedEvidencePacket = {
  issueIdentifier: string;
  path: string;
  branch: string | null;
  fullSha: string | null;
  prMode: SettlementEvidencePacketPrMode | null;
  testCommand: string | null;
  artifactPath: string | null;
  dependencyIssueLinks: string[];
  blockerOwner: string | null;
  blockerEta: string | null;
};

export type SettlementEvidencePacketLintFinding = {
  code: SettlementEvidencePacketLintFindingCode;
  severity: SettlementEvidencePacketLintSeverity;
  severityPriority: number;
  field: string;
  fieldPriority: number;
  issueIdentifier: string;
  path: string;
  fieldPath: string;
  message: string;
  input: string | null;
  normalized: string | null;
};

export type SettlementEvidencePacketLintContract = {
  contract: 'settlement-evidence-packet-lint.v1';
  findings: SettlementEvidencePacketLintFinding[];
  normalizedPackets: Array<{
    issueIdentifier: string;
    path: string;
    branch: string | null;
    fullSha: string | null;
    prMode: SettlementEvidencePacketPrMode | null;
    testCommand: string | null;
    artifactPath: string | null;
    dependencyIssueLinks: string[];
    blockerOwner: string | null;
    blockerEta: string | null;
  }>;
  metadata: {
    packetCount: number;
    findingCount: number;
    errorCount: number;
    warningCount: number;
  };
  fingerprint: string;
};

const FIELD_PRIORITY: Record<string, number> = {
  branch: 10,
  fullSha: 20,
  prMode: 30,
  testCommand: 40,
  artifactPath: 50,
  dependencyIssueLinks: 60,
  blockerOwner: 70,
  blockerEta: 80,
};

const SEVERITY_PRIORITY: Record<SettlementEvidencePacketLintSeverity, number> = {
  error: 1,
  warning: 2,
};

const FULL_SHA_PATTERN = /^[a-f0-9]{40}$/;
const ISSUE_IDENTIFIER_PATTERN = /^([a-z0-9]+)-(\d+)$/i;

export function lintSettlementEvidencePackets(input: {
  packets: unknown[];
}): SettlementEvidencePacketLintContract {
  const findings: SettlementEvidencePacketLintFinding[] = [];
  const normalizedPackets = input.packets
    .map((packet, index) => normalizePacket(packet, index, findings))
    .sort(compareNormalizedPacket);

  const stableFindings = [...findings].sort(compareFinding);
  const fingerprintPayload = {
    contract: 'settlement-evidence-packet-lint.v1',
    findings: stableFindings,
    normalizedPackets,
  };
  const fingerprint = createHash('sha256').update(JSON.stringify(fingerprintPayload)).digest('hex');

  return {
    contract: 'settlement-evidence-packet-lint.v1',
    findings: stableFindings,
    normalizedPackets,
    metadata: {
      packetCount: normalizedPackets.length,
      findingCount: stableFindings.length,
      errorCount: stableFindings.filter((finding) => finding.severity === 'error').length,
      warningCount: stableFindings.filter((finding) => finding.severity === 'warning').length,
    },
    fingerprint,
  };
}

function normalizePacket(
  input: unknown,
  packetIndex: number,
  findings: SettlementEvidencePacketLintFinding[],
): NormalizedEvidencePacket {
  const packet = toRecord(input);
  const issueIdentifier = normalizeIssueIdentifier(packet.issueIdentifier) ?? `UNKNOWN-${packetIndex}`;
  const path = normalizeString(packet.path) ?? `packets[${packetIndex}]`;
  const findingScope = {
    issueIdentifier,
    path,
  };

  const branch = normalizeString(packet.branch);
  if (!branch) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_BRANCH',
      severity: 'error',
      field: 'branch',
      fieldPath: `packets[${packetIndex}].branch`,
      message: 'branch is required',
      input: toInputValue(packet.branch),
      normalized: null,
    });
  }

  const fullSha = normalizeString(packet.fullSha);
  if (!fullSha) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_FULL_SHA',
      severity: 'error',
      field: 'fullSha',
      fieldPath: `packets[${packetIndex}].fullSha`,
      message: 'fullSha is required',
      input: toInputValue(packet.fullSha),
      normalized: null,
    });
  } else if (!FULL_SHA_PATTERN.test(fullSha)) {
    pushFinding(findings, findingScope, {
      code: 'INVALID_FULL_SHA',
      severity: 'error',
      field: 'fullSha',
      fieldPath: `packets[${packetIndex}].fullSha`,
      message: 'fullSha must be a 40-character lowercase hexadecimal commit SHA',
      input: fullSha,
      normalized: null,
    });
  }

  const rawPrMode = normalizeString(packet.prMode);
  let prMode: SettlementEvidencePacketPrMode | null = null;
  if (!rawPrMode) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_PR_MODE',
      severity: 'error',
      field: 'prMode',
      fieldPath: `packets[${packetIndex}].prMode`,
      message: 'prMode is required',
      input: toInputValue(packet.prMode),
      normalized: null,
    });
  } else if (isPrMode(rawPrMode)) {
    prMode = rawPrMode;
  } else {
    pushFinding(findings, findingScope, {
      code: 'INVALID_PR_MODE',
      severity: 'error',
      field: 'prMode',
      fieldPath: `packets[${packetIndex}].prMode`,
      message: `prMode must be one of: ${SETTLEMENT_EVIDENCE_PACKET_PR_MODES.join(', ')}`,
      input: rawPrMode,
      normalized: null,
    });
  }

  const testCommand = normalizeString(packet.testCommand);
  if (!testCommand) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_TEST_COMMAND',
      severity: 'error',
      field: 'testCommand',
      fieldPath: `packets[${packetIndex}].testCommand`,
      message: 'testCommand is required',
      input: toInputValue(packet.testCommand),
      normalized: null,
    });
  }

  const artifactPath = normalizeString(packet.artifactPath);
  if (!artifactPath) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_ARTIFACT_PATH',
      severity: 'error',
      field: 'artifactPath',
      fieldPath: `packets[${packetIndex}].artifactPath`,
      message: 'artifactPath is required',
      input: toInputValue(packet.artifactPath),
      normalized: null,
    });
  }

  const dependencyLinks = normalizeDependencyLinks(
    packet.dependencyIssueLinks,
    packetIndex,
    findingScope,
    findings,
  );
  if (dependencyLinks.length === 0) {
    pushFinding(findings, findingScope, {
      code: 'MISSING_DEPENDENCY_ISSUE_LINKS',
      severity: 'error',
      field: 'dependencyIssueLinks',
      fieldPath: `packets[${packetIndex}].dependencyIssueLinks`,
      message: 'dependencyIssueLinks must include at least one issue link',
      input: toInputValue(packet.dependencyIssueLinks),
      normalized: null,
    });
  }

  const blockerOwner = normalizeString(packet.blockerOwner);
  const blockerEta = normalizeIsoDate(packet.blockerEta);
  if (prMode === 'no_pr_yet') {
    if (!blockerOwner) {
      pushFinding(findings, findingScope, {
        code: 'MISSING_BLOCKER_OWNER',
        severity: 'error',
        field: 'blockerOwner',
        fieldPath: `packets[${packetIndex}].blockerOwner`,
        message: 'blockerOwner is required when prMode=no_pr_yet',
        input: toInputValue(packet.blockerOwner),
        normalized: null,
      });
    }
    if (!blockerEta) {
      pushFinding(findings, findingScope, {
        code: 'MISSING_BLOCKER_ETA',
        severity: 'error',
        field: 'blockerEta',
        fieldPath: `packets[${packetIndex}].blockerEta`,
        message: 'blockerEta is required when prMode=no_pr_yet',
        input: toInputValue(packet.blockerEta),
        normalized: null,
      });
    }
  }

  return {
    issueIdentifier,
    path,
    branch,
    fullSha,
    prMode,
    testCommand,
    artifactPath,
    dependencyIssueLinks: dependencyLinks,
    blockerOwner,
    blockerEta,
  };
}

function normalizeDependencyLinks(
  input: unknown,
  packetIndex: number,
  findingScope: { issueIdentifier: string; path: string },
  findings: SettlementEvidencePacketLintFinding[],
): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = new Set<string>();
  input.forEach((value) => {
    const raw = normalizeString(value);
    if (!raw) {
      const stableFieldPath = `packets[${packetIndex}].dependencyIssueLinks:<empty>`;
      pushFinding(findings, findingScope, {
        code: 'INVALID_DEPENDENCY_ISSUE_LINK',
        severity: 'error',
        field: 'dependencyIssueLinks',
        fieldPath: stableFieldPath,
        message: 'dependency issue link must be a non-empty string',
        input: toInputValue(value),
        normalized: null,
      });
      return;
    }

    const canonical = canonicalizeIssueLink(raw);
    if (!canonical) {
      const stableFieldPath = `packets[${packetIndex}].dependencyIssueLinks:${raw}`;
      pushFinding(findings, findingScope, {
        code: 'INVALID_DEPENDENCY_ISSUE_LINK',
        severity: 'error',
        field: 'dependencyIssueLinks',
        fieldPath: stableFieldPath,
        message: 'dependency issue link must reference an issue identifier (for example /ONE/issues/ONE-256)',
        input: raw,
        normalized: null,
      });
      return;
    }

    normalized.add(canonical);
    if (raw !== canonical) {
      const stableFieldPath = `packets[${packetIndex}].dependencyIssueLinks:${canonical}`;
      pushFinding(findings, findingScope, {
        code: 'NON_CANONICAL_DEPENDENCY_ISSUE_LINK',
        severity: 'warning',
        field: 'dependencyIssueLinks',
        fieldPath: stableFieldPath,
        message: `dependency issue link normalized to canonical format: ${canonical}`,
        input: raw,
        normalized: canonical,
      });
    }
  });

  return [...normalized].sort((left, right) => left.localeCompare(right));
}

function canonicalizeIssueLink(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const pathname = extractIssuePathname(trimmed);
  if (!pathname) {
    return null;
  }

  const canonicalMatch = pathname.match(/^\/([A-Za-z0-9]+)\/issues\/([A-Za-z0-9]+-\d+)$/);
  if (canonicalMatch) {
    const identifier = canonicalMatch[2].toUpperCase();
    const identifierPrefix = identifier.split('-')[0];
    return `/${identifierPrefix}/issues/${identifier}`;
  }

  const unprefixedMatch = pathname.match(/^\/issues\/([A-Za-z0-9]+-\d+)$/);
  if (unprefixedMatch) {
    const identifier = unprefixedMatch[1].toUpperCase();
    const prefix = identifier.split('-')[0];
    return `/${prefix}/issues/${identifier}`;
  }

  const issueIdentifier = normalizeIssueIdentifier(pathname);
  if (issueIdentifier) {
    const prefix = issueIdentifier.split('-')[0];
    return `/${prefix}/issues/${issueIdentifier}`;
  }

  return null;
}

function extractIssuePathname(value: string): string | null {
  if (value.startsWith('/')) {
    return value;
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      return new URL(value).pathname;
    } catch {
      return null;
    }
  }
  return value;
}

function compareFinding(
  left: SettlementEvidencePacketLintFinding,
  right: SettlementEvidencePacketLintFinding,
): number {
  if (left.severityPriority !== right.severityPriority) {
    return left.severityPriority - right.severityPriority;
  }
  if (left.fieldPriority !== right.fieldPriority) {
    return left.fieldPriority - right.fieldPriority;
  }
  if (left.issueIdentifier !== right.issueIdentifier) {
    return left.issueIdentifier.localeCompare(right.issueIdentifier);
  }
  if (left.path !== right.path) {
    return left.path.localeCompare(right.path);
  }
  if (left.fieldPath !== right.fieldPath) {
    return left.fieldPath.localeCompare(right.fieldPath);
  }
  if (left.code !== right.code) {
    return left.code.localeCompare(right.code);
  }
  return left.message.localeCompare(right.message);
}

function compareNormalizedPacket(left: NormalizedEvidencePacket, right: NormalizedEvidencePacket): number {
  if (left.issueIdentifier !== right.issueIdentifier) {
    return left.issueIdentifier.localeCompare(right.issueIdentifier);
  }
  return left.path.localeCompare(right.path);
}

function pushFinding(
  findings: SettlementEvidencePacketLintFinding[],
  scope: { issueIdentifier: string; path: string },
  finding: {
    code: SettlementEvidencePacketLintFindingCode;
    severity: SettlementEvidencePacketLintSeverity;
    field: keyof typeof FIELD_PRIORITY;
    fieldPath: string;
    message: string;
    input: string | null;
    normalized: string | null;
  },
) {
  findings.push({
    code: finding.code,
    severity: finding.severity,
    severityPriority: SEVERITY_PRIORITY[finding.severity],
    field: finding.field,
    fieldPriority: FIELD_PRIORITY[finding.field],
    issueIdentifier: scope.issueIdentifier,
    path: scope.path,
    fieldPath: finding.fieldPath,
    message: finding.message,
    input: finding.input,
    normalized: finding.normalized,
  });
}

function normalizeIssueIdentifier(value: unknown): string | null {
  const normalized = normalizeString(value)?.toUpperCase() ?? null;
  if (!normalized || !ISSUE_IDENTIFIER_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeIsoDate(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString();
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toInputValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isPrMode(value: string): value is SettlementEvidencePacketPrMode {
  return (SETTLEMENT_EVIDENCE_PACKET_PR_MODES as readonly string[]).includes(value);
}
