import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type CheckId = '10' | '11' | '12';
export type Verdict = 'PASS_FINAL' | 'FAIL';

type PrimitiveType = 'string' | 'number' | 'boolean';

type SchemaNode =
  | {
      kind: 'primitive';
      type: PrimitiveType;
      enumValues?: readonly string[];
      format?: 'iso_utc';
    }
  | {
      kind: 'array';
      element: SchemaNode;
    }
  | {
      kind: 'object';
      required: Record<string, SchemaNode>;
      optional?: Record<string, SchemaNode>;
    };

export type PayloadMismatch = {
  code: 'PAYLOAD_MISSING_REQUIRED_FIELD' | 'PAYLOAD_TYPE_MISMATCH' | 'PAYLOAD_EXTRA_FIELD' | 'PAYLOAD_INVALID_VALUE';
  path: string;
  checks: CheckId[];
  expected: string;
  actual: string;
};

export type PayloadDiffSummary = {
  generatedAt: string;
  inputPath: string;
  sources: {
    canonicalSchemaIssue: 'ONE-180';
    replayExpectationIssue: 'ONE-182';
  };
  verdict: Verdict;
  checkResults: Array<{
    checkId: CheckId;
    verdict: Verdict;
    mismatchCodes: string[];
  }>;
  mismatches: PayloadMismatch[];
  totals: {
    mismatches: number;
  };
};

const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const CANONICAL_PAYLOAD_SCHEMA: SchemaNode = {
  kind: 'object',
  required: {
    packet: {
      kind: 'object',
      required: {
        issue: {
          kind: 'primitive',
          type: 'string',
          enumValues: ['ONE-104', 'ONE-124'],
        },
        generatedAt: { kind: 'primitive', type: 'string', format: 'iso_utc' },
        owner: { kind: 'primitive', type: 'string' },
        correlationId: { kind: 'primitive', type: 'string' },
        sourceIssue: { kind: 'primitive', type: 'string' },
      },
    },
    naming: {
      kind: 'object',
      required: {
        artifactPrefix: { kind: 'primitive', type: 'string' },
        filePattern: { kind: 'primitive', type: 'string' },
        artifactFileNames: {
          kind: 'array',
          element: { kind: 'primitive', type: 'string' },
        },
      },
    },
    version: {
      kind: 'object',
      required: {
        expectedVersion: { kind: 'primitive', type: 'number' },
        expectedUpdatedAt: { kind: 'primitive', type: 'string', format: 'iso_utc' },
        isLatestSnapshot: { kind: 'primitive', type: 'boolean' },
      },
    },
    idempotency: {
      kind: 'object',
      required: {
        key: { kind: 'primitive', type: 'string' },
      },
    },
  },
  optional: {
    response: {
      kind: 'object',
      required: {
        status: { kind: 'primitive', type: 'number' },
        code: { kind: 'primitive', type: 'string' },
        reason: { kind: 'primitive', type: 'string' },
        currentVersion: { kind: 'primitive', type: 'number' },
        currentUpdatedAt: { kind: 'primitive', type: 'string', format: 'iso_utc' },
      },
    },
    dependency: {
      kind: 'object',
      required: {
        one124ChecklistLink: { kind: 'primitive', type: 'string' },
      },
    },
    unresolvedBlockers: {
      kind: 'array',
      element: {
        kind: 'object',
        required: {
          id: { kind: 'primitive', type: 'string' },
          ownerRoute: {
            kind: 'primitive',
            type: 'string',
            enumValues: ['frontend', 'backend', 'qa', 'pm', 'cto'],
          },
        },
      },
    },
  },
};

function valueType(value: unknown): string {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (value === null) {
    return 'null';
  }

  return typeof value;
}

function checksForPath(path: string): CheckId[] {
  if (
    path.startsWith('naming.') ||
    path === 'naming' ||
    path.startsWith('dependency.') ||
    path === 'dependency'
  ) {
    return path.startsWith('dependency.') || path === 'dependency' ? ['11', '12'] : ['11'];
  }

  if (path.startsWith('version.') || path === 'version' || path.startsWith('response.') || path === 'response') {
    return ['10'];
  }

  return ['12'];
}

function pushMismatch(
  mismatches: PayloadMismatch[],
  mismatch: Omit<PayloadMismatch, 'checks'> & { checks?: CheckId[] },
) {
  mismatches.push({
    ...mismatch,
    checks: mismatch.checks ?? checksForPath(mismatch.path),
  });
}

