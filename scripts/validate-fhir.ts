import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';

if (!process.env.FHIR_VALIDATOR_JAR) throw new Error('Set FHIR_VALIDATOR_JAR to an official HL7 validator_cli.jar. Java is required. See README.md.');
const files = await readdir(resolve('fhir', 'fsh-generated', 'resources'));
const examples: string[] = [];
for (const name of files) {
  const path = resolve('fhir', 'fsh-generated', 'resources', name);
  const resource = JSON.parse(await readFile(path, 'utf8')) as { resourceType: string };
  if (['Person', 'Practitioner', 'List'].includes(resource.resourceType)) examples.push(path);
}
if (!examples.length) throw new Error('No examples found. Run npm run fhir:build first.');
if (existsSync(join('fhir', 'output', 'runtime-fixtures.json'))) examples.push(join('fhir', 'output', 'runtime-fixtures.json'));
const result = spawnSync('java', ['-jar', process.env.FHIR_VALIDATOR_JAR, ...examples, '-version', '4.0.1',
  '-ig', join('fhir', 'output', 'package.tgz'), '-tx', 'n/a', '-output', join('fhir', 'output', 'validation.json')], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error('HL7 FHIR validation failed. Inspect fhir\\output\\validation.json.');
const report = JSON.parse(await readFile(join('fhir', 'output', 'validation.json'), 'utf8')) as {
  resourceType: string;
  issue?: { severity: string }[];
  entry?: { resource?: { issue?: { severity: string }[] } }[];
};
if (report.resourceType !== 'OperationOutcome' && (report.resourceType !== 'Bundle' || !report.entry?.length)) {
  throw new Error('HL7 validator did not produce a recognizable outcome report.');
}
const issues = report.resourceType === 'OperationOutcome' ? report.issue ?? [] : report.entry?.flatMap(entry => entry.resource?.issue ?? []) ?? [];
const errors = issues.filter(issue => issue.severity === 'error' || issue.severity === 'fatal');
if (errors.length) throw new Error(`HL7 FHIR validation reported ${errors.length} errors. Inspect fhir\\output\\validation.json.`);
console.log(`FHIR validation: no errors; ${issues.filter(issue => issue.severity === 'warning').length} warnings.`);
