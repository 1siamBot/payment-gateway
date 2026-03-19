import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement evidence anomaly scorecard endpoint', () => {
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

  it('returns deterministic anomaly classification and remediation scorecard payload', async () => {
    const payload = {
      asOfIso: '2026-03-19T10:00:00Z',
      staleAfterMinutes: 120,
      lanes: [
        {
          issueIdentifier: 'ONE-263',
          branch: 'feature/one-263',
          fullSha: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd',
          prMode: 'pr_link',
          testCommand: 'npm test -- test/settlement-evidence-anomaly-scorecard.spec.ts',
          artifactPath: 'artifacts/one-263/evidence.md',
          dependencyIssueLinks: ['/issues/ONE-241'],
          stalenessMinutes: 300,
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/evidence-anomaly-scorecard')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/evidence-anomaly-scorecard')
        .set(authHeaders())
        .send({
          ...payload,
          lanes: [
            {
              ...payload.lanes[0],
              dependencyIssueLinks: [...payload.lanes[0].dependencyIssueLinks].reverse(),
            },
          ],
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-evidence-anomaly-scorecard.v1');
    expect(first.body.scorecard[0].dependencyIssueLinks).toEqual(['/ONE/issues/ONE-241']);
    expect(first.body.anomalies.map((anomaly: { code: string }) => anomaly.code)).toEqual([
      'STALE_EVIDENCE',
      'NON_CANONICAL_INTERNAL_LINK',
    ]);
    expect(first.body.fingerprint).toBe(second.body.fingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
