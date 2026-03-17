import { APP_GUARD } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import * as request from 'supertest';
import { MaintenanceService } from '../src/common/maintenance.service';
import { AuthzGuard } from '../src/common/authz.guard';
import { MaintenanceController } from '../src/maintenance/maintenance.controller';
import { PaymentsController } from '../src/payments/payments.controller';
import { PaymentsService } from '../src/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProviderRouterService } from '../src/providers/provider-router.service';

function createPrismaMock() {
  const idempotencyStore = new Map<string, { responseBody: string }>();
  const txStore = new Map<string, any>();
  let txCounter = 0;

  return {
    prisma: {
      apiKey: {
        findFirst: jest.fn(async ({ where }) => {
          const expectedHash = createHash('sha256').update('pk_test_authz_key').digest('hex');
          if (
            where.merchantId === 'merchant-auth'
            && where.keyHash === expectedHash
            && where.status === 'ACTIVE'
          ) {
            return { id: 'key-auth-1' };
          }
          return null;
        }),
      },
      merchant: {
        findUnique: jest.fn(async ({ where }) => {
          if (where.id === 'merchant-auth') {
            return { id: 'merchant-auth', name: 'Auth Merchant', webhookSecret: 'whsec_auth' };
          }
          return null;
        }),
      },
      customer: {
        upsert: jest.fn(async ({ create }) => ({ id: 'cus-auth-1', ...create })),
        create: jest.fn(async ({ data }) => ({ id: 'cus-auth-1', ...data })),
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => null),
      },
      idempotencyKey: {
        findUnique: jest.fn(async ({ where }) => idempotencyStore.get(`${where.scope_key.scope}:${where.scope_key.key}`) ?? null),
        create: jest.fn(async ({ data }) => {
          idempotencyStore.set(`${data.scope}:${data.key}`, { responseBody: data.responseBody });
          return data;
        }),
      },
      transaction: {
        create: jest.fn(async ({ data }) => {
          txCounter += 1;
          const tx = { id: `tx-${txCounter}`, createdAt: new Date(), updatedAt: new Date(), ...data };
          txStore.set(tx.id, tx);
          return tx;
        }),
        update: jest.fn(async ({ where, data }) => {
          const tx = txStore.get(where.id);
          const merged = { ...tx, ...data };
          txStore.set(where.id, merged);
          return merged;
        }),
        findUnique: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
      callbackEvent: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }) => data),
      },
      transactionAudit: {
        create: jest.fn(async ({ data }) => data),
      },
      auditLog: {
        create: jest.fn(async ({ data }) => data),
        findMany: jest.fn(async () => []),
      },
    },
  };
}

describe('Authz guard integration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.INTERNAL_API_TOKEN = 'internal-auth-token';
    process.env.CALLBACK_SIGNING_SECRET = 'authz-secret';

    const prismaMock = createPrismaMock();
    const router = {
      initiateWithFailover: jest.fn(async ({ reference }) => ({
        providerName: 'mock-a',
        externalRef: `A-${reference}`,
        decision: null,
        telemetry: [],
      })),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController, MaintenanceController],
      providers: [
        PaymentsService,
        MaintenanceService,
        { provide: PrismaService, useValue: prismaMock.prisma },
        { provide: ProviderRouterService, useValue: router },
        { provide: APP_GUARD, useClass: AuthzGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects unauthenticated access to protected payment endpoint', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments')
      .send({
        merchantId: 'merchant-auth',
        amount: 100,
        currency: 'USD',
        type: 'deposit',
        idempotencyKey: 'idem-auth-1',
      });

    expect(response.status).toBe(401);
  });

  it('allows merchant API key access with matching merchant scope', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments')
      .set('x-api-key', 'pk_test_authz_key')
      .set('x-merchant-id', 'merchant-auth')
      .send({
        merchantId: 'merchant-auth',
        amount: 100,
        currency: 'USD',
        type: 'deposit',
        idempotencyKey: 'idem-auth-2',
      });

    expect(response.status).toBe(201);
    expect(response.body.reference).toBeTruthy();
  });

  it('blocks merchant credentials from writing for another merchant', async () => {
    const response = await request(app.getHttpServer())
      .post('/payments')
      .set('x-api-key', 'pk_test_authz_key')
      .set('x-merchant-id', 'merchant-auth')
      .send({
        merchantId: 'merchant-other',
        amount: 100,
        currency: 'USD',
        type: 'deposit',
        idempotencyKey: 'idem-auth-3',
      });

    expect(response.status).toBe(403);
  });

  it('requires admin role for maintenance toggle', async () => {
    const opsAttempt = await request(app.getHttpServer())
      .patch('/maintenance')
      .set('x-internal-token', 'internal-auth-token')
      .set('x-actor-role', 'ops')
      .send({ enabled: true });
    expect(opsAttempt.status).toBe(403);

    const adminAttempt = await request(app.getHttpServer())
      .patch('/maintenance')
      .set('x-internal-token', 'internal-auth-token')
      .set('x-actor-role', 'admin')
      .send({ enabled: true });
    expect(adminAttempt.status).toBe(200);
    expect(adminAttempt.body.enabled).toBe(true);
  });
});
