import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementExceptionActivityController } from '../src/settlements/settlement-exception-activity.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement exception activity endpoint', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.INTERNAL_API_TOKEN = 'internal-qa-token';

    const prismaMock = {
      apiKey: {
        findFirst: jest.fn(async () => null),
      },
      settlementException: {
        findUnique: jest.fn(async () => null),
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [SettlementExceptionActivityController],
      providers: [
        SettlementsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: APP_GUARD, useClass: AuthzGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function authHeaders() {
    return {
      'x-internal-token': 'internal-qa-token',
      'x-actor-role': 'ops',
    };
  }

  it('returns deterministic fixture timeline and supports page-2 cursor retrieval', async () => {
    const first = await request(app.getHttpServer())
      .get('/settlement-exceptions/se_fixture_normal/activity')
      .query({ mode: 'fixture', scenario: 'normal', limit: 2 })
      .set(authHeaders());

    expect(first.status).toBe(200);
    expect(first.body.contract).toBe('settlement-exception-activity-timeline.v1');
    expect(first.body.data).toHaveLength(2);
    expect(first.body.data.map((row: { eventType: string }) => row.eventType)).toEqual([
      'exception_mark_resolved',
      'exception_acknowledged',
    ]);
    expect(first.body.pageInfo.hasNext).toBe(true);
    expect(first.body.pageInfo.nextCursor).toBeTruthy();

    const second = await request(app.getHttpServer())
      .get('/settlement-exceptions/se_fixture_normal/activity')
      .query({
        mode: 'fixture',
        scenario: 'normal',
        limit: 2,
        cursor: first.body.pageInfo.nextCursor,
      })
      .set(authHeaders());

    expect(second.status).toBe(200);
    expect(second.body.data).toHaveLength(1);
    expect(second.body.data[0].eventType).toBe('exception_opened');
    expect(second.body.pageInfo.hasNext).toBe(false);
    expect(second.body.pageInfo.nextCursor).toBeNull();
  });

  it('returns empty fixture timeline', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlement-exceptions/se_fixture_empty/activity')
      .query({ mode: 'fixture', scenario: 'empty' })
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pageInfo.hasNext).toBe(false);
    expect(response.body.pageInfo.nextCursor).toBeNull();
  });

  it('returns 400 for invalid cursor payload', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlement-exceptions/se_fixture_invalid/activity')
      .query({ mode: 'fixture', scenario: 'normal', cursor: 'not-a-valid-cursor' })
      .set(authHeaders());

    expect(response.status).toBe(400);
    expect(response.body).toEqual(expect.objectContaining({
      code: 'SETTLEMENT_EXCEPTION_ACTIVITY_CURSOR_INVALID',
      reasonCode: 'INVALID_CURSOR',
    }));
  });

  it('returns 409 for stale cursor scenario', async () => {
    const cursor = Buffer.from(JSON.stringify({ version: 'v1', anchor: 'fx_missing' }), 'utf8').toString('base64url');

    const response = await request(app.getHttpServer())
      .get('/settlement-exceptions/se_fixture_stale/activity')
      .query({ mode: 'fixture', scenario: 'stale_cursor', cursor })
      .set(authHeaders());

    expect(response.status).toBe(409);
    expect(response.body).toEqual(expect.objectContaining({
      code: 'SETTLEMENT_EXCEPTION_ACTIVITY_CURSOR_STALE',
      reasonCode: 'STALE_CURSOR',
    }));
  });
});
