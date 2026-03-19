import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import {
  SETTLEMENT_PUBLICATION_WINDOW_SCORE_BANDS,
} from '../src/settlements/publication-window-plan';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement publication window plan endpoint', () => {
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

  it('returns deterministic publication windows and canonical dependency links', async () => {
    const payload = {
      asOfIso: '2026-03-19T11:30:00Z',
      manifest: {
        entries: [
          {
            issueIdentifier: 'ONE-271',
            bundleCode: 'lane-b',
            windowPriorityWeight: 2,
            blockerRisk: 20,
            etaDriftMinutes: 25,
            dependencyGates: [
              {
                issueIdentifier: 'ONE-269',
                status: 'unresolved',
                unresolvedReason: 'waiting for QA preflight',
                documentKey: 'plan',
                commentId: 7,
              },
            ],
            evidence: {
              completeness: {
                branch: true,
                fullSha: true,
                prMode: true,
                testCommand: true,
                artifactPath: true,
              },
            },
          },
          {
            issueIdentifier: 'ONE-268',
            bundleCode: 'lane-a',
            windowPriorityWeight: 1,
            blockerRisk: 10,
            etaDriftMinutes: 5,
            dependencyGates: [],
            evidence: {
              completeness: {
                branch: true,
                fullSha: true,
                prMode: true,
                testCommand: true,
                artifactPath: true,
              },
            },
          },
        ],
      },
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-window-plan')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-window-plan')
        .set(authHeaders())
        .send({
          ...payload,
          manifest: {
            entries: [...payload.manifest.entries].reverse(),
          },
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-publication-window-plan.v1');
    expect(first.body.windows.map((window: { issueIdentifier: string }) => window.issueIdentifier)).toEqual([
      'ONE-268',
      'ONE-271',
    ]);
    expect(first.body.windows[1].dependencyGates[0]).toEqual({
      issueIdentifier: 'ONE-269',
      status: 'unresolved',
      unresolvedReason: 'waiting for QA preflight',
      issueLink: '/ONE/issues/ONE-269',
      documentLink: '/ONE/issues/ONE-269#document-plan',
      commentLink: '/ONE/issues/ONE-269#comment-7',
    });
    expect(Object.keys(first.body.metadata.byScoreBand)).toEqual([
      ...SETTLEMENT_PUBLICATION_WINDOW_SCORE_BANDS,
    ]);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
