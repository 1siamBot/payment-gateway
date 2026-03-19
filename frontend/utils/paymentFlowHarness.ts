export type HarnessScenario = 'success' | 'validation_error' | 'timeout_retry' | 'malformed_payload';

export type ScenarioOption = {
  value: HarnessScenario;
  label: string;
  summary: string;
};

export type JourneyStatus = 'healthy' | 'warning' | 'critical';

export type JourneySummary = {
  key: 'merchant_setup' | 'intent_creation' | 'status_tracking';
  title: string;
  state: JourneyStatus;
  message: string;
};

export type MerchantFixture = {
  id: string;
  name: string;
  webhookUrl: string;
  apiKeyPreview: string;
  checkItems: Array<{ label: string; status: 'ok' | 'warning' | 'error'; detail: string }>;
};

export type IntentFixture = {
  reference: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  responsePreview: Record<string, unknown>;
  diagnostics: Array<{ code: string; message: string }>;
};

export type StatusFixtureRow = {
  id: string;
  occurredAt: string;
  stage: string;
  status: 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'RETRYING';
  provider: string;
  note: string;
};

export type StatusFixture = {
  reference: string;
  rows: StatusFixtureRow[];
};

type ScenarioFixture = {
  option: ScenarioOption;
  merchant: MerchantFixture;
  intent: IntentFixture;
  status: StatusFixture;
};

type TimestampedRow = StatusFixtureRow & { __index: number; __timestamp: number };

export const SCENARIO_OPTIONS: ScenarioOption[] = [
  {
    value: 'success',
    label: 'Success',
    summary: 'All three journeys pass with stable fixture payloads.',
  },
  {
    value: 'validation_error',
    label: 'Validation Error',
    summary: 'Inline field failures are shown with deterministic remediation hints.',
  },
  {
    value: 'timeout_retry',
    label: 'Timeout + Retry',
    summary: 'Provider timeout transitions into retry and eventual completion.',
  },
  {
    value: 'malformed_payload',
    label: 'Malformed Payload',
    summary: 'Broken payload shape is isolated with fallback messaging.',
  },
];

