const paymentForm = document.getElementById('payment-form');
const filterForm = document.getElementById('filter-form');
const observabilityForm = document.getElementById('observability-form');
const customerSearchForm = document.getElementById('customer-search-form');
const lookupForm = document.getElementById('lookup-form');

const createState = document.getElementById('create-state');
const listState = document.getElementById('list-state');
const obsState = document.getElementById('obs-state');
const customerState = document.getElementById('customer-state');
const detailState = document.getElementById('detail-state');

const paymentsBody = document.getElementById('payments-body');
const customersBody = document.getElementById('customers-body');
const detailBox = document.getElementById('detail-box');
const refundButton = document.getElementById('refund-btn');

const obsAlerts = document.getElementById('obs-alerts');
const obsProvider = document.getElementById('obs-provider');
const obsSegment = document.getElementById('obs-segment');
const obsTimeframe = document.getElementById('obs-timeframe');
const obsDecisionsBody = document.getElementById('obs-decisions-body');
const obsFailoversBody = document.getElementById('obs-failovers-body');
const obsBreakersBody = document.getElementById('obs-breakers-body');
const obsMarginBody = document.getElementById('obs-margin-body');

let currentDetail = null;
let observabilityData = null;

function setState(el, msg, isError = false) {
  el.textContent = msg;
  el.classList.toggle('error', isError);
}

function serializeFilters() {
  const params = new URLSearchParams();
  const merchantId = document.getElementById('filter-merchant').value.trim();
  const customerId = document.getElementById('filter-customer').value.trim();
  const reference = document.getElementById('filter-reference').value.trim();
  const status = document.getElementById('filter-status').value;
  const type = document.getElementById('filter-type').value;

  if (merchantId) params.set('merchantId', merchantId);
  if (customerId) params.set('customerId', customerId);
  if (reference) params.set('reference', reference);
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  params.set('take', '50');
  return params.toString();
}

function renderPayments(rows) {
  paymentsBody.innerHTML = '';
  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6">No payments found</td>';
    paymentsBody.appendChild(tr);
    return;
  }

  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><button type="button" data-reference="${row.reference}">${row.reference}</button></td>
      <td>${row.merchantId}</td>
      <td>${row.type}</td>
      <td>${row.status}</td>
      <td>${row.amount}</td>
      <td>${row.currency}</td>
    `;
    paymentsBody.appendChild(tr);
  }
}

function renderCustomers(rows) {
  customersBody.innerHTML = '';
  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4">No customers found</td>';
    customersBody.appendChild(tr);
    return;
  }

  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.name ?? '-'}</td>
      <td>${row.email ?? '-'}</td>
      <td>${row.externalId ?? '-'}</td>
      <td><button type="button" data-customer-id="${row.id}" data-merchant-id="${row.merchantId}">View Payments</button></td>
    `;
    customersBody.appendChild(tr);
  }
}

function renderEmptyRow(tbody, colSpan, message) {
  tbody.innerHTML = '';
  const tr = document.createElement('tr');
  tr.innerHTML = `<td colspan="${colSpan}">${message}</td>`;
  tbody.appendChild(tr);
}

function getTimeframeHours() {
  const hours = Number.parseInt(String(obsTimeframe.value || '24h').replace('h', ''), 10);
  if (!Number.isFinite(hours) || hours <= 0) {
    return 24;
  }
  return hours;
}

function renderAlerts(alerts) {
  obsAlerts.innerHTML = '';

  if (!alerts.length) {
    const div = document.createElement('div');
    div.className = 'alert ok';
    div.textContent = 'No telemetry alerts in selected window.';
    obsAlerts.appendChild(div);
    return;
  }

  for (const alert of alerts) {
    const div = document.createElement('div');
    div.className = `alert ${alert.type}`;
    div.textContent = alert.message;
    obsAlerts.appendChild(div);
  }
}

function renderDecisions(rows) {
  if (!rows?.length) {
    renderEmptyRow(obsDecisionsBody, 4, 'No route decisions for selected filters');
    return;
  }

  obsDecisionsBody.innerHTML = '';
  for (const row of rows.slice(0, 30)) {
    const scoreText = Number.isFinite(row.score)
      ? `score ${row.score.toFixed(2)} | ${row.algorithm}`
      : row.algorithm;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.reference}</td>
      <td>${row.provider}</td>
      <td>${row.reasonCode}</td>
      <td>${scoreText}</td>
    `;
    obsDecisionsBody.appendChild(tr);
  }
}

function renderFailovers(events) {
  if (!events?.length) {
    renderEmptyRow(obsFailoversBody, 4, 'No failover events detected');
    return;
  }

  obsFailoversBody.innerHTML = '';
  for (const event of events.slice(0, 20)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(event.at).toLocaleString()}</td>
      <td>${event.from}</td>
      <td>${event.to}</td>
      <td>${event.reasonCode} (attempt ${event.failoverCount || 0})</td>
    `;
    obsFailoversBody.appendChild(tr);
  }
}

