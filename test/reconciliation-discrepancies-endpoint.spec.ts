import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';
import {
  RECONCILIATION_DISCREPANCY_FIXTURES,
  RECONCILIATION_DISCREPANCY_FIXTURE_TIMESTAMP,
} from '../src/settlements/reconciliation-discrepancy-fixtures';

describe('Reconciliation discrepancies endpoints', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.INTERNAL_API_TOKEN = 'internal-reconciliation-token';

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
      'x-internal-token': 'internal-reconciliation-token',
      'x-actor-role': 'ops',
    };
  }

  it('returns deterministic discrepancy listing contract', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlements/reconciliation/discrepancies')
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.contract).toBe('reconciliation-discrepancy.v1.list');
    expect(response.body.generatedAt).toBe(RECONCILIATION_DISCREPANCY_FIXTURE_TIMESTAMP);
    expect(response.body.total).toBe(RECONCILIATION_DISCREPANCY_FIXTURES.length);
    expect(response.body.data.map((row: { id: string }) => row.id)).toEqual([
      'recon_disc_duplicate_event_001',
      'recon_disc_matched_001',
      'recon_disc_mismatched_amount_001',
      'recon_disc_missing_capture_001',
    ]);
  });

  it('supports empty and path-specific list filtering', async () => {
    const emptyResponse = await request(app.getHttpServer())
      .get('/settlements/reconciliation/discrepancies')
      .query({ path: 'empty' })
      .set(authHeaders());

    expect(emptyResponse.status).toBe(200);
    expect(emptyResponse.body.total).toBe(0);
    expect(emptyResponse.body.data).toEqual([]);

    const missingCaptureResponse = await request(app.getHttpServer())
      .get('/settlements/reconciliation/discrepancies')
      .query({ path: 'missing-capture' })
      .set(authHeaders());

    expect(missingCaptureResponse.status).toBe(200);
    expect(missingCaptureResponse.body.total).toBe(1);
    expect(missingCaptureResponse.body.data[0]).toEqual(expect.objectContaining({
      id: 'recon_disc_missing_capture_001',
      state: 'missing_capture',
      captureReference: null,
    }));
  });

  it('returns discrepancy detail contract and not-found errors', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlements/reconciliation/discrepancies/recon_disc_duplicate_event_001')
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body.contract).toBe('reconciliation-discrepancy.v1.detail');
    expect(response.body.generatedAt).toBe(RECONCILIATION_DISCREPANCY_FIXTURE_TIMESTAMP);
    expect(response.body.discrepancy).toEqual(expect.objectContaining({
      id: 'recon_disc_duplicate_event_001',
      state: 'duplicate_event',
      duplicateEventCount: 2,
    }));
    expect(response.body.discrepancy.timeline).toHaveLength(4);

    const notFound = await request(app.getHttpServer())
      .get('/settlements/reconciliation/discrepancies/recon_disc_unknown')
      .set(authHeaders());

    expect(notFound.status).toBe(404);
    expect(notFound.body.message).toBe('Reconciliation discrepancy not found');
  });

  it('returns 400 for unsupported path filter values', async () => {
    const response = await request(app.getHttpServer())
      .get('/settlements/reconciliation/discrepancies')
      .query({ path: 'unsupported' })
      .set(authHeaders());

    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'path must be one of the following values: empty, matched, mismatched-amount, missing-capture, duplicate-event',
      ]),
    );
  });
});
