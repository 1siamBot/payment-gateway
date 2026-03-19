import { Prisma, PrismaClient, SettlementExceptionStatus } from '@prisma/client';
import {
  SETTLEMENT_EXCEPTION_QA_FIXTURES,
  SETTLEMENT_EXCEPTION_QA_MERCHANT_ID,
  SETTLEMENT_EXCEPTION_QA_WINDOW_DATE,
  settlementExceptionActionIdempotencyScope,
} from '../src/settlements/exception-qa-fixtures';

const prisma = new PrismaClient();

async function ensureMerchant() {
  await prisma.merchant.upsert({
    where: { id: SETTLEMENT_EXCEPTION_QA_MERCHANT_ID },
    update: {
      name: 'Demo Merchant',
      webhookSecret: 'whsec_demo_merchant_secret',
      webhookUrl: 'https://example.com/webhooks/payments',
    },
    create: {
      id: SETTLEMENT_EXCEPTION_QA_MERCHANT_ID,
      name: 'Demo Merchant',
      webhookSecret: 'whsec_demo_merchant_secret',
      webhookUrl: 'https://example.com/webhooks/payments',
    },
  });
}

function createBaseAuditRows(fixture: (typeof SETTLEMENT_EXCEPTION_QA_FIXTURES)[number]) {
  const rows: Prisma.SettlementExceptionAuditCreateManyInput[] = [];

  const openedAt = new Date(`${SETTLEMENT_EXCEPTION_QA_WINDOW_DATE}T00:00:00.000Z`);
  rows.push({
    settlementExceptionId: fixture.id,
    fromStatus: null,
    toStatus: SettlementExceptionStatus.OPEN,
    reason: 'mismatch_detected',
    note: fixture.openedNote,
    actor: 'system',
    createdAt: openedAt,
  });

  if (fixture.status === SettlementExceptionStatus.INVESTIGATING) {
    rows.push({
      settlementExceptionId: fixture.id,
      fromStatus: SettlementExceptionStatus.OPEN,
      toStatus: SettlementExceptionStatus.INVESTIGATING,
      reason: fixture.latestOperatorReason ?? 'investigating',
      note: fixture.latestOperatorNote,
      actor: 'ops',
      createdAt: new Date(`${SETTLEMENT_EXCEPTION_QA_WINDOW_DATE}T00:05:00.000Z`),
    });
  }

  if (fixture.status === SettlementExceptionStatus.RESOLVED) {
    rows.push({
      settlementExceptionId: fixture.id,
      fromStatus: SettlementExceptionStatus.OPEN,
      toStatus: SettlementExceptionStatus.RESOLVED,
      reason: fixture.latestOperatorReason ?? 'resolved',
      note: fixture.latestOperatorNote,
      actor: fixture.resolutionActor ?? 'ops',
      createdAt: fixture.resolutionAt ? new Date(fixture.resolutionAt) : new Date(`${SETTLEMENT_EXCEPTION_QA_WINDOW_DATE}T00:10:00.000Z`),
    });
  }

  if (fixture.status === SettlementExceptionStatus.IGNORED) {
    rows.push({
      settlementExceptionId: fixture.id,
      fromStatus: SettlementExceptionStatus.OPEN,
      toStatus: SettlementExceptionStatus.IGNORED,
      reason: fixture.latestOperatorReason ?? 'ignored',
      note: fixture.latestOperatorNote,
      actor: fixture.resolutionActor ?? 'ops',
      createdAt: fixture.resolutionAt ? new Date(fixture.resolutionAt) : new Date(`${SETTLEMENT_EXCEPTION_QA_WINDOW_DATE}T00:20:00.000Z`),
    });
  }

  return rows;
}

async function resetFixtures() {
  const fixtureIds = SETTLEMENT_EXCEPTION_QA_FIXTURES.map((fixture) => fixture.id);
  const idempotencyScopes = fixtureIds.map((id) => settlementExceptionActionIdempotencyScope(id));

  await prisma.$transaction([
    prisma.settlementExceptionAudit.deleteMany({
      where: { settlementExceptionId: { in: fixtureIds } },
    }),
    prisma.idempotencyKey.deleteMany({
      where: { scope: { in: idempotencyScopes } },
    }),
    prisma.settlementException.deleteMany({
      where: { id: { in: fixtureIds } },
    }),
  ]);
}

async function seedFixtures() {
  const windowDate = new Date(`${SETTLEMENT_EXCEPTION_QA_WINDOW_DATE}T00:00:00.000Z`);

  for (const fixture of SETTLEMENT_EXCEPTION_QA_FIXTURES) {
    await prisma.settlementException.create({
      data: {
        id: fixture.id,
        merchantId: fixture.merchantId,
        providerName: fixture.providerName,
        windowDate,
        ledgerTotal: new Prisma.Decimal(fixture.ledgerTotal),
        providerTotal: new Prisma.Decimal(fixture.providerTotal),
        deltaAmount: new Prisma.Decimal(fixture.deltaAmount),
        fingerprint: `fixture:${fixture.scenario}`,
        status: fixture.status,
        openedReason: fixture.openedReason,
        openedNote: fixture.openedNote,
        latestOperatorReason: fixture.latestOperatorReason,
        latestOperatorNote: fixture.latestOperatorNote,
        resolutionActor: fixture.resolutionActor,
        resolutionAt: fixture.resolutionAt ? new Date(fixture.resolutionAt) : null,
        version: fixture.version,
      },
    });

    const audits = createBaseAuditRows(fixture);
    if (audits.length > 0) {
      await prisma.settlementExceptionAudit.createMany({ data: audits });
    }
  }
}

async function main() {
  await ensureMerchant();
  await resetFixtures();
  await seedFixtures();

  const statusCounts = SETTLEMENT_EXCEPTION_QA_FIXTURES.reduce<Record<string, number>>((acc, fixture) => {
    acc[fixture.status] = (acc[fixture.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log('Seeded deterministic settlement exception fixtures');
  console.log(`merchant=${SETTLEMENT_EXCEPTION_QA_MERCHANT_ID}`);
  console.log(`windowDate=${SETTLEMENT_EXCEPTION_QA_WINDOW_DATE}`);
  console.log(`fixtures=${SETTLEMENT_EXCEPTION_QA_FIXTURES.length}`);
  console.log(`statusCounts=${JSON.stringify(statusCounts)}`);
  console.log(`fixtureIds=${SETTLEMENT_EXCEPTION_QA_FIXTURES.map((fixture) => fixture.id).join(',')}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