function renderBreakers(timeline) {
  if (!timeline?.length) {
    renderEmptyRow(obsBreakersBody, 4, 'No breaker transitions in selected window');
    return;
  }

  obsBreakersBody.innerHTML = '';
  for (const point of timeline.slice(0, 20)) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(point.at).toLocaleString()}</td>
      <td>${point.provider}</td>
      <td>${point.to}</td>
      <td>${point.from} -> ${point.to}</td>
    `;
    obsBreakersBody.appendChild(tr);
  }
}

function renderMargins(providerStats) {
  if (!providerStats?.length) {
    renderEmptyRow(obsMarginBody, 4, 'No provider margin data for selected filters');
    return;
  }

  obsMarginBody.innerHTML = '';
  for (const stat of providerStats) {
    const fee = Number.isFinite(stat.estimatedFeePercent) ? `${stat.estimatedFeePercent.toFixed(2)}%` : 'n/a';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${stat.provider}</td>
      <td>${stat.decisionCount}</td>
      <td>${stat.failureRate.toFixed(1)}%</td>
      <td>${fee}</td>
    `;
    obsMarginBody.appendChild(tr);
  }
}

function renderObservability(data) {
  renderAlerts(data.alerts || []);
  renderDecisions(data.decisions || []);
  renderFailovers(data.failovers || []);
  renderBreakers(data.breakerTransitions || []);
  renderMargins(data.margins || []);

  const analyzed = data.summary?.analyzedTransactions ?? 0;
  const decisions = data.summary?.decisions ?? 0;
  setState(obsState, `Analyzed ${analyzed} transactions and ${decisions} routing decisions`);
}

function syncProviderFilter(rows) {
  const current = obsProvider.value;
  const providers = [...rows];

  obsProvider.innerHTML = '<option value="">all providers</option>';
  for (const provider of providers) {
    const option = document.createElement('option');
    option.value = provider;
    option.textContent = provider;
    obsProvider.appendChild(option);
  }

  if (providers.includes(current)) {
    obsProvider.value = current;
  }
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) {
        message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      }
    } catch {
      // ignore parsing failure
    }
    throw new Error(message);
  }
  return res.json();
}

async function loadPayments() {
  setState(listState, 'Loading payments...');
  try {
    const rows = await fetchJson(`/payments?${serializeFilters()}`);
    renderPayments(rows);
    setState(listState, `Loaded ${rows.length} payments`);
  } catch (error) {
    setState(listState, error.message, true);
  }
}

async function loadObservability() {
  const merchantId = document.getElementById('filter-merchant').value.trim();
  if (!merchantId) {
    observabilityData = null;
    renderAlerts([]);
    renderEmptyRow(obsDecisionsBody, 4, 'Set merchant filter to load route decisions');
    renderEmptyRow(obsFailoversBody, 4, 'Set merchant filter to detect failovers');
    renderEmptyRow(obsBreakersBody, 4, 'Set merchant filter to view breaker timeline');
    renderEmptyRow(obsMarginBody, 4, 'Set merchant filter to view provider margin');
    setState(obsState, 'Merchant ID is required for observability.', true);
    return;
  }

  setState(obsState, 'Loading observability metrics...');
  try {
    const params = new URLSearchParams({
      merchantId,
      timeframeHours: String(getTimeframeHours()),
      take: '250',
    });
    if (obsProvider.value) params.set('provider', obsProvider.value);
    if (obsSegment.value) params.set('segment', obsSegment.value);

    const dashboard = await fetchJson(`/payments/observability?${params.toString()}`);
    observabilityData = dashboard;
    syncProviderFilter(dashboard.providers || []);
    renderObservability(dashboard);
  } catch (error) {
    observabilityData = null;
    setState(obsState, error.message, true);
  }
}

