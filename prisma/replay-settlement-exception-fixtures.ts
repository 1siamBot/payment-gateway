import { PrismaClient } from '@prisma/client';
import {
  SETTLEMENT_EXCEPTION_QA_MERCHANT_ID,
  SETTLEMENT_EXCEPTION_QA_PROVIDER_NAME,
  settlementExceptionActionIdempotencyScope,
  settlementExceptionActionRequestFingerprint,
} from '../src/settlements/exception-qa-fixtures';

type ExceptionListItem = {
  id: string;
  status: string;
  version: number;
  openedNote: string | null;
  updatedAt: string;
};

type ActionResponse = {
  ok: boolean;
  status: number;
  body: any;
};

const prisma = new PrismaClient();
const apiBaseUrl = process.env.SETTLEMENT_QA_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:3000';
const internalToken = process.env.INTERNAL_API_TOKEN;

function assertToken(): string {
  if (!internalToken) {
    throw new Error('INTERNAL_API_TOKEN is required for replay script');
  }
  return internalToken;
}

async function apiGet(path: string) {
  const token = assertToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'GET',
    headers: {
      'x-internal-token': token,
      'x-actor-role': 'ops',
    },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function apiAction(
  exceptionId: string,
  payload: {
    action: 'resolve' | 'ignore';
    reason: string;
    note: string | null;
    expectedVersion: number;
    expectedUpdatedAt?: string | null;
  },
  idempotencyKey?: string,
): Promise<ActionResponse> {
  const token = assertToken();
  const response = await fetch(`${apiBaseUrl}/settlements/exceptions/${exceptionId}/action`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
      'x-internal-token': token,
      'x-actor-role': 'ops',
    },
    body: JSON.stringify(payload),
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

function pickFixture(rows: ExceptionListItem[], scenario: string): ExceptionListItem {
  const target = rows.find((row) => row.openedNote === `fixture:${scenario}`);
  if (!target) {
    throw new Error(`Missing fixture for scenario=${scenario}`);
  }
  return target;
}

function assertOpen(row: ExceptionListItem, scenario: string) {
  if (row.status !== 'OPEN') {
    throw new Error(`Fixture ${scenario} is not OPEN; run npm run settlements:fixtures:seed first`);
  }
}

async function main() {
  const list = await apiGet(
    `/settlements/exceptions?merchantId=${SETTLEMENT_EXCEPTION_QA_MERCHANT_ID}&providerName=${SETTLEMENT_EXCEPTION_QA_PROVIDER_NAME}&take=100`,
  );

  const rows = (list.data ?? []) as ExceptionListItem[];

  const resolveSuccess = pickFixture(rows, 'resolve_success');
  const ignoreSuccess = pickFixture(rows, 'ignore_success');
  const staleConflict = pickFixture(rows, 'stale_version_conflict');
  const retryFixture = pickFixture(rows, 'action_failure_retry');

  assertOpen(resolveSuccess, 'resolve_success');
  assertOpen(ignoreSuccess, 'ignore_success');
  assertOpen(staleConflict, 'stale_version_conflict');
  assertOpen(retryFixture, 'action_failure_retry');

  const resolveResult = await apiAction(resolveSuccess.id, {
    action: 'resolve',
    reason: 'Fixture replay resolve success',
    note: null,
    expectedVersion: resolveSuccess.version,
    expectedUpdatedAt: resolveSuccess.updatedAt,
  });

  const ignoreResult = await apiAction(ignoreSuccess.id, {
    action: 'ignore',
    reason: 'Fixture replay ignore success',
    note: null,
    expectedVersion: ignoreSuccess.version,
    expectedUpdatedAt: ignoreSuccess.updatedAt,
  });

  const staleFirst = await apiAction(staleConflict.id, {
    action: 'resolve',
    reason: 'Fixture replay stale conflict first update',
    note: null,
    expectedVersion: staleConflict.version,
    expectedUpdatedAt: staleConflict.updatedAt,
  });

  const staleSecond = await apiAction(staleConflict.id, {
    action: 'ignore',
    reason: 'Fixture replay stale conflict second update',
    note: null,
    expectedVersion: staleConflict.version,
    expectedUpdatedAt: staleConflict.updatedAt,
  });

  const retryIdempotencyKey = 'fixture-retry-pending';
  const retryReason = 'Fixture replay retry after pending key release';
  const retryPayload = {
    action: 'resolve' as const,
    reason: retryReason,
    note: null,
    expectedVersion: retryFixture.version,
    expectedUpdatedAt: retryFixture.updatedAt,
  };

  await prisma.idempotencyKey.upsert({
    where: {
      scope_key: {
        scope: settlementExceptionActionIdempotencyScope(retryFixture.id),
        key: retryIdempotencyKey,
      },
    },
    update: {
      responseBody: JSON.stringify({
        status: 'pending',
        fingerprint: settlementExceptionActionRequestFingerprint({
          exceptionId: retryFixture.id,
          action: retryPayload.action,
          reason: retryPayload.reason,
          note: retryPayload.note,
          expectedVersion: retryPayload.expectedVersion,
          expectedUpdatedAt: retryPayload.expectedUpdatedAt ?? null,
        }),
      }),
    },
    create: {
      scope: settlementExceptionActionIdempotencyScope(retryFixture.id),
      key: retryIdempotencyKey,
      responseBody: JSON.stringify({
        status: 'pending',
        fingerprint: settlementExceptionActionRequestFingerprint({
          exceptionId: retryFixture.id,
          action: retryPayload.action,
          reason: retryPayload.reason,
          note: retryPayload.note,
          expectedVersion: retryPayload.expectedVersion,
          expectedUpdatedAt: retryPayload.expectedUpdatedAt ?? null,
        }),
      }),
    },
  });

  const retryFail = await apiAction(retryFixture.id, retryPayload, retryIdempotencyKey);

  await prisma.idempotencyKey.deleteMany({
    where: {
      scope: settlementExceptionActionIdempotencyScope(retryFixture.id),
      key: retryIdempotencyKey,
    },
  });

  const retrySuccess = await apiAction(retryFixture.id, retryPayload, retryIdempotencyKey);

  console.log('Settlement exception fixture replay results');
  console.log(`apiBaseUrl=${apiBaseUrl}`);
  console.log(`resolve_success=${resolveResult.status}:${resolveResult.ok ? 'ok' : 'failed'}`);
  console.log(`ignore_success=${ignoreResult.status}:${ignoreResult.ok ? 'ok' : 'failed'}`);
  console.log(`stale_conflict_first=${staleFirst.status}:${staleFirst.ok ? 'ok' : 'failed'}`);
  console.log(`stale_conflict_second=${staleSecond.status}:${staleSecond.ok ? 'ok' : 'failed'}`);
  console.log(`stale_conflict_reason=${staleSecond.body?.message?.reason ?? staleSecond.body?.reason ?? 'unknown'}`);
  console.log(`retry_failure=${retryFail.status}:${retryFail.ok ? 'ok' : 'failed'}`);
  console.log(`retry_failure_reason=${retryFail.body?.message?.reason ?? retryFail.body?.reason ?? 'unknown'}`);
  console.log(`retry_success=${retrySuccess.status}:${retrySuccess.ok ? 'ok' : 'failed'}`);

  if (!resolveResult.ok || !ignoreResult.ok || !staleFirst.ok || staleSecond.ok || retryFail.ok || !retrySuccess.ok) {
    throw new Error('Fixture replay validation failed; inspect output above');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
