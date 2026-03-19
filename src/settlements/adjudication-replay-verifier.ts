import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type CheckId = '10' | '11' | '12';
export type Verdict = 'PASS_FINAL' | 'FAIL';
export type OwnerRoute = 'frontend' | 'backend' | 'qa' | 'pm' | 'cto';

export type CanonicalPacket = {
  packet: {
    issue: 'ONE-104' | 'ONE-124';
    generatedAt: string;
    owner: string;
    correlationId: string;
    sourceIssue: string;
  };
  naming: {
    artifactPrefix: string;
    filePattern: string;
    artifactFileNames: string[];
  };
  version: {
    expectedVersion?: number;
    expectedUpdatedAt?: string;
    isLatestSnapshot?: boolean;
  };
  idempotency: {
    key: string;
  };
  response?: {
    status: number;
    code?: string;
    reason?: string;
    currentVersion?: number;
    currentUpdatedAt?: string;
  };
  dependency?: {
    one124ChecklistLink?: string;
  };
  unresolvedBlockers?: Array<{
    id: string;
    ownerRoute?: OwnerRoute;
  }>;
};

export type ReplayFixture = {
  id: string;
  type: 'pass' | 'fail';
  expectedSignatureKey: string;
  checks: CheckId[];
  packet: CanonicalPacket;
};

type SignatureRule = {
  checks: CheckId[];
  firstOwner: OwnerRoute;
  escalationOwner: OwnerRoute;
};

export type FixtureResult = {
  fixtureId: string;
  verdict: Verdict;
  checks: CheckId[];
  signatureKeys: string[];
  firstOwner: OwnerRoute | null;
  escalationOwner: OwnerRoute | null;
};

export type CheckResult = {
  checkId: CheckId;
  verdict: Verdict;
  signatureKey: string | null;
  failureSignatureKeys: string[];
  firstOwner: OwnerRoute | null;
  escalationOwner: OwnerRoute | null;
};

export type AdjudicationReplaySummary = {
  generatedAt: string;
  checkResults: CheckResult[];
  fixtureResults: FixtureResult[];
  totals: {
    fixtures: number;
    passed: number;
    failed: number;
  };
};

const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const SIGNATURE_RULES: Record<string, SignatureRule> = {
  TXN_GUARD_FIELDS_MISSING: { checks: ['10'], firstOwner: 'frontend', escalationOwner: 'backend' },
  TXN_STALE_VERSION_CONFLICT: { checks: ['10'], firstOwner: 'frontend', escalationOwner: 'backend' },
  TXN_CONFLICT_ENVELOPE_INCOMPLETE: { checks: ['10'], firstOwner: 'backend', escalationOwner: 'cto' },
  TXN_EVIDENCE_FILENAME_DRIFT: { checks: ['11'], firstOwner: 'qa', escalationOwner: 'frontend' },
  MX_08_QA_CHECKLIST_MISSING: { checks: ['11', '12'], firstOwner: 'frontend', escalationOwner: 'pm' },
  AC1_OWNER_ROUTE_MISSING: { checks: ['12'], firstOwner: 'pm', escalationOwner: 'cto' },
};

function validateIsoUtc(value: string | undefined): boolean {
  return typeof value === 'string' && ISO_UTC_REGEX.test(value);
}

function isSlugCase(value: string): boolean {
  return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value);
}

function validateFixtureShape(fixture: ReplayFixture) {
  if (!fixture.id || !Array.isArray(fixture.checks) || fixture.checks.length === 0) {
    throw new Error(`Invalid adjudication fixture shape: ${JSON.stringify({ id: fixture.id, checks: fixture.checks })}`);
  }

  for (const check of fixture.checks) {
    if (check !== '10' && check !== '11' && check !== '12') {
      throw new Error(`Invalid adjudication fixture check id: ${fixture.id}:${check}`);
    }
  }

  if (!fixture.packet?.packet?.issue || !fixture.packet.naming || !fixture.packet.idempotency) {
    throw new Error(`Invalid adjudication fixture packet shape: ${fixture.id}`);
  }
}

