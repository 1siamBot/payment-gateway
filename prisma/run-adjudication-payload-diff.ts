import { readFile } from 'node:fs/promises';
import {
  runAdjudicationPayloadDiff,
  writeAdjudicationPayloadDiffSummary,
} from '../src/settlements/adjudication-payload-diff';

const defaultArtifactPath =
  process.env.ADJUDICATION_PAYLOAD_DIFF_ARTIFACT_PATH ?? 'artifacts/adjudication-payload-diff-summary.json';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

function printSummary(summary: ReturnType<typeof runAdjudicationPayloadDiff>, artifactPath: string) {
  console.log('Adjudication payload diff summary');
  console.log(`input=${summary.inputPath}`);
  console.log(`artifact=${artifactPath}`);
  console.log(`verdict=${summary.verdict}`);
  console.log(`mismatches.total=${summary.totals.mismatches}`);

  for (const check of summary.checkResults) {
    const codes = check.mismatchCodes.length > 0 ? check.mismatchCodes.join(',') : 'none';
    console.log(`check${check.checkId}=${check.verdict} mismatchCodes=${codes}`);
  }

  summary.mismatches.forEach((mismatch, index) => {
    console.log(
      `mismatch.${index + 1}=${mismatch.code} path=${mismatch.path} expected=${mismatch.expected} actual=${mismatch.actual} checks=${mismatch.checks.join(',')}`,
    );
  });
}

async function main() {
  const inputPath = readArg('--input');
  const outputPath = readArg('--output') ?? defaultArtifactPath;

  if (!inputPath) {
    throw new Error('Missing required --input <path> argument');
  }

  const inputRaw = await readFile(inputPath, 'utf8');
  const inputJson = JSON.parse(inputRaw) as unknown;

  const summary = runAdjudicationPayloadDiff(inputJson, inputPath);
  await writeAdjudicationPayloadDiffSummary(outputPath, summary);
  printSummary(summary, outputPath);

  process.exit(summary.verdict === 'PASS_FINAL' ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
