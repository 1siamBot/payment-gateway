import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Settlement evidence lineage endpoint', () => {
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

  it('returns deterministic evidence lineage contract payload', async () => {
    const payload = {
      rows: [
        {
          lineageDepth: 1,
          sourceType: 'commit',
          sourceIssueId: 'ONE-300',
          artifactPath: 'artifacts/300-b.md',
          laneState: 'in_progress',
          observedAt: '2026-03-19T02:00:00Z',
        },
        {
          lineageDepth: 0,
          sourceType: 'issue',
          sourceIssueId: 'ONE-300',
          artifactPath: 'artifacts/300-a.md',
          laneState: 'todo',
          observedAt: '2026-03-19T01:00:00Z',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/evidence-lineage')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/evidence-lineage')
        .set(authHeaders())
        .send({
          rows: [...payload.rows].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-evidence-lineage.v1');
    expect(first.body.rows.map((row: { rowCursor: string }) => row.rowCursor)).toEqual([
      '0|10|ONE-300|artifacts/300-a.md',
      '1|30|ONE-300|artifacts/300-b.md',
    ]);
    expect(first.body.cursor.cursorVersion).toBe('v1');
    expect(first.body.cursor.lineageHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });

  it('rejects invalid replay cursor contracts with deterministic reason codes', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/evidence-lineage')
      .set(authHeaders())
      .send({
        rows: [
          {
            lineageDepth: 0,
            sourceType: 'issue',
            sourceIssueId: 'ONE-100',
            artifactPath: 'artifacts/100.md',
            observedAt: '2026-03-19T01:00:00Z',
          },
        ],
        cursor: {
          cursorVersion: 'v2',
          windowStart: '2026-03-19T02:00:00Z',
          windowEnd: '2026-03-19T01:00:00Z',
          lineageHash: 'deadbeef',
          resumeAfter: '0|10|ONE-999|artifacts/999.md',
        },
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'SETTLEMENT_EVIDENCE_LINEAGE_VALIDATION_FAILED',
      message: 'evidence lineage validation failed',
      errors: [
        {
          field: 'cursor.cursorVersion',
          reasonCode: 'UNSUPPORTED_CURSOR_VERSION',
          message: 'cursorVersion must be v1',
        },
        {
          field: 'cursor.lineageHash',
          reasonCode: 'LINEAGE_HASH_MISMATCH',
          message: 'provided lineageHash does not match normalized lineage rows',
        },
        {
          field: 'cursor.resumeAfter',
          reasonCode: 'MISSING_RESUME_ANCHOR',
          message: 'resumeAfter anchor does not exist in normalized lineage rows',
        },
        {
          field: 'cursor.window',
          reasonCode: 'INVALID_CURSOR_WINDOW',
          message: 'windowStart must be less than or equal to windowEnd',
        },
      ],
    });
  });
});