async function loadPaymentDetail(reference) {
  setState(detailState, 'Loading payment detail...');
  try {
    const detail = await fetchJson(`/payments/${reference}`);
    currentDetail = detail;
    detailBox.textContent = JSON.stringify(detail, null, 2);
    refundButton.disabled = detail.status !== 'PAID';
    setState(detailState, `Loaded ${reference}`);
  } catch (error) {
    currentDetail = null;
    detailBox.textContent = '';
    refundButton.disabled = true;
    setState(detailState, error.message, true);
  }
}

paymentForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const merchantId = document.getElementById('merchantId').value.trim();
  const amount = Number.parseFloat(document.getElementById('amount').value);
  const currency = document.getElementById('currency').value.trim().toUpperCase();
  const type = document.getElementById('type').value;
  const idempotencyKey = document.getElementById('idempotencyKey').value.trim();

  if (!merchantId || !idempotencyKey || !currency) {
    setState(createState, 'Merchant ID, currency and idempotency key are required.', true);
    return;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    setState(createState, 'Amount must be greater than zero.', true);
    return;
  }
  if (currency.length !== 3) {
    setState(createState, 'Currency must be exactly 3 letters.', true);
    return;
  }

  const customerExternalId = document.getElementById('customerExternalId').value.trim();
  const customerEmail = document.getElementById('customerEmail').value.trim();
  const customerName = document.getElementById('customerName').value.trim();

  const payload = { merchantId, amount, currency, type, idempotencyKey };
  if (customerExternalId || customerEmail || customerName) {
    payload.customer = {
      ...(customerExternalId ? { externalId: customerExternalId } : {}),
      ...(customerEmail ? { email: customerEmail } : {}),
      ...(customerName ? { name: customerName } : {}),
    };
  }

  setState(createState, 'Creating payment...');
  try {
    const created = await fetchJson('/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setState(createState, `Created ${created.reference} (${created.status})`);
    document.getElementById('filter-merchant').value = merchantId;
    await loadPayments();
    await loadObservability();
  } catch (error) {
    setState(createState, error.message, true);
  }
});

filterForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadPayments();
  await loadObservability();
});

observabilityForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadObservability();
});

obsProvider.addEventListener('change', () => {
  void loadObservability();
});
obsSegment.addEventListener('change', () => {
  void loadObservability();
});
obsTimeframe.addEventListener('change', () => {
  void loadObservability();
});

customerSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const merchantId = document.getElementById('customer-merchant-id').value.trim();
  const query = document.getElementById('customer-query').value.trim();
  if (!merchantId) {
    setState(customerState, 'Merchant ID is required.', true);
    return;
  }

  setState(customerState, 'Searching customers...');
  try {
    const params = new URLSearchParams({ merchantId, ...(query ? { query } : {}) });
    const rows = await fetchJson(`/customers/search?${params.toString()}`);
    renderCustomers(rows);
    setState(customerState, `Found ${rows.length} customers`);
  } catch (error) {
    setState(customerState, error.message, true);
  }
});

customersBody.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const customerId = target.getAttribute('data-customer-id');
  const merchantId = target.getAttribute('data-merchant-id');
  if (!customerId || !merchantId) {
    return;
  }

  setState(customerState, 'Loading customer payment history...');
  try {
    const data = await fetchJson(`/customers/${customerId}/payments?merchantId=${merchantId}`);
    const rows = data.payments ?? [];
    renderPayments(rows);
    setState(customerState, `Loaded ${rows.length} payments for customer ${customerId}`);
  } catch (error) {
    setState(customerState, error.message, true);
  }
});

lookupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const reference = document.getElementById('lookup-reference').value.trim();
  if (!reference) {
    setState(detailState, 'Reference is required.', true);
    return;
  }
  await loadPaymentDetail(reference);
});

paymentsBody.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const reference = target.getAttribute('data-reference');
  if (!reference) {
    return;
  }
  document.getElementById('lookup-reference').value = reference;
  await loadPaymentDetail(reference);
});

refundButton.addEventListener('click', async () => {
  if (!currentDetail?.reference) {
    return;
  }
  setState(detailState, 'Triggering refund...');
  try {
    const result = await fetchJson(`/payments/${currentDetail.reference}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'support_refund' }),
    });
    setState(detailState, `Refunded ${result.sourceReference} (${result.status})`);
    await loadPaymentDetail(currentDetail.reference);
    await loadPayments();
    await loadObservability();
  } catch (error) {
    setState(detailState, error.message, true);
  }
});

void loadPayments();
void loadObservability();
