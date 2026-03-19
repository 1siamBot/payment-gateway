export type RouteInventoryEntry = {
  path: string;
  title: string;
  category: 'core' | 'operations' | 'flow' | 'remediation';
  sourceIssue: string;
};

export type IntentionalExclusion = {
  area: string;
  rationale: string;
  trackingIssue: string;
};

export const CORE_ROUTE_INVENTORY: RouteInventoryEntry[] = [
  { path: '/', title: 'Main Operations Console', category: 'core', sourceIssue: 'ONE-25' },
  { path: '/payment-operations-dashboard', title: 'Payment Operations Dashboard', category: 'operations', sourceIssue: 'ONE-364' },
  { path: '/merchant-operations', title: 'Merchant Operations', category: 'operations', sourceIssue: 'ONE-366' },
  { path: '/risk-alert-command-center', title: 'Risk Alert Command Center', category: 'operations', sourceIssue: 'ONE-379' },
  { path: '/provider-failover-insights', title: 'Provider Failover Insights', category: 'operations', sourceIssue: 'ONE-379' },
  { path: '/merchant-balance-anomaly-console', title: 'Merchant Balance Anomaly Console', category: 'operations', sourceIssue: 'ONE-379' },
  { path: '/payout-monitoring-panel', title: 'Payout Monitoring Panel', category: 'operations', sourceIssue: 'ONE-379' },
  { path: '/payment-reconciliation-workspace', title: 'Payment Reconciliation Workspace', category: 'operations', sourceIssue: 'ONE-368' },
  { path: '/settlement-exceptions-inbox', title: 'Settlement Exceptions Inbox', category: 'operations', sourceIssue: 'ONE-379' },
  { path: '/settlement-exceptions-operator-workbench', title: 'Settlement Exceptions Operator Workbench', category: 'operations', sourceIssue: 'ONE-379' },
  { path: '/payment-attempt-timeline', title: 'Payment Attempt Timeline Lab', category: 'operations', sourceIssue: 'ONE-199' },
  { path: '/payment-flow', title: 'Payment Flow Hub', category: 'flow', sourceIssue: 'ONE-356' },
  { path: '/payment-flow/merchant-setup', title: 'Merchant Setup Flow', category: 'flow', sourceIssue: 'ONE-356' },
  { path: '/payment-flow/create-intent', title: 'Create Intent Flow', category: 'flow', sourceIssue: 'ONE-356' },
  { path: '/payment-flow/status-tracker', title: 'Status Tracker Flow', category: 'flow', sourceIssue: 'ONE-356' },
  { path: '/payment-flow/fixture-harness', title: 'Fixture Harness Flow', category: 'flow', sourceIssue: 'ONE-356' },
  { path: '/remediation-readiness-scoreboard', title: 'Remediation Readiness Scoreboard', category: 'remediation', sourceIssue: 'ONE-344' },
  { path: '/remediation-plan-diff-inspector', title: 'Remediation Plan Diff Inspector', category: 'remediation', sourceIssue: 'ONE-341' },
  { path: '/remediation-plan-explorer', title: 'Remediation Plan Explorer', category: 'remediation', sourceIssue: 'ONE-341' },
  { path: '/remediation-queue-workspace', title: 'Remediation Queue Workspace', category: 'remediation', sourceIssue: 'ONE-306' },
  { path: '/release-gate-verdict-explorer', title: 'Release Gate Verdict Explorer', category: 'remediation', sourceIssue: 'ONE-307' },
  { path: '/route-map', title: 'Frontend Route Map', category: 'core', sourceIssue: 'ONE-399' },
];

export const INTENTIONAL_EXCLUSIONS: IntentionalExclusion[] = [
  {
    area: 'Reconciliation mismatch detail drawer split page',
    rationale:
      'Drawer behavior is currently embedded in the reconciliation workspace until standalone scope is delivered.',
    trackingIssue: 'ONE-401',
  },
];
