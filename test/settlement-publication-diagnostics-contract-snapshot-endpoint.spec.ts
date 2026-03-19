import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement publication diagnostics contract snapshot endpoint', () => {
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

  it('returns byte-stable snapshot payload/checksum for semantically identical inputs', async () => {
    const firstPayload = {
      asOfIso: '2026-03-19T14:00:00Z',
      diagnostics: {
        laneDiagnostics: [
          {
            issueIdentifier: 'ONE-273',
            bundleCode: 'lane-main',
            finalScore: 88,
            status: 'ready',
          },
        ],
        dependencyGateDiagnostics: [
          {
            issueIdentifier: 'ONE-274',
            dependencyIssueIdentifier: 'ONE-269',
            status: 'unresolved',
          },
        ],
      },
      expectedSchema: {
        schemaVersion: 'settlement-publication-diagnostics-contract-snapshot.v1',
        fields: [
          { fieldPath: 'laneDiagnostics[0].bundleCode', fieldType: 'string' },
          { fieldPath: 'laneDiagnostics[0].finalScore', fieldType: 'number' },
          { fieldPath: 'laneDiagnostics[0].issueIdentifier', fieldType: 'string' },
          { fieldPath: 'laneDiagnostics[0].status', fieldType: 'string' },
        ],
      },
    };

    const secondPayload = {
      asOfIso: firstPayload.asOfIso,
      diagnostics: {
        dependencyGateDiagnostics: [
          {
            status: 'unresolved',
            dependencyIssueIdentifier: 'ONE-269',
            issueIdentifier: 'ONE-274',
          },
        ],
        laneDiagnostics: [
          {
            status: 'ready',
            finalScore: 88,
            bundleCode: 'lane-main',
            issueIdentifier: 'ONE-273',
          },
        ],
      },
      expectedSchema: {
        fields: [...firstPayload.expectedSchema.fields],
        schemaVersion: firstPayload.expectedSchema.schemaVersion,
      },
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-diagnostics-contract-snapshot')
        .set(authHeaders())
        .send(firstPayload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-diagnostics-contract-snapshot')
        .set(authHeaders())
        .send(secondPayload),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.contract).toBe('settlement-publication-diagnostics-contract-snapshot.v1');
    expect(first.body.snapshot.snapshotSha256).toBe(second.body.snapshot.snapshotSha256);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });

  it('classifies drift severity as high when breaking changes are present', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/publication-diagnostics-contract-snapshot')
      .set(authHeaders())
      .send({
        diagnostics: {
          laneDiagnostics: [
            {
              issueIdentifier: 'ONE-273',
              releaseScore: '88',
            },
          ],
        },
        expectedSchema: {
          schemaVersion: 'settlement-publication-diagnostics-contract-snapshot.v1',
          fields: [
            { fieldPath: 'laneDiagnostics[0].releaseScore', fieldType: 'number' },
            { fieldPath: 'laneDiagnostics[0].missingField', fieldType: 'string' },
          ],
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.driftReport.driftSeverity).toBe('high');
    expect(response.body.driftReport.driftCodes).toEqual(['missing_field', 'type_changed']);
    expect(response.body.driftReport.breakingChangeCount).toBe(2);
    expect(response.body.driftReport.nonBreakingChangeCount).toBe(0);
  });

  it('normalizes drift codes into canonical order', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/publication-diagnostics-contract-snapshot')
      .set(authHeaders())
      .send({
        diagnostics: {
          laneDiagnostics: [
            {
              issueIdentifier: 'ONE-273',
              bundleCode: 'lane-main',
              status: 'closed',
            },
          ],
        },
        expectedSchema: {
          schemaVersion: 'settlement-publication-diagnostics-contract-snapshot.v1',
          snapshotSha256: 'deadbeef',
          fields: [
            { fieldPath: 'laneDiagnostics[0].issueIdentifier', fieldType: 'string' },
            { fieldPath: 'laneDiagnostics[0].bundleCode', fieldType: 'string' },
            { fieldPath: 'laneDiagnostics[0].status', fieldType: 'string', allowedValues: ['open'] },
          ],
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.driftReport.driftCodes).toEqual([
      'enum_contract_gap',
      'ordering_regression',
      'checksum_mismatch',
    ]);
  });
});