function diffPayload(
  schema: SchemaNode,
  payload: unknown,
  path: string,
  mismatches: PayloadMismatch[],
) {
  if (schema.kind === 'primitive') {
    const actualType = valueType(payload);
    if (actualType !== schema.type) {
      pushMismatch(mismatches, {
        code: 'PAYLOAD_TYPE_MISMATCH',
        path,
        expected: schema.type,
        actual: actualType,
      });
      return;
    }

    if (schema.format === 'iso_utc' && typeof payload === 'string' && !ISO_UTC_REGEX.test(payload)) {
      pushMismatch(mismatches, {
        code: 'PAYLOAD_INVALID_VALUE',
        path,
        expected: 'iso_utc_string',
        actual: payload,
      });
    }

    if (schema.enumValues && typeof payload === 'string' && !schema.enumValues.includes(payload)) {
      pushMismatch(mismatches, {
        code: 'PAYLOAD_INVALID_VALUE',
        path,
        expected: `one_of:${schema.enumValues.join(',')}`,
        actual: payload,
      });
    }
    return;
  }

  if (schema.kind === 'array') {
    if (!Array.isArray(payload)) {
      pushMismatch(mismatches, {
        code: 'PAYLOAD_TYPE_MISMATCH',
        path,
        expected: 'array',
        actual: valueType(payload),
      });
      return;
    }

    payload.forEach((row, index) => {
      diffPayload(schema.element, row, `${path}[${index}]`, mismatches);
    });
    return;
  }

  if (valueType(payload) !== 'object') {
    pushMismatch(mismatches, {
      code: 'PAYLOAD_TYPE_MISMATCH',
      path,
      expected: 'object',
      actual: valueType(payload),
    });
    return;
  }

  const value = payload as Record<string, unknown>;
  const requiredKeys = Object.keys(schema.required);
  const optionalKeys = Object.keys(schema.optional ?? {});
  const allowed = new Set([...requiredKeys, ...optionalKeys]);

  for (const key of requiredKeys) {
    const childPath = path ? `${path}.${key}` : key;
    if (!(key in value)) {
      pushMismatch(mismatches, {
        code: 'PAYLOAD_MISSING_REQUIRED_FIELD',
        path: childPath,
        expected: 'present',
        actual: 'missing',
      });
      continue;
    }

    diffPayload(schema.required[key], value[key], childPath, mismatches);
  }

  for (const key of optionalKeys) {
    if (!(key in value)) {
      continue;
    }

    const childPath = path ? `${path}.${key}` : key;
    diffPayload(schema.optional![key], value[key], childPath, mismatches);
  }

  for (const key of Object.keys(value).sort()) {
    if (allowed.has(key)) {
      continue;
    }

    const childPath = path ? `${path}.${key}` : key;
    pushMismatch(mismatches, {
      code: 'PAYLOAD_EXTRA_FIELD',
      path: childPath,
      expected: 'not_present',
      actual: valueType(value[key]),
    });
  }
}

export function runAdjudicationPayloadDiff(payload: unknown, inputPath: string): PayloadDiffSummary {
  const mismatches: PayloadMismatch[] = [];
  diffPayload(CANONICAL_PAYLOAD_SCHEMA, payload, '', mismatches);

  const typedPayload = payload as {
    packet?: { issue?: string };
    dependency?: { one124ChecklistLink?: unknown };
  };

  if (
    typedPayload?.packet?.issue === 'ONE-124' &&
    valueType(typedPayload?.dependency?.one124ChecklistLink) !== 'string'
  ) {
    const alreadyFlagged = mismatches.some((mismatch) => mismatch.path === 'dependency.one124ChecklistLink');
    if (!alreadyFlagged) {
      pushMismatch(mismatches, {
        code: 'PAYLOAD_MISSING_REQUIRED_FIELD',
        path: 'dependency.one124ChecklistLink',
        expected: 'present_string_for_one124',
        actual: 'missing_or_invalid',
        checks: ['11', '12'],
      });
    }
  }

  mismatches.sort((a, b) => (a.path === b.path ? a.code.localeCompare(b.code) : a.path.localeCompare(b.path)));

  const checkResults = (['10', '11', '12'] as const).map((checkId) => {
    const checkMismatches = mismatches.filter((mismatch) => mismatch.checks.includes(checkId));
    const mismatchCodes = Array.from(new Set(checkMismatches.map((mismatch) => mismatch.code)));
    const checkVerdict: Verdict = mismatchCodes.length === 0 ? 'PASS_FINAL' : 'FAIL';

    return {
      checkId,
      verdict: checkVerdict,
      mismatchCodes,
    };
  });

  const verdict: Verdict = mismatches.length === 0 ? 'PASS_FINAL' : 'FAIL';

  return {
    generatedAt: new Date().toISOString(),
    inputPath,
    sources: {
      canonicalSchemaIssue: 'ONE-180',
      replayExpectationIssue: 'ONE-182',
    },
    verdict,
    checkResults,
    mismatches,
    totals: {
      mismatches: mismatches.length,
    },
  };
}

export async function writeAdjudicationPayloadDiffSummary(path: string, summary: PayloadDiffSummary) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
}
