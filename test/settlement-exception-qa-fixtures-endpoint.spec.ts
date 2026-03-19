import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SettlementExceptionStatus } from '@prisma/client';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  SETTLEMENT_EXCEPTION_QA_FIXTURES,
  SETTLEMENT_EXCEPTION_QA_WINDOW_DATE,
} from '../src/settlements/exception-qa-fixtures';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement exception QA fixtures endpoint', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.INTERNAL_API_TOKEN = 'internal-qa-token';

    const prismaMock = {
      apiKey: {
        findFirst: jest.fn(async () => null),
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [SettlementsController],
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

  it('returns all deterministic fixtures when no filters are supplied', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlements/exceptions/qa-fixtures')
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(SETTLEMENT_EXCEPTION_QA_FIXTURES.length);
    expect(response.body.data).toHaveLength(SETTLEMENT_EXCEPTION_QA_FIXTURES.length);
    expect(response.body.data[0]).toEqual(expect.objectContaining({
      id: SETTLEMENT_EXCEPTION_QA_FIXTURES[0].id,
      scenario: SETTLEMENT_EXCEPTION_QA_FIXTURES[0].scenario,
      windowDate: SETTLEMENT_EXCEPTION_QA_WINDOW_DATE,
    }));
  });

  it('filters by scenario', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlements/exceptions/qa-fixtures')
      .query({ scenario: 'resolve_success' })
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('se_fx_resolve_success');
  });

  it('filters by status', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlements/exceptions/qa-fixtures')
      .query({ status: SettlementExceptionStatus.OPEN })
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(4);
    expect(response.body.data.every((row: { status: string }) => row.status === SettlementExceptionStatus.OPEN)).toBe(true);
  });

  it('filters by combined scenario and status', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlements/exceptions/qa-fixtures')
      .query({
        scenario: 'investigating_reference',
        status: SettlementExceptionStatus.INVESTIGATING,
      })
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        id: 'se_fx_investigating_reference',
        scenario: 'investigating_reference',
        status: SettlementExceptionStatus.INVESTIGATING,
      }),
    ]);
  });

  it('returns 400 when scenario filter is invalid', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlements/exceptions/qa-fixtures')
      .query({ scenario: 'not-a-valid-scenario' })
      .set(authHeaders());

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining(['scenario must be one of the following values: resolve_success, ignore_success, stale_version_conflict, action_failure_retry, investigating_reference, resolved_reference, ignored_reference']),
    );
  });
});
