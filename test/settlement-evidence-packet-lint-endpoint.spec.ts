import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement evidence packet lint endpoint', () => {
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

  it('returns deterministic lint payload with canonical dependency links', async () => {
    const payload = {
      packets: [
        {
          issueIdentifier: 'ONE-258',
          path: 'artifacts/one-258/evidence.md',
          branch: 'feature/one-258',
          fullSha: '1234567890abcdef1234567890abcdef12345678',
          prMode: 'no_pr_yet',
          testCommand: 'npm run test -- settlement-evidence-packet-lint.spec.ts',
          artifactPath: 'artifacts/one-258/evidence.md',
          dependencyIssueLinks: ['ONE-257', '/ONE/issues/ONE-256', '/issues/ONE-241'],
          blockerOwner: 'GitHub Admin / DevOps',
          blockerEta: '2026-03-21T12:30:00Z',
        },
      ],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/evidence-packet-lint')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/evidence-packet-lint')
        .set(authHeaders())
        .send({
          packets: [
            {
              ...payload.packets[0],
              dependencyIssueLinks: [...payload.packets[0].dependencyIssueLinks].reverse(),
            },
          ],
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-evidence-packet-lint.v1');
    expect(first.body.normalizedPackets[0].dependencyIssueLinks).toEqual([
      '/ONE/issues/ONE-241',
      '/ONE/issues/ONE-256',
      '/ONE/issues/ONE-257',
    ]);
    expect(first.body.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(first.body.fingerprint).toBe(second.body.fingerprint);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