function detectSignatures(packet: CanonicalPacket): string[] {
  const signatures = new Set<string>();

  if (
    typeof packet.version.expectedVersion !== 'number' ||
    packet.version.expectedVersion <= 0 ||
    !validateIsoUtc(packet.version.expectedUpdatedAt)
  ) {
    signatures.add('TXN_GUARD_FIELDS_MISSING');
  }

  if (packet.version.isLatestSnapshot === false) {
    signatures.add('TXN_STALE_VERSION_CONFLICT');
  }

  if (packet.response?.status === 409) {
    const hasConflictShape =
      typeof packet.response.code === 'string' &&
      typeof packet.response.reason === 'string' &&
      typeof packet.response.currentVersion === 'number' &&
      validateIsoUtc(packet.response.currentUpdatedAt);

    if (!hasConflictShape) {
      signatures.add('TXN_CONFLICT_ENVELOPE_INCOMPLETE');
    }
  }

  if (!isSlugCase(packet.naming.artifactPrefix)) {
    signatures.add('TXN_EVIDENCE_FILENAME_DRIFT');
  }

  let regex: RegExp | null = null;
  try {
    regex = new RegExp(packet.naming.filePattern);
  } catch {
    signatures.add('TXN_EVIDENCE_FILENAME_DRIFT');
  }

  if (regex) {
    const hasDrift = packet.naming.artifactFileNames.some((name) => !regex!.test(name));
    if (hasDrift) {
      signatures.add('TXN_EVIDENCE_FILENAME_DRIFT');
    }
  }

  if (packet.packet.issue === 'ONE-124' && !packet.dependency?.one124ChecklistLink) {
    signatures.add('MX_08_QA_CHECKLIST_MISSING');
  }

  if ((packet.unresolvedBlockers ?? []).some((blocker) => !blocker.ownerRoute)) {
    signatures.add('AC1_OWNER_ROUTE_MISSING');
  }

  return Array.from(signatures);
}

export function runAdjudicationReplayVerifier(fixtures: ReplayFixture[]): AdjudicationReplaySummary {
  for (const fixture of fixtures) {
    validateFixtureShape(fixture);
  }

  const fixtureResults: FixtureResult[] = fixtures.map((fixture) => {
    const detected = detectSignatures(fixture.packet);
    const relevantDetected = detected.filter((key) => SIGNATURE_RULES[key] && fixture.checks.some((check) => SIGNATURE_RULES[key].checks.includes(check)));

    const expectedDetected = fixture.expectedSignatureKey === 'PASS_NO_SIGNATURE'
      ? relevantDetected.length === 0
      : relevantDetected.includes(fixture.expectedSignatureKey);

    const signatureKeys = expectedDetected ? relevantDetected : ['FIXTURE_EXPECTATION_MISMATCH'];
    const verdict: Verdict = signatureKeys.length === 0 ? 'PASS_FINAL' : 'FAIL';
    const firstSignature = signatureKeys[0] ?? null;

    const ownerRule = firstSignature ? SIGNATURE_RULES[firstSignature] : null;

    return {
      fixtureId: fixture.id,
      verdict,
      checks: fixture.checks,
      signatureKeys,
      firstOwner: ownerRule?.firstOwner ?? (firstSignature ? 'backend' : null),
      escalationOwner: ownerRule?.escalationOwner ?? (firstSignature ? 'cto' : null),
    };
  });

  const byCheck: Record<CheckId, string[]> = { '10': [], '11': [], '12': [] };

  for (const fixture of fixtureResults) {
    if (fixture.verdict === 'PASS_FINAL') {
      continue;
    }

    for (const check of fixture.checks) {
      byCheck[check].push(...fixture.signatureKeys);
    }
  }

  const checkResults: CheckResult[] = (['10', '11', '12'] as const).map((checkId) => {
    const failureSignatureKeys = Array.from(new Set(byCheck[checkId]));
    const verdict: Verdict = failureSignatureKeys.length === 0 ? 'PASS_FINAL' : 'FAIL';
    const signatureKey = failureSignatureKeys[0] ?? null;
    const ownerRule = signatureKey ? SIGNATURE_RULES[signatureKey] : null;

    return {
      checkId,
      verdict,
      signatureKey,
      failureSignatureKeys,
      firstOwner: ownerRule?.firstOwner ?? (signatureKey ? 'backend' : null),
      escalationOwner: ownerRule?.escalationOwner ?? (signatureKey ? 'cto' : null),
    };
  });

  const passed = fixtureResults.filter((row) => row.verdict === 'PASS_FINAL').length;
  const failed = fixtureResults.length - passed;

  return {
    generatedAt: new Date().toISOString(),
    checkResults,
    fixtureResults,
    totals: {
      fixtures: fixtureResults.length,
      passed,
      failed,
    },
  };
}

