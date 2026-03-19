import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';

describe('Settlement publication diagnostics delta bundle endpoint', () => {
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

  it('sorts delta bundle entries deterministically by severity/shift/issue/bundle/field', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/publication-diagnostics-delta-bundle')
      .set(authHeaders())
      .send({
        asOfIso: '2026-03-19T16:00:00Z',
        baselineDigest: {
          entries: [
            {
              issueIdentifier: 'ONE-400',
              bundleCode: 'lane-b',
              fieldPath: 'release.scoreBand',
              deltaSeverityWeight: 3,
              scoreBandShiftWeight: 2,
              value: 'amber',
            },
          ],
        },
        candidateDigest: {
          entries: [
            {
              issueIdentifier: 'ONE-399',
              bundleCode: 'lane-a',
              fieldPath: 'release.scoreBand',
              deltaSeverityWeight: 1,
              scoreBandShiftWeight: 1,
              value: 'green',
            },
            {
              issueIdentifier: 'ONE-400',
              bundleCode: 'lane-b',
              fieldPath: 'release.scoreBand',
              deltaSeverityWeight: 3,
              scoreBandShiftWeight: 2,
              value: 'red',
            },
          ],
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.deltaBundle.entries.map((entry: { issueIdentifier: string; bundleCode: string }) => (
      `${entry.issueIdentifier}:${entry.bundleCode}`
    ))).toEqual([
      'ONE-399:lane-a',
      'ONE-400:lane-b',
    ]);
    expect(response.body.deltaBundle.orderingKeySpec).toEqual([
      'deltaSeverityWeight',
      'scoreBandShiftWeight',
      'issueIdentifier',
      'bundleCode',
      'fieldPath',
    ]);
  });

  it('normalizes validator reason codes into canonical contract set and order', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/publication-diagnostics-delta-bundle')
      .set(authHeaders())
      .send({
        baselineDigest: {
          entries: [
            {
              issueIdentifier: 'ONE-410',
              bundleCode: 'lane-main',
              fieldPath: 'laneDiagnostics[0].status',
              deltaSeverityWeight: 2,
              scoreBandShiftWeight: 1,
              value: 'open',
              validatorReasonCodes: ['enum_contract_gap', 'hash_mismatch'],
            },
          ],
          checksumSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
        candidateDigest: {
          entries: [
            {
              issueIdentifier: 'ONE-410',
              bundleCode: 'lane-main',
              fieldPath: 'laneDiagnostics[0].status',
              deltaSeverityWeight: 2,
              scoreBandShiftWeight: 1,
              value: 5,
              validatorReasonCodes: ['required_field_missing'],
            },
          ],
          checksumSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.contractValidation.validatorReasonCodes).toEqual([
      'missing_required_field',
      'enum_drift',
      'type_mismatch',
      'checksum_mismatch',
    ]);
    expect(response.body.contractValidation.enumDriftCodes).toEqual(['enum_drift']);
    expect(response.body.contractValidation.isContractSafe).toBe(false);
  });

  it('returns byte-stable bundle payload and checksum for semantically identical inputs', async () => {
    const payload = {
      asOfIso: '2026-03-19T16:20:00Z',
      baselineDigest: {
        entries: [
          {
            issueIdentifier: 'ONE-420',
            bundleCode: 'lane-main',
            fieldPath: 'releaseBundleScore.scoreBand',
            deltaSeverityWeight: 1,
            scoreBandShiftWeight: 1,
            value: 'amber',
          },
          {
            issueIdentifier: 'ONE-421',
            bundleCode: 'lane-main',
            fieldPath: 'releaseBundleScore.scoreBand',
            deltaSeverityWeight: 2,
            scoreBandShiftWeight: 2,
            value: 'red',
          },
        ],
      },
      candidateDigest: {
        entries: [
          {
            issueIdentifier: 'ONE-420',
            bundleCode: 'lane-main',
            fieldPath: 'releaseBundleScore.scoreBand',
            deltaSeverityWeight: 1,
            scoreBandShiftWeight: 1,
            value: 'green',
          },
          {
            issueIdentifier: 'ONE-421',
            bundleCode: 'lane-main',
            fieldPath: 'releaseBundleScore.scoreBand',
            deltaSeverityWeight: 2,
            scoreBandShiftWeight: 2,
            value: 'amber',
          },
        ],
      },
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-diagnostics-delta-bundle')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/publication-diagnostics-delta-bundle')
        .set(authHeaders())
        .send({
          asOfIso: payload.asOfIso,
          baselineDigest: {
            entries: [...payload.baselineDigest.entries].reverse(),
          },
          candidateDigest: {
            entries: [...payload.candidateDigest.entries].reverse(),
          },
        }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.deltaBundle.checksumSha256).toBe(second.body.deltaBundle.checksumSha256);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
