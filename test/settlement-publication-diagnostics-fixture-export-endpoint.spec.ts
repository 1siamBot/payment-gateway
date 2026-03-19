import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement publication diagnostics fixture export endpoint', () => {
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

  it('sorts exported fixtures deterministically by laneWeight, severityWeight, issueIdentifier, bundleCode, and recordKey', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/publication-diagnostics-fixture-export')
      .set(authHeaders())
      .send({
        asOfIso: '2026-03-19T13:00:00Z',
        diagnostics: {
          laneDiagnostics: [
            {
              issueIdentifier: 'ONE-301',
              bundleCode: 'lane-z',
              laneWeight: 2,
              severityWeight: 3,
              fieldPath: 'z',
            },
            {
              issueIdentifier: 'ONE-300',
              bundleCode: 'lane-a',
              laneWeight: 1,
              severityWeight: 1,
              fieldPath: 'b',
            },
          ],
          dependencyGateDiagnostics: [
            {
              issueIdentifier: 'ONE-300',
              bundleCode: 'lane-a',
              laneWeight: 1,
              severityWeight: 2,
              dependencyIssueIdentifier: 'ONE-272',
              fieldPath: 'a',
              statusTo: 'resolved',
            },
          ],
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.fixtures.map((fixture: { id: string }) => fixture.id)).toEqual([
      'lane_diagnostic:ONE-300:lane-a:b',
      'dependency_gate_diagnostic:ONE-300:lane-a:a',
      'lane_diagnostic:ONE-301:lane-z:z',
    ]);
  });

  it('returns byte-stable payload and checksum for semantically identical inputs', async () => {
    const basePayload = {
      asOfIso: '2026-03-19T13:15:00Z',
      diagnostics: {
        laneDiagnostics: [
          {
            issueIdentifier: 'ONE-305',
            bundleCode: 'lane-main',
            laneWeight: 1,
            deltaSeverityWeight: 1,
            fieldPath: 'releaseBundleScore.scoreBand',
            deltaReasonCodes: ['score_band_downgrade'],
          },
        ],
        dependencyGateDiagnostics: [
          {
            issueIdentifier: 'ONE-305',
            bundleCode: 'lane-main',
            laneWeight: 1,
            statusTo: 'unresolved',
            dependencyIssueIdentifier: 'ONE-269',
            fieldPath: 'dependencyGates[0]',
            gateReasonCodes: ['dependency_open', 'artifact_gap'],
          },
        ],
      },
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-diagnostics-fixture-export')
        .set(authHeaders())
        .send(basePayload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-diagnostics-fixture-export')
        .set(authHeaders())
        .send({
          asOfIso: basePayload.asOfIso,
          diagnostics: {
            dependencyGateDiagnostics: [...basePayload.diagnostics.dependencyGateDiagnostics].reverse(),
            laneDiagnostics: [...basePayload.diagnostics.laneDiagnostics].reverse(),
          },
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.manifest.checksumSha256).toBe(second.body.manifest.checksumSha256);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });

  it('normalizes fixture validation diagnostics into required machine codes', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/publication-diagnostics-fixture-export')
      .set(authHeaders())
      .send({
        diagnostics: {
          dependencyGateDiagnostics: [
            {
              issueIdentifier: 'ONE-273',
              bundleCode: 'lane-main',
              statusTo: 'unresolved',
              unresolvedReason: 'Missing evidence, noncanonical links, and checksum mismatch',
              gateReasonCodes: ['artifact_gap', 'dependency_open', 'eta_drift', 'noncanonical_link'],
            },
          ],
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.fixtures).toHaveLength(1);
    expect(response.body.fixtures[0].validationDiagnostics).toEqual([
      'missing_evidence',
      'dependency_open',
      'link_noncanonical',
      'artifact_gap',
      'checksum_mismatch',
    ]);
  });
});
