import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { agendaRoster } from '../server/agenda.js';
import { parseRoster, type RosterUpdates } from '../server/imports.js';
import { waitForApplication } from '../server/startup.js';
import { EVENT } from '../shared/domain.js';
import { errorMessage, Operations, type MaintenancePreview, type MaintenanceRequest } from './ops-core.js';
import { isWithin, loadOperationsEnvironment } from './ops-platform.js';

export const help = `Local check-in operations (Windows, Node.js 18.17+, Docker Desktop)

  npm run ops -- status
  npm run --silent ops -- status --json
  npm run ops -- start [--blaze-only]
  npm run ops -- stop [--app-only]
  npm run ops -- backup --backup-dir <existing-private-directory>
  npm run ops -- import --attendees <csv> [--staff <csv> | --agenda <md>]
  npm run ops -- import --staff <csv> | --agenda <md>
  npm run ops -- reset

Import/reset default to READ-ONLY PREVIEWS. Apply with:
  --apply --backup-dir <existing-private-directory>
  Optional: --confirm "<exact phrase printed by the preview>" for noninteractive use.
  Add --reset-checkins to import to reset attendance before importing.
  --dry-run explicitly requests a preview and cannot be combined with --apply.

Start runs in the foreground. Ctrl+C stops the app, leaving Blaze running.
Stop shuts down the ops-managed app gracefully, then Blaze; --app-only keeps Blaze running.
Maintenance requires a stopped app, typed confirmation and a fresh verified cold backup.
Each selected CSV REPLACES the entire selected roster. Attendance is preserved unless reset is explicit.
Reset is NOT secure erasure: history, audit records, backups and saved receipts remain.
See OPERATIONS.md for prerequisites, private data handling and recovery instructions.
`;

const commandOptions: Record<string, string[]> = {
  status: ['json'], start: ['blaze-only'], stop: ['app-only'], backup: ['backup-dir'],
  import: ['attendees', 'staff', 'agenda', 'reset-checkins', 'apply', 'dry-run', 'backup-dir', 'confirm'],
  reset: ['apply', 'dry-run', 'backup-dir', 'confirm']
};
export function parseOperationsArgs(args: string[]) {
  const parsed = parseArgs({
    args, allowPositionals: true, strict: true, tokens: true,
    options: {
      help: { type: 'boolean', short: 'h' }, json: { type: 'boolean' },
      'blaze-only': { type: 'boolean' }, 'app-only': { type: 'boolean' },
      'backup-dir': { type: 'string' }, attendees: { type: 'string' }, staff: { type: 'string' }, agenda: { type: 'string' },
      'reset-checkins': { type: 'boolean' }, apply: { type: 'boolean' }, 'dry-run': { type: 'boolean' }, confirm: { type: 'string' }
    }
  });
  const seen = new Set<string>();
  for (const token of parsed.tokens) {
    if (token.kind !== 'option') continue;
    if (seen.has(token.name)) throw new Error(`Option --${token.name} must only be supplied once.`);
    seen.add(token.name);
  }
  const command = parsed.positionals[0] ?? 'help';
  if (parsed.values.help || command === 'help') return { command: 'help', options: parsed.values };
  const allowed = commandOptions[command];
  if (!allowed || parsed.positionals.length !== 1) throw new Error('Choose exactly one operations command. Run "npm run ops -- help".');
  for (const key of Object.keys(parsed.values)) {
    if (!allowed.includes(key)) throw new Error(`Option --${key} is not valid for ${command}.`);
  }
  const options = parsed.values;
  for (const name of ['backup-dir', 'attendees', 'staff', 'agenda'] as const) {
    if (options[name] !== undefined && !options[name]!.trim()) throw new Error(`--${name} must not be empty.`);
  }
  if (options.staff && options.agenda) throw new Error('Choose --staff or --agenda, not both.');
  if (command === 'import' && !options.attendees && !options.staff && !options.agenda) throw new Error('Import requires --attendees, --staff or --agenda.');
  if (options.apply && options['dry-run']) throw new Error('--apply and --dry-run cannot be combined.');
  if ((command === 'backup' || options.apply) && !options['backup-dir']) throw new Error('Provide --backup-dir pointing to an existing private directory outside the checkout.');
  if ((command === 'import' || command === 'reset') && !options.apply && (options.confirm !== undefined || options['backup-dir'])) {
    throw new Error('Confirmation and backup options require --apply. Without --apply, import/reset are previews only.');
  }
  return { command, options };
}
type Options = ReturnType<typeof parseOperationsArgs>['options'];

export async function readRosterInputs(options: Options, root: string, cwd: string) {
  const rosters: RosterUpdates = {};
  const warnings: string[] = [];
  let agendaWarnings = 0;
  const read = async (path: string) => {
    const resolved = await realpath(resolve(cwd, path));
    if (isWithin(root, resolve(cwd, path)) || isWithin(await realpath(root), resolved)) {
      warnings.push(`Input is inside the Git checkout: ${resolved}. Keep private attendee CSVs outside Git; do not commit them.`);
    }
    return readFile(resolved, 'utf8');
  };
  if (options.attendees) rosters.roster = parseRoster(await read(options.attendees));
  if (options.staff) rosters.staff = parseRoster(await read(options.staff));
  if (options.agenda) {
    const markdown = await read(options.agenda);
    try {
      const generated = agendaRoster(markdown);
      rosters.staff = generated.rows;
      agendaWarnings = generated.warnings.length;
      if (agendaWarnings) warnings.push(`Agenda has ${agendaWarnings} review warning(s). Run staff:generate privately, review the result, then import the reviewed staff CSV instead.`);
    } catch {
      throw new Error('The agenda could not be parsed. Check the Track leads and partners table; run staff:generate privately for detailed diagnostics.');
    }
  }
  return { rosters, warnings, agendaWarnings };
}

