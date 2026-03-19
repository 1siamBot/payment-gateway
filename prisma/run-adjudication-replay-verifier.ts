import {
  DEFAULT_ADJUDICATION_REPLAY_FIXTURES,
  runAdjudicationReplayVerifier,
  writeAdjudicationReplaySummary,
} from '../src/settlements/adjudication-replay-verifier';

const artifactPath = process.env.ADJUDICATION_REPLAY_ARTIFACT_PATH ?? 'artifacts/adjudication-replay-summary.json';

function printStableSummary(summary: ReturnType<typeof runAdjudicationReplayVerifier>) {
  console.log('Adjudication replay verifier summary');
  console.log(`artifact=${artifactPath}`);

  for (const check of summary.checkResults) {
    const signatures = check.failureSignatureKeys.length > 0 ? check.failureSignatureKeys.join(',') : 'none';
    console.log(
      `check${check.checkId}=${check.verdict} signatureKey=${check.signatureKey ?? 'none'} signatures=${signatures} firstOwner=${check.firstOwner ?? 'none'} escalationOwner=${check.escalationOwner ?? 'none'}`,
    );
  }

  console.log(`fixtures.total=${summary.totals.fixtures}`);
  console.log(`fixtures.passed=${summary.totals.passed}`);
  console.log(`fixtures.failed=${summary.totals.failed}`);
}

async function main() {
  const summary = runAdjudicationReplayVerifier(DEFAULT_ADJUDICATION_REPLAY_FIXTURES);
  await writeAdjudicationReplaySummary(artifactPath, summary);
  printStableSummary(summary);

  const allPass = summary.checkResults.every((check) => check.verdict === 'PASS_FINAL');
  process.exit(allPass ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
