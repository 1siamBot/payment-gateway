import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement publication window diagnostics endpoint', () => {
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

  it('returns deterministic lane and dependency-gate diagnostics for semantically identical inputs', async () => {
    const payload = {
      asOfIso: '2026-03-19T12:30:00Z',
      baselinePlan: {
        windows: [
          {
            issueIdentifier: 'ONE-273',
            bundleCode: 'lane-main',
            windowRank: 1,
            releaseBundleScore: { finalScore: 90, scoreBand: 'ready_now' },
            dependencyGates: [
              {
                issueIdentifier: 'ONE-269',
                status: 'resolved',
                documentKey: 'plan',
              },
            ],
          },
        ],
      },
      candidatePlan: {
        windows: [
          {
            issueIdentifier: 'ONE-273',
            bundleCode: 'lane-main',
            windowRank: 2,
            releaseBundleScore: { finalScore: 55, scoreBand: 'hold' },
            dependencyGates: [
              {
                issueIdentifier: 'ONE-269',
                status: 'unresolved',
                unresolvedReason: 'Missing evidence and ETA drift',
                issueLink: '/issues/ONE-269',
                documentLink: '/issues/ONE-269#document-plan',
              },
            ],
          },
        ],
      },
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-window-diagnostics')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-window-diagnostics')
        .set(authHeaders())
        .send({
          ...payload,
          baselinePlan: {
            windows: [...payload.baselinePlan.windows].reverse(),
          },
          candidatePlan: {
            windows: [...payload.candidatePlan.windows].reverse(),
          },
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-publication-window-diagnostics.v1');
    expect(first.body.laneDiagnostics[0]).toMatchObject({
      issueIdentifier: 'ONE-273',
      bundleCode: 'lane-main',
      scoreBandFrom: 'ready_now',
      scoreBandTo: 'hold',
    });
    expect(first.body.dependencyGateDiagnostics[0]).toMatchObject({
      dependencyIssueIdentifier: 'ONE-269',
      issueLink: '/ONE/issues/ONE-269',
      gateReasonCodes: expect.arrayContaining(['missing_evidence', 'eta_drift', 'dependency_open', 'link_noncanonical']),
    });
    expect(first.body.fingerprint).toBe(second.body.fingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