export async function writeAdjudicationReplaySummary(path: string, summary: AdjudicationReplaySummary) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}

export const DEFAULT_ADJUDICATION_REPLAY_FIXTURES: ReplayFixture[] = [
  {
    id: 'FX-01',
    type: 'pass',
    expectedSignatureKey: 'PASS_NO_SIGNATURE',
    checks: ['10', '11', '12'],
    packet: {
      packet: {
        issue: 'ONE-104',
        generatedAt: '2026-03-19T02:40:00Z',
        owner: 'frontend-engineer',
        correlationId: 'corr_104_20260319_001',
        sourceIssue: '/ONE/issues/ONE-104',
      },
      naming: {
        artifactPrefix: 'one104_pub_pass1',
        filePattern: '^one125_c(10|11|12)_[a-z0-9_]+_[0-9]{8}T[0-9]{6}Z\\.(json|md)$',
        artifactFileNames: [
          'one125_c10_snapshot_20260319T024000Z.json',
          'one125_c11_links_20260319T024001Z.md',
          'one125_c12_summary_20260319T024002Z.md',
        ],
      },
      version: {
        expectedVersion: 18,
        expectedUpdatedAt: '2026-03-19T02:35:10Z',
        isLatestSnapshot: true,
      },
      idempotency: { key: 'one104-pass1-v18' },
      unresolvedBlockers: [],
    },
  },
  {
    id: 'FX-02',
    type: 'pass',
    expectedSignatureKey: 'PASS_NO_SIGNATURE',
    checks: ['11', '12'],
    packet: {
      packet: {
        issue: 'ONE-124',
        generatedAt: '2026-03-19T02:44:00Z',
        owner: 'frontend-engineer',
        correlationId: 'corr_124_20260319_001',
        sourceIssue: '/ONE/issues/ONE-124',
      },
      naming: {
        artifactPrefix: 'one124_pub_pass1',
        filePattern: '^one124_(concordance|copy|qa)_v[0-9]+\\.(md|json)$',
        artifactFileNames: ['one124_concordance_v1.md', 'one124_copy_v1.md', 'one124_qa_v1.json'],
      },
      version: {
        expectedVersion: 9,
        expectedUpdatedAt: '2026-03-19T02:41:20Z',
        isLatestSnapshot: true,
      },
      idempotency: { key: 'one124-pass1-v9' },
      dependency: { one124ChecklistLink: '/ONE/issues/ONE-124#document-qa-capture-checklist' },
      unresolvedBlockers: [],
    },
  },
  {
    id: 'FX-03',
    type: 'pass',
    expectedSignatureKey: 'PASS_NO_SIGNATURE',
    checks: ['12'],
    packet: {
      packet: {
        issue: 'ONE-124',
        generatedAt: '2026-03-19T02:46:00Z',
        owner: 'qa',
        correlationId: 'corr_124_20260319_002',
        sourceIssue: '/ONE/issues/ONE-124',
      },
      naming: {
        artifactPrefix: 'one124_pub_pass2',
        filePattern: '^one124_(concordance|copy|qa)_v[0-9]+\\.(md|json)$',
        artifactFileNames: ['one124_concordance_v2.md', 'one124_copy_v2.md', 'one124_qa_v2.json'],
      },
      version: {
        expectedVersion: 10,
        expectedUpdatedAt: '2026-03-19T02:45:20Z',
        isLatestSnapshot: true,
      },
      idempotency: { key: 'one124-pass2-v10' },
      dependency: { one124ChecklistLink: '/ONE/issues/ONE-124#document-qa-capture-checklist' },
      unresolvedBlockers: [],
    },
  },
  {
    id: 'FX-04',
    type: 'pass',
    expectedSignatureKey: 'PASS_NO_SIGNATURE',
    checks: ['10'],
    packet: {
      packet: {
        issue: 'ONE-104',
        generatedAt: '2026-03-19T02:48:00Z',
        owner: 'backend-engineer',
        correlationId: 'corr_104_20260319_002',
        sourceIssue: '/ONE/issues/ONE-104',
      },
      naming: {
        artifactPrefix: 'one104_pub_pass2',
        filePattern: '^one125_c(10|11|12)_[a-z0-9_]+_[0-9]{8}T[0-9]{6}Z\\.(json|md)$',
        artifactFileNames: ['one125_c10_packet_20260319T024800Z.json'],
      },
      version: {
        expectedVersion: 19,
        expectedUpdatedAt: '2026-03-19T02:47:20Z',
        isLatestSnapshot: true,
      },
      idempotency: { key: 'one104-pass2-v19' },
      unresolvedBlockers: [],
    },
  },
  {
    id: 'FX-05',
    type: 'fail',
    expectedSignatureKey: 'TXN_GUARD_FIELDS_MISSING',
    checks: ['10'],
    packet: {
      packet: {
        issue: 'ONE-104',
        generatedAt: '2026-03-19T03:00:00Z',
        owner: 'frontend-engineer',
        correlationId: 'corr_104_20260319_003',
        sourceIssue: '/ONE/issues/ONE-104',
      },
      naming: {
        artifactPrefix: 'one104_pub_fail1',
        filePattern: '^one125_c10_[a-z0-9_]+_[0-9]{8}T[0-9]{6}Z\\.json$',
        artifactFileNames: ['one125_c10_packet_20260319T030000Z.json'],
      },
      version: {
        expectedVersion: 20,
      },
      idempotency: { key: 'one104-fail1-v20' },
      unresolvedBlockers: [],
    },
  },
  {
    id: 'FX-06',
    type: 'fail',
    expectedSignatureKey: 'TXN_STALE_VERSION_CONFLICT',
    checks: ['10'],
    packet: {
      packet: {
        issue: 'ONE-104',
        generatedAt: '2026-03-19T03:02:00Z',
        owner: 'frontend-engineer',
        correlationId: 'corr_104_20260319_004',
        sourceIssue: '/ONE/issues/ONE-104',
      },
      naming: {
        artifactPrefix: 'one104_pub_fail2',
        filePattern: '^one125_c10_[a-z0-9_]+_[0-9]{8}T[0-9]{6}Z\\.json$',
        artifactFileNames: ['one125_c10_packet_20260319T030200Z.json'],
      },
      version: {
        expectedVersion: 20,
        expectedUpdatedAt: '2026-03-19T02:59:00Z',
        isLatestSnapshot: false,
      },
      idempotency: { key: 'one104-fail2-v20' },
      unresolvedBlockers: [],
    },
  },
  {
    id: 'FX-07',
    type: 'fail',
    expectedSignatureKey: 'TXN_CONFLICT_ENVELOPE_INCOMPLETE',
    checks: ['10'],
    packet: {
      packet: {
        issue: 'ONE-104',
        generatedAt: '2026-03-19T03:04:00Z',
        owner: 'backend-engineer',
        correlationId: 'corr_104_20260319_005',
        sourceIssue: '/ONE/issues/ONE-104',
      },
      naming: {
        artifactPrefix: 'one104_pub_fail3',
        filePattern: '^one125_c10_[a-z0-9_]+_[0-9]{8}T[0-9]{6}Z\\.json$',
        artifactFileNames: ['one125_c10_packet_20260319T030400Z.json'],
      },
      version: {
        expectedVersion: 21,
        expectedUpdatedAt: '2026-03-19T03:03:10Z',
        isLatestSnapshot: true,
      },
      idempotency: { key: 'one104-fail3-v21' },
      response: {
        status: 409,
        code: 'SE_VERSION_CONFLICT',
      },
      unresolvedBlockers: [],
    },
  },
  {
    id: 'FX-08',
    type: 'fail',
    expectedSignatureKey: 'TXN_EVIDENCE_FILENAME_DRIFT',
    checks: ['11'],
    packet: {
      packet: {
        issue: 'ONE-124',
        generatedAt: '2026-03-19T03:06:00Z',
        owner: 'qa',
        correlationId: 'corr_124_20260319_003',
        sourceIssue: '/ONE/issues/ONE-124',
      },
      naming: {
        artifactPrefix: 'one124 pub fail',
        filePattern: '^one124_(concordance|copy|qa)_v[0-9]+\\.(md|json)$',
        artifactFileNames: ['one124-concordance-v1.md'],
      },
      version: {
        expectedVersion: 11,
        expectedUpdatedAt: '2026-03-19T03:05:30Z',
        isLatestSnapshot: true,
      },
      idempotency: { key: 'one124-fail1-v11' },
      dependency: { one124ChecklistLink: '/ONE/issues/ONE-124#document-qa-capture-checklist' },
      unresolvedBlockers: [],
    },
  },
  {
    id: 'FX-09',
    type: 'fail',
    expectedSignatureKey: 'MX_08_QA_CHECKLIST_MISSING',
    checks: ['11', '12'],
    packet: {
      packet: {
        issue: 'ONE-124',
        generatedAt: '2026-03-19T03:08:00Z',
        owner: 'frontend-engineer',
        correlationId: 'corr_124_20260319_004',
        sourceIssue: '/ONE/issues/ONE-124',
      },
      naming: {
        artifactPrefix: 'one124_pub_fail2',
        filePattern: '^one124_(concordance|copy|qa)_v[0-9]+\\.(md|json)$',
        artifactFileNames: ['one124_concordance_v3.md', 'one124_copy_v3.md', 'one124_qa_v3.json'],
      },
      version: {
        expectedVersion: 12,
        expectedUpdatedAt: '2026-03-19T03:07:20Z',
        isLatestSnapshot: true,
      },
      idempotency: { key: 'one124-fail2-v12' },
      unresolvedBlockers: [],
    },
  },
  {
    id: 'FX-10',
    type: 'fail',
    expectedSignatureKey: 'AC1_OWNER_ROUTE_MISSING',
    checks: ['12'],
    packet: {
      packet: {
        issue: 'ONE-124',
        generatedAt: '2026-03-19T03:10:00Z',
        owner: 'pm',
        correlationId: 'corr_124_20260319_005',
        sourceIssue: '/ONE/issues/ONE-124',
      },
      naming: {
        artifactPrefix: 'one124_pub_fail3',
        filePattern: '^one124_(concordance|copy|qa)_v[0-9]+\\.(md|json)$',
        artifactFileNames: ['one124_concordance_v4.md', 'one124_copy_v4.md', 'one124_qa_v4.json'],
      },
      version: {
        expectedVersion: 13,
        expectedUpdatedAt: '2026-03-19T03:09:30Z',
        isLatestSnapshot: true,
      },
      idempotency: { key: 'one124-fail3-v13' },
      dependency: { one124ChecklistLink: '/ONE/issues/ONE-124#document-qa-capture-checklist' },
      unresolvedBlockers: [
        {
          id: 'BLK-100',
        },
      ],
    },
  },
];