const SCENARIO_PACKS: Record<HarnessScenario, ScenarioFixture> = {
  success: {
    option: SCENARIO_OPTIONS[0],
    merchant: {
      id: 'merchant_fit_001',
      name: 'Fitline Active Co.',
      webhookUrl: 'https://fixtures.example/success/webhook',
      apiKeyPreview: 'pk_live_success_8f4d',
      checkItems: [
        { label: 'Merchant profile persisted', status: 'ok', detail: 'Canonical merchant record stored.' },
        { label: 'Webhook handshake', status: 'ok', detail: '200 response received from fixture webhook endpoint.' },
        { label: 'API key scope', status: 'ok', detail: 'Read/write payment scope verified.' },
      ],
    },
    intent: {
      reference: 'pay_success_1001',
      idempotencyKey: 'intent_success_1001',
      payload: {
        merchantId: 'merchant_fit_001',
        amount: 1299.5,
        currency: 'THB',
        type: 'deposit',
      },
      responsePreview: {
        status: 'CREATED',
        providerName: 'mock-a',
      },
      diagnostics: [],
    },
    status: {
      reference: 'pay_success_1001',
      rows: [
        { id: 's1', occurredAt: '2026-03-18T08:00:00.000Z', stage: 'Intent created', status: 'CREATED', provider: 'gateway', note: 'Intent accepted.' },
        { id: 's2', occurredAt: '2026-03-18T08:00:05.000Z', stage: 'Authorization', status: 'PENDING', provider: 'mock-a', note: 'Awaiting issuer response.' },
        { id: 's3', occurredAt: '2026-03-18T08:00:09.000Z', stage: 'Capture', status: 'PAID', provider: 'mock-a', note: 'Capture completed.' },
      ],
    },
  },
  validation_error: {
    option: SCENARIO_OPTIONS[1],
    merchant: {
      id: 'merchant_missing_webhook',
      name: '',
      webhookUrl: '',
      apiKeyPreview: 'pk_live_validation_f3b2',
      checkItems: [
        { label: 'Merchant profile persisted', status: 'error', detail: 'Merchant name is required.' },
        { label: 'Webhook handshake', status: 'error', detail: 'Webhook URL must be https.' },
        { label: 'API key scope', status: 'ok', detail: 'Scope can be provisioned after profile correction.' },
      ],
    },
    intent: {
      reference: 'pay_invalid_1002',
      idempotencyKey: '',
      payload: {
        merchantId: '',
        amount: 0,
        currency: 'th',
        type: 'deposit',
      },
      responsePreview: {
        status: 'FAILED',
        code: 'VALIDATION_ERROR',
      },
      diagnostics: [
        { code: 'merchantId.required', message: 'Merchant ID is required.' },
        { code: 'idempotencyKey.required', message: 'Idempotency key is required.' },
      ],
    },
    status: {
      reference: 'pay_invalid_1002',
      rows: [
        { id: 'v1', occurredAt: '2026-03-18T09:10:00.000Z', stage: 'Intent validation', status: 'FAILED', provider: 'gateway', note: 'Invalid payload rejected before provider dispatch.' },
      ],
    },
  },
  timeout_retry: {
    option: SCENARIO_OPTIONS[2],
    merchant: {
      id: 'merchant_retry_003',
      name: 'Retry Mart',
      webhookUrl: 'https://fixtures.example/retry/webhook',
      apiKeyPreview: 'pk_live_retry_a21d',
      checkItems: [
        { label: 'Merchant profile persisted', status: 'ok', detail: 'Profile loaded from fixture cache.' },
        { label: 'Webhook handshake', status: 'warning', detail: 'First attempt timed out; retry succeeded.' },
        { label: 'API key scope', status: 'ok', detail: 'Scope verified after retry.' },
      ],
    },
    intent: {
      reference: 'pay_retry_1003',
      idempotencyKey: 'intent_retry_1003',
      payload: {
        merchantId: 'merchant_retry_003',
        amount: 2500,
        currency: 'THB',
        type: 'withdraw',
      },
      responsePreview: {
        status: 'PENDING',
        providerName: 'mock-b',
      },
      diagnostics: [
        { code: 'provider.timeout', message: 'Initial capture timeout, automatic retry started.' },
      ],
    },
    status: {
      reference: 'pay_retry_1003',
      rows: [
        { id: 't3', occurredAt: '2026-03-18T09:11:20.000Z', stage: 'Capture retry', status: 'RETRYING', provider: 'mock-b', note: 'Retry worker dispatched request.' },
        { id: 't1', occurredAt: '2026-03-18T09:10:00.000Z', stage: 'Intent created', status: 'CREATED', provider: 'gateway', note: 'Intent accepted with idempotency key.' },
        { id: 't4', occurredAt: '2026-03-18T09:11:36.000Z', stage: 'Capture confirmed', status: 'PAID', provider: 'mock-b', note: 'Retry path completed successfully.' },
        { id: 't2', occurredAt: '2026-03-18T09:10:51.000Z', stage: 'Capture timeout', status: 'FAILED', provider: 'mock-b', note: 'Gateway marked transient timeout.' },
      ],
    },
  },
  malformed_payload: {
    option: SCENARIO_OPTIONS[3],
    merchant: {
      id: 'merchant_malformed_004',
      name: 'Malformed Co.',
      webhookUrl: 'http://fixtures.example/insecure',
      apiKeyPreview: 'pk_live_malformed_c94f',
      checkItems: [
        { label: 'Merchant profile persisted', status: 'warning', detail: 'Optional fields are not normalized.' },
        { label: 'Webhook handshake', status: 'error', detail: 'Webhook URL uses insecure protocol.' },
        { label: 'API key scope', status: 'warning', detail: 'Scope payload omitted read_settlements permission.' },
      ],
    },
    intent: {
      reference: 'pay_malformed_1004',
      idempotencyKey: 'intent_malformed_1004',
      payload: {
        merchantId: 'merchant_malformed_004',
        amount: '12.0O',
        currency: 'THB',
        type: 'deposit',
      },
      responsePreview: {
        status: 'FAILED',
        code: 'MALFORMED_PAYLOAD',
      },
      diagnostics: [
        { code: 'amount.invalid_number', message: 'Amount must be numeric.' },
        { code: 'customer.shape', message: 'Customer payload must be an object when provided.' },
      ],
    },
    status: {
      reference: 'pay_malformed_1004',
      rows: [
        { id: 'm1', occurredAt: '2026-03-18T11:00:02.000Z', stage: 'Intent parsed', status: 'CREATED', provider: 'gateway', note: 'Gateway accepted raw payload.' },
        { id: 'm2', occurredAt: 'invalid-date-value', stage: 'Provider dispatch', status: 'FAILED', provider: 'mock-a', note: 'Malformed timestamp should be ignored from ordering sort.' },
        { id: 'm3', occurredAt: '', stage: 'Recovery fallback', status: 'RETRYING', provider: 'gateway', note: 'Missing timestamp row should be counted as malformed.' },
      ],
    },
  },
};

