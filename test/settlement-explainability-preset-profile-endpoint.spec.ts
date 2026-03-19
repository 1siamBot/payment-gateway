import { APP_GUARD } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthzGuard } from '../src/common/authz.guard';
import {
  BULK_SETTLEMENT_ROLLBACK_REASON_CODES,
  SETTLEMENT_EXPLAINABILITY_PROFILE_VALIDATION_REASON_CODES,
  SETTLEMENT_EXPLAINABILITY_SEVERITY_WINDOWS,
} from '../src/settlements/bulk-settlement-preview';
import { SettlementsController } from '../src/settlements/settlements.controller';
import { SettlementsService } from '../src/settlements/settlements.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Settlement explainability preset profile endpoint', () => {
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

  it('returns deterministic default explainability profile', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/explainability-preset-profile')
      .set(authHeaders())
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.contract).toBe('settlement-explainability-preset-profile.v1');
    expect(response.body.reasonBuckets.map((row: { code: string }) => row.code)).toEqual([
      ...BULK_SETTLEMENT_ROLLBACK_REASON_CODES,
    ]);
    expect(response.body.severityWindows.map((row: { code: string }) => row.code)).toEqual([
      ...SETTLEMENT_EXPLAINABILITY_SEVERITY_WINDOWS,
    ]);
    expect(response.body.defaultSelection.presetSlotKey).toBe('all_anomalies');
    expect(response.body.metadata.validationReasonCodes).toEqual([]);
  });

  it('normalizes mixed custom payloads and marks deterministic default slot', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/explainability-preset-profile')
      .set(authHeaders())
      .send({
        presetSlots: [
          {
            key: 'qa-shallow',
            label: 'QA shallow',
            reasonCodes: ['STALE_VERSION_RISK', 'MIXED_STATUS_SELECTION'],
            severityWindows: ['warning'],
          },
        ],
        defaultSelection: {
          presetSlotKey: 'qa-shallow',
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.presetSlots.map((slot: { key: string }) => slot.key)).toEqual([
      'all_anomalies',
      'critical_guardrails',
      'stale_and_mixed',
      'qa-shallow',
    ]);
    expect(response.body.defaultSelection.presetSlotKey).toBe('qa-shallow');
    expect(response.body.presetSlots.find((slot: { key: string }) => slot.key === 'qa-shallow')).toMatchObject({
      isDefault: true,
    });
  });

  it('emits machine-readable reason codes for malformed and partial profile payloads', async () => {
    const response = await request(app.getHttpServer())
      .post('/settlements/exceptions/explainability-preset-profile')
      .set(authHeaders())
      .send({
        presetSlots: [
          { key: '', reasonCodes: ['MALFORMED_ROW'], severityWindows: ['critical'] },
          { key: 'dup', reasonCodes: ['INVALID_REASON'], severityWindows: ['critical', 'invalid'] },
          { key: 'dup', reasonCodes: ['MIXED_STATUS_SELECTION'] },
        ],
        defaultSelection: {
          severityWindows: ['critical'],
        },
      });

    expect(response.status).toBe(201);
    expect(response.body.metadata.validationReasonCodes).toEqual([
      ...SETTLEMENT_EXPLAINABILITY_PROFILE_VALIDATION_REASON_CODES.filter((code: string) => (
        code !== 'BEP-001_INVALID_PRESET_SLOTS' && code !== 'BEP-006_INVALID_DEFAULT_SELECTION'
      )),
    ]);
  });

  it('is byte-stable across identical requests', async () => {
    const payload = {
      presetSlots: [
        {
          key: 'slot-z',
          label: 'Slot Z',
          reasonCodes: ['HIGH_DELTA_ANOMALY', 'MALFORMED_ROW'],
          severityWindows: ['critical'],
        },
      ],
      defaultSelection: {
        reasonCodes: ['MALFORMED_ROW'],
        severityWindows: ['critical'],
      },
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/settlements/exceptions/explainability-preset-profile')
        .set(authHeaders())
        .send(payload),
      request(app.getHttpServer())
        .post('/settlements/exceptions/explainability-preset-profile')
        .set(authHeaders())
        .send(payload),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(JSON.stringify(first.body)).toBe(JSON.stringify(second.body));
  });
});
