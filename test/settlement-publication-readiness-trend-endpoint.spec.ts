import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import {
  SETTLEMENT_PUBLICATION_READINESS_GAP_CODES,
  SETTLEMENT_PUBLICATION_READINESS_STATES,
} from '../src/settlements/publication-readiness-trend';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Settlement publication readiness trend endpoint', () => {
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

  it('returns deterministic readiness trend rows and aggregate counters', async () => {
    const payload = {
      rows: [
        {
          issueId: 'ONE-400',
          windowStart: '2026-03-19T00:15:00Z',
          lanePriority: 2,
          branch: 'feat/four-hundred',
          fullSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          blockerPacketUrl: '/ONE/issues/ONE-251#comment-1',
          testSummary: '6 passed',
          artifactUrl: 'artifacts/one-400/evidence.md',
        },
        {
          issueId: 'ONE-300',
          windowStart: '2026-03-19T00:10:00Z',
          lanePriority: 1,
          branch: '',
          fullSha: '',
          prUrl: '',
          blockerPacketUrl: '',
          testSummary: '',
          artifactUrl: '',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-readiness-trend')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-readiness-trend')
        .set(authHeaders())
        .send({ rows: [...payload.rows].reverse() }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-publication-readiness-trend.v1');
    expect(first.body.rows.map((row: { issueId: string }) => row.issueId)).toEqual(['ONE-300', 'ONE-400']);
    expect(first.body.rows[0].readinessState).toBe('blocked_publish');
    expect(first.body.rows[0].gapCodes).toEqual([
      'MISSING_BRANCH',
      'MISSING_FULL_SHA',
      'MISSING_PR_OR_BLOCKER_PACKET',
      'MISSING_TEST_SUMMARY',
      'MISSING_ARTIFACT_LINK',
    ]);
    expect(first.body.counters.byGapCode).toEqual({
      MISSING_BRANCH: 1,
      MISSING_FULL_SHA: 1,
      MISSING_PR_OR_BLOCKER_PACKET: 1,
      MISSING_TEST_SUMMARY: 1,
      MISSING_ARTIFACT_LINK: 1,
    });
    expect(first.body.counters.byReadinessState).toEqual({
      ready: 1,
      blocked_publish: 1,
      missing_evidence: 0,
    });
    expect(Object.keys(first.body.counters.byGapCode)).toEqual([...SETTLEMENT_PUBLICATION_READINESS_GAP_CODES]);
    expect(Object.keys(first.body.counters.byReadinessState)).toEqual([
      ...SETTLEMENT_PUBLICATION_READINESS_STATES,
    ]);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });

  it('returns explicit zero counters for empty rows', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/publication-readiness-trend')
      .set(authHeaders())
      .send({ rows: [] });

    expect(response.status).toBe(201);
    expect(response.body.rows).toEqual([]);
    expect(response.body.counters.byGapCode).toEqual({
      MISSING_BRANCH: 0,
      MISSING_FULL_SHA: 0,
      MISSING_PR_OR_BLOCKER_PACKET: 0,
      MISSING_TEST_SUMMARY: 0,
      MISSING_ARTIFACT_LINK: 0,
    });
    expect(response.body.counters.byReadinessState).toEqual({
      ready: 0,
      blocked_publish: 0,
      missing_evidence: 0,
    });
    expect(response.body.metadata).toEqual({
      inputCount: 0,
      acceptedCount: 0,
      skippedCount: 0,
    });
  });
});