export function parseHarnessScenario(value: string | null | undefined): HarnessScenario {
  if (!value) {
    return 'success';
  }

  return value in SCENARIO_PACKS ? (value as HarnessScenario) : 'success';
}

export function statusClassForJourney(state: JourneyStatus): string {
  if (state === 'healthy') return 'state-healthy';
  if (state === 'warning') return 'state-degraded';
  return 'state-critical';
}

export function statusClassForCheck(status: 'ok' | 'warning' | 'error'): string {
  if (status === 'ok') return 'status-completed';
  if (status === 'warning') return 'status-pending';
  return 'status-failed';
}

export function normalizeStatusRows(rows: StatusFixtureRow[]): { rows: StatusFixtureRow[]; malformedCount: number } {
  const timestamped: TimestampedRow[] = [];
  let malformedCount = 0;

  rows.forEach((row, index) => {
    const timestamp = Date.parse(row.occurredAt);
    if (!Number.isFinite(timestamp)) {
      malformedCount += 1;
      return;
    }
    timestamped.push({ ...row, __timestamp: timestamp, __index: index });
  });

  timestamped.sort((left, right) => {
    if (left.__timestamp !== right.__timestamp) {
      return left.__timestamp - right.__timestamp;
    }
    if (left.stage !== right.stage) {
      return left.stage.localeCompare(right.stage);
    }
    return left.__index - right.__index;
  });

  return {
    rows: timestamped.map(({ __index, __timestamp, ...row }) => row),
    malformedCount,
  };
}

function summarizeJourneyState(checks: MerchantFixture['checkItems']): JourneyStatus {
  if (checks.some((row) => row.status === 'error')) return 'critical';
  if (checks.some((row) => row.status === 'warning')) return 'warning';
  return 'healthy';
}

function summarizeIntentState(intent: IntentFixture): JourneyStatus {
  if (intent.diagnostics.length === 0) return 'healthy';
  return intent.responsePreview.status === 'PENDING' ? 'warning' : 'critical';
}

function summarizeStatusState(statusRows: StatusFixtureRow[]): JourneyStatus {
  if (statusRows.some((row) => row.status === 'FAILED')) return 'critical';
  if (statusRows.some((row) => row.status === 'RETRYING' || row.status === 'PENDING')) return 'warning';
  return 'healthy';
}

export function buildRecoveryMessage(scenario: HarnessScenario, malformedCount: number): string {
  if (scenario === 'success') {
    return 'No recovery needed. Fixtures are healthy across all flows.';
  }
  if (scenario === 'validation_error') {
    return 'Fix required fields first, then replay the same fixture key to confirm deterministic recovery.';
  }
  if (scenario === 'timeout_retry') {
    return 'Timeout captured; retry policy recovered successfully without changing the idempotency key.';
  }
  if (malformedCount > 0) {
    return `Malformed status rows ignored: ${malformedCount}. Fallback messaging remains stable while invalid rows are quarantined.`;
  }
  return 'Malformed fixture captured. Use canonical payload schema and replay.';
}

export function buildHarnessState(scenarioInput: string | null | undefined) {
  const scenario = parseHarnessScenario(scenarioInput);
  const pack = SCENARIO_PACKS[scenario];
  const normalizedStatus = normalizeStatusRows(pack.status.rows);
  const recoveryMessage = buildRecoveryMessage(scenario, normalizedStatus.malformedCount);

  const journeys: JourneySummary[] = [
    {
      key: 'merchant_setup',
      title: 'Merchant Setup',
      state: summarizeJourneyState(pack.merchant.checkItems),
      message: `${pack.merchant.id} · ${pack.merchant.name || 'Unnamed merchant record'}`,
    },
    {
      key: 'intent_creation',
      title: 'Payment Intent Creation',
      state: summarizeIntentState(pack.intent),
      message: `${pack.intent.reference} · ${pack.intent.responsePreview.status as string}`,
    },
    {
      key: 'status_tracking',
      title: 'Payment Status Tracking',
      state: summarizeStatusState(normalizedStatus.rows),
      message: `${normalizedStatus.rows.length} timeline event(s)`,
    },
  ];

  return {
    scenario,
    option: pack.option,
    merchant: pack.merchant,
    intent: pack.intent,
    status: {
      reference: pack.status.reference,
      rows: normalizedStatus.rows,
      malformedCount: normalizedStatus.malformedCount,
    },
    journeys,
    recoveryMessage,
  };
}