export function printPreview(preview: MaintenancePreview): void {
  console.log(`Current attendance: ${preview.checkins} check-ins; ${preview.eventRecords} event Practitioner records.`);
  for (const roster of preview.rosters) {
    console.log(`${roster.source === 'roster' ? 'Attendees' : 'Staff / track leads and partners'}: ${roster.total} rows; ` +
      `${roster.added} added, ${roster.removed} removed, ${roster.updated} updated, ${roster.unchanged} unchanged.`);
    if (roster.confirmedDetailsPreserved) console.log(`  Confirmed details preserved for ${roster.confirmedDetailsPreserved} checked-in participant(s).`);
  }
  console.log(preview.reset
    ? 'All active attendance will be reset before any import. This does not securely erase personal data.'
    : 'Attendance and confirmed check-in details will be preserved.');
  console.log(`Exact confirmation: ${preview.confirmation}`);
}

function printStatus(report: Awaited<ReturnType<Operations['status']>>) {
  console.log(`Overall: ${report.ready ? 'READY' : 'NOT READY'}`);
  console.log(`App: ${report.app.health.detail}${report.app.pid ? ` (PID ${report.app.pid}, ${report.app.managed ? 'ops managed' : 'manual'})` : ''} - ${report.appUrl}`);
  console.log(`Blaze: ${report.blaze.state}, ${report.blaze.health.detail} - ${report.fhirUrl}`);
  if (report.databaseDirectory) console.log(`Database: ${report.databaseDirectory}`);
  if (report.disk) console.log(`Database disk free: ${(report.disk.freeBytes / 1024 ** 3).toFixed(1)} GiB`);
  if (report.lastBackup) console.log(`Last verified backup: ${report.lastBackup.directory} (${report.lastBackup.ageHours.toFixed(1)} hours ago)`);
  else console.log('Last verified backup: none available for this configuration.');
  if (report.attendance) {
    console.log('Attendance totals:', JSON.stringify(report.attendance.totals));
    console.log('Arrivals by track:', JSON.stringify(report.attendance.tracks));
  }
  for (const error of report.errors) console.error(error);
}

export async function runOperations(args: string[]): Promise<number> {
  const { command, options } = parseOperationsArgs(args);
  if (command === 'help') { console.log(help); return 0; }
  if (process.platform !== 'win32') throw new Error('This operations CLI targets Windows/Docker Desktop. The existing npm scripts remain available on other platforms.');
  const cwd = process.cwd();
  const environment = await loadOperationsEnvironment();
  const operations = new Operations(environment);
  process.chdir(environment.root);
  try {
    if (command === 'status') {
      const status = await operations.status();
      if (options.json) console.log(JSON.stringify(status, null, 2));
      else printStatus(status);
      return status.ready ? 0 : 1;
    }
    if (command === 'start') {
      const running = await operations.start(options['blaze-only']);
      if (running) {
        console.log(`Check-in app ready: ${environment.config.publicUrl}`);
        console.log('Leave this window open. Ctrl+C stops the app only; "npm run ops -- stop" stops the app and Blaze.');
        await waitForApplication(running);
      } else console.log('Blaze is ready. The check-in app has not been started.');
      return 0;
    }
    if (command === 'stop') {
      await operations.stop(options['app-only']);
      console.log(options['app-only'] ? 'Application stopped. Blaze has been left running.' : 'Application and Blaze stopped. Database files were preserved.');
      return 0;
    }
    const backupDirectory = options['backup-dir'] ? resolve(cwd, options['backup-dir']) : undefined;
    if (command === 'backup') {
      const result = await operations.backup(backupDirectory!);
      console.log(`Backup verified: ${result.directory} (${result.fileCount} files, ${result.bytes} bytes). The app remains stopped.`);
      return 0;
    }
    const inputs = await readRosterInputs(options, environment.root, cwd);
    for (const warning of inputs.warnings) console.warn(`REVIEW: ${warning}`);
    const request: MaintenanceRequest = { resetCheckins: command === 'reset' || !!options['reset-checkins'], rosters: inputs.rosters };
    console.log(`Target event: ${EVENT}; FHIR: ${environment.config.fhir.baseUrl}`);
    console.log(`Database directory: ${await operations.blaze.dataDirectory()}`);
    if (!options.apply) {
      printPreview(await operations.preview(request));
      console.log('PREVIEW ONLY: no files, rosters or attendance were changed. Repeat with --apply --backup-dir to proceed.');
      return 0;
    }
    if (inputs.agendaWarnings) throw new Error('Agenda review warnings block apply. Import an organizer-reviewed staff CSV instead.');
    const result = await operations.apply(request, backupDirectory!, async preview => {
      printPreview(preview);
      if (options.confirm !== undefined) return options.confirm.trim();
      if (!process.stdin.isTTY) throw new Error('Interactive confirmation requires a terminal. For automation, pass --confirm with the exact current preview phrase.');
      const prompt = createInterface({ input: process.stdin, output: process.stdout });
      try { return (await prompt.question('Type the exact confirmation above (anything else cancels): ')).trim(); }
      finally { prompt.close(); }
    });
    console.log(`Maintenance verified (${result.preview.action}). Backup: ${result.backup.directory}`);
    console.log('The app remains stopped. Review the result, then run "npm run ops -- start".');
    return 0;
  } finally { process.chdir(cwd); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = await runOperations(process.argv.slice(2)); }
  catch (error) { console.error(`Operations failed: ${errorMessage(error)}`); process.exitCode = 1; }
}
