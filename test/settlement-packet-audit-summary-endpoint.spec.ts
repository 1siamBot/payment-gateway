import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Settlement packet audit summary endpoint', () => {
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

  it('returns deterministic packet audit summary contract with fingerprint', async () => {
    const payload = {
      evidenceRows: [
        { id: 'ev-b', lanePriority: 2, updatedAt: '2026-03-19T01:00:00Z' },
        { id: 'ev-a', lanePriority: 1, updatedAt: '2026-03-19T00:00:00Z' },
      ],
      blockerMetadata: {
        blockerOwner: 'ops-oncall',
        blockerEta: '2026-03-20T10:00:00Z',
        retryAt: '2026-03-19T12:00:00Z',
        dependencyIssueIds: ['ONE-248', 'ONE-241'],
        publishState: 'publish_in_progress',
      },
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/packet-audit-summary')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/packet-audit-summary')
        .set(authHeaders())
        .send({
          ...payload,
          evidenceRows: [...payload.evidenceRows].reverse(),
          blockerMetadata: {
            ...payload.blockerMetadata,
            dependencyIssueIds: [...payload.blockerMetadata.dependencyIssueIds].reverse(),
          },
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-packet-audit-summary.v1');
    expect(first.body.evidenceRows.map((row: { id: string }) => row.id)).toEqual(['ev-a', 'ev-b']);
    expect(first.body.blockerMetadata).toEqual({
      blockerOwner: 'ops-oncall',
      blockerEta: '2026-03-20T10:00:00.000Z',
      retryAt: '2026-03-19T12:00:00.000Z',
      dependencyIssueIds: ['ONE-241', 'ONE-248'],
      publishState: 'publish_in_progress',
    });
    expect(first.body.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.fingerprint).toBe(second.body.fingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });

  it('rejects missing or invalid blocker metadata with deterministic error shape', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/packet-audit-summary')
      .set(authHeaders())
      .send({
        evidenceRows: [
          { id: 'ev-a', lanePriority: 1, updatedAt: '2026-03-19T00:00:00Z' },
        ],
        blockerMetadata: {
          blockerOwner: ' ',
          blockerEta: 'bad-date',
          dependencyIssueIds: ['ONE-241', ''],
          publishState: 'unknown',
        },
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'SETTLEMENT_PACKET_AUDIT_VALIDATION_FAILED',
      message: 'packet audit summary validation failed',
      errors: [
        {
          field: 'blockerMetadata.blockerEta',
          reason: 'invalid_value',
          message: 'must be an ISO-8601 datetime string when provided',
        },
        {
          field: 'blockerMetadata.blockerOwner',
          reason: 'required',
          message: 'blockerOwner must be a non-empty string',
        },
        {
          field: 'blockerMetadata.dependencyIssueIds[1]',
          reason: 'invalid_value',
          message: 'dependency issue id must be a non-empty string',
        },
        {
          field: 'blockerMetadata.publishState',
          reason: 'invalid_value',
          message: 'publishState must be one of: publish_blocked, publish_ready, publish_in_progress',
        },
      ],
    });
  });
});
