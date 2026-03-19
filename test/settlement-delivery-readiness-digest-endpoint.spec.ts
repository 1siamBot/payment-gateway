import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement delivery readiness digest endpoint', () => {
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

  it('returns deterministic digest rows, canonical links, and lane-switch recommendation', async () => {
    const payload = {
      currentLaneIssueIdentifier: 'ONE-260',
      lanes: [
        {
          issueIdentifier: 'ONE-261',
          priorityWeight: 2,
          stalledMinutes: 12,
          branch: 'feature/one-261',
          fullSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          prMode: 'pr_link',
          testCommand: 'npm test -- test/settlement-delivery-readiness-digest.spec.ts',
          artifactPath: 'artifacts/one-261/readiness.md',
          dependencyIssueIds: ['ONE-241'],
        },
        {
          issueIdentifier: 'ONE-260',
          priorityWeight: 1,
          stalledMinutes: 8,
          branch: 'feature/one-260',
          fullSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          prMode: 'no_pr_yet',
          testCommand: 'npm test -- test/settlement-delivery-readiness-digest.spec.ts',
          artifactPath: 'artifacts/one-260/readiness.md',
          dependencyIssueIds: ['/issues/ONE-258', '/ONE/issues/ONE-259'],
          blockerOwner: '',
          blockerEta: '',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/delivery-readiness-digest')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/delivery-readiness-digest')
        .set(authHeaders())
        .send({
          ...payload,
          lanes: [...payload.lanes].reverse(),
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-delivery-readiness-digest.v1');
    expect(first.body.rows.map((row: { issueIdentifier: string }) => row.issueIdentifier)).toEqual([
      'ONE-260',
      'ONE-261',
    ]);
    expect(first.body.rows[0].issueLink).toBe('/ONE/issues/ONE-260');
    expect(first.body.rows[0].dependencyIssueLinks).toEqual([
      '/ONE/issues/ONE-258',
      '/ONE/issues/ONE-259',
    ]);
    expect(first.body.recommendation).toEqual({
      mode: 'switch_lane',
      issueIdentifier: 'ONE-261',
      issueLink: '/ONE/issues/ONE-261',
      reason: 'current lane ONE-260 has prMode=no_pr_yet with unresolved blocker metadata',
    });
    expect(first.body.findings.map((finding: { code: string }) => finding.code)).toEqual([
      'MISSING_BLOCKER_OWNER',
      'MISSING_BLOCKER_ETA',
      'NON_CANONICAL_DEPENDENCY_ISSUE_LINK',
    ]);
    expect(first.body.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
