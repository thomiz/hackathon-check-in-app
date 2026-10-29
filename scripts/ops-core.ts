import { createHash } from 'node:crypto';
import { access, statfs, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Practitioner } from 'fhir/r4';
import { ZodError } from 'zod';
import { BlazeStore, resourceFingerprint } from '../server/fhir.js';
import { importRosters, previewRosters, verifyRosters, type RosterUpdates } from '../server/imports.js';
import { RegistrationService } from '../server/registration.js';
import { previewResetCheckins, resetCheckins } from '../server/reset-checkins.js';
import {
  applicationState, appPortOpen, assertApplicationStopped, assertMaintenanceComplete, pendingOperation,
  readOptionalFile, requestApplicationStop, withOperationLock, writePrivateJson, type PendingOperation
} from '../server/operations-runtime.js';
import { startApplication } from '../server/startup.js';
import { LISTS } from '../shared/domain.js';
import { backupDatabase, backupRecordSchema, type BackupRecord } from './ops-backup.js';
import { applicationHealth, canonicalFhirUrl, LocalBlaze, waitFor, type BlazeController, type OperationsEnvironment } from './ops-platform.js';

export interface MaintenanceRequest { resetCheckins: boolean; rosters: RosterUpdates }
export interface MaintenancePreview {
  action: string;
  operationKey: string;
  fingerprint: string;
  reset: boolean;
  checkins: number;
  eventRecords: number;
  rosters: Awaited<ReturnType<typeof previewRosters>>['rosters'];
  confirmation: string;
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function errorMessage(error: unknown): string {
  if (error instanceof ZodError) return `Invalid input: ${error.issues.map(issue => `${issue.path.join('.') || 'input'} (${issue.code})`).join('; ')}`;
  if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code.startsWith('CSV_')) {
    return `CSV parsing failed (${error.code}). Check the header, quoting and row lengths; no roster was imported.`;
  }
  return error instanceof Error ? error.message : 'Unknown error';
}
type BackupAction = typeof backupDatabase;

export class Operations {
  readonly service: RegistrationService;
  readonly blaze: BlazeController;
  constructor(
    readonly environment: OperationsEnvironment, blaze?: BlazeController, service?: RegistrationService,
    private createBackup: BackupAction = backupDatabase
  ) {
    this.blaze = blaze ?? new LocalBlaze(environment);
    this.service = service ?? new RegistrationService(new BlazeStore(environment.config.fhir), environment.config.sessionSecret);
  }

  async status() {
    const errors: string[] = [];
    const capture = async <T>(label: string, action: () => Promise<T>): Promise<T | undefined> => {
      try { return await action(); }
      catch (error) { errors.push(`${label}: ${errorMessage(error)}`); return undefined; }
    };
    const paths = this.environment.paths;
    const directory = await capture('Database directory', () => this.blaze.dataDirectory());
    const container = await capture('Docker/Blaze', async () => {
      const current = await this.blaze.inspect();
      if (!current) throw new Error('No Blaze container exists.');
      await this.blaze.validateContainer(current);
      return current;
    });
    const blazeHealth = container?.State.Running && container.State.Health?.Status === 'healthy'
      ? await this.blaze.health()
      : { ok: false, detail: container ? `Container ${container.State.Status}, health ${container.State.Health?.Status ?? 'unavailable'}` : 'Container unavailable' };
    if (!blazeHealth.ok) errors.push(`Blaze health: ${blazeHealth.detail}`);
    const app = await capture('Application control', () => applicationState(paths));
    const appHealth = await applicationHealth(this.environment.config);
    if (!appHealth.ok) errors.push(`App health: ${appHealth.detail}`);
    const pending = await capture('Maintenance journal', () => pendingOperation(paths));
    if (pending) errors.push(`Unfinished ${pending.action} (${pending.stage}); keep the app stopped.`);
    const backup = await capture('Last backup', async () => {
      const raw = await readOptionalFile(paths.backupFile);
      if (!raw) return undefined;
      const record = backupRecordSchema.parse(JSON.parse(raw));
      await access(join(record.directory, 'backup.json'));
      if (directory && record.source !== directory) throw new Error('The recorded backup is for a different database directory.');
      return { ...record, ageHours: Math.max(0, (Date.now() - Date.parse(record.createdAt)) / 3600000) };
    });
    const disk = directory ? await capture('Disk space', async () => {
      const value = await statfs(directory);
      return { freeBytes: value.bavail * value.bsize };
    }) : undefined;
    const attendance = blazeHealth.ok ? await capture('Attendance counts', async () => {
      const { totals, tracks } = await this.service.dashboard();
      return { totals, tracks };
    }) : undefined;
    const ready = errors.length === 0 && !!container?.State.Running && container.State.Health?.Status === 'healthy';
    return {
      ready, node: process.version, appUrl: this.environment.config.publicUrl, fhirUrl: this.environment.config.fhir.baseUrl,
      databaseDirectory: directory, blaze: { state: container?.State.Status ?? 'unknown', health: blazeHealth },
      app: { ...app, health: appHealth }, disk, lastBackup: backup, pending, attendance, errors
    };
  }

  async start(blazeOnly = false) {
    const { paths, config, root } = this.environment;
    return withOperationLock(paths, async () => {
      if (!blazeOnly) await assertMaintenanceComplete(paths);
      await assertApplicationStopped(paths, config);
      if (!blazeOnly) {
        try { await access(join(root, 'dist', 'index.html')); }
        catch (error) { throw new Error(`The built UI is unavailable. Run "npm run build" before startup. ${errorMessage(error)}`); }
      }
      await this.blaze.start();
      if (blazeOnly) return undefined;
      const running = await startApplication(config, paths, true, this.service.store);
      try { await waitFor(() => applicationHealth(config), 'Check-in application', 30000); }
      catch (error) { await running.close(); throw error; }
      return running;
    });
  }

  async stop(appOnly = false): Promise<void> {
    const { paths, config } = this.environment;
    await withOperationLock(paths, async () => {
      await requestApplicationStop(paths);
      await waitFor(async () => ({
        ok: !(await applicationState(paths)) && !(await appPortOpen(config)),
        detail: 'The application is still listening or a manual app must be stopped with Ctrl+C'
      }), 'Application shutdown', 30000);
      if (!appOnly) await this.blaze.stop();
    });
  }

  async backup(directory: string): Promise<BackupRecord> {
    return withOperationLock(this.environment.paths, async () => {
      await assertApplicationStopped(this.environment.paths, this.environment.config);
      return this.createBackup(this.environment, this.blaze, directory);
    });
  }

  private async plan(request: MaintenanceRequest): Promise<MaintenancePreview> {
    const hasImports = Object.values(request.rosters).some(rows => rows !== undefined);
    if (!request.resetCheckins && !hasImports) throw new Error('Select at least one roster or a check-in reset.');
    const reset = await previewResetCheckins(this.service);
    const imports = hasImports ? await previewRosters(this.service, request.rosters, request.resetCheckins) : undefined;
    const operationKey = hash({
      database: await this.blaze.dataDirectory(), fhir: canonicalFhirUrl(this.environment.config.fhir.baseUrl),
      reset: request.resetCheckins, roster: request.rosters.roster ?? null, staff: request.rosters.staff ?? null
    });
    const action = request.resetCheckins ? hasImports ? 'reset-and-import' : 'reset' : 'import';
    const confirmations: string[] = [];
    if (request.resetCheckins) confirmations.push(`RESET ${reset.checkedIn} CHECK-INS AND ${reset.practitioners} EVENT RECORDS`);
    if (imports) {
      confirmations.push(`IMPORT ${imports.rosters.map(r => `${r.total} ${r.source === 'roster' ? 'ATTENDEES' : 'STAFF'}`).join(' AND ')}`);
      confirmations.push(`REMOVE ${imports.rosters.reduce((total, r) => total + r.removed, 0)} ROSTER MEMBERSHIPS`);
    }
    return {
      action, operationKey,
      fingerprint: hash([operationKey, reset.fingerprint, imports?.fingerprint]), reset: request.resetCheckins,
      checkins: reset.checkedIn, eventRecords: reset.practitioners, rosters: imports?.rosters ?? [],
      confirmation: confirmations.join('; ')
    };
  }

  async preview(request: MaintenanceRequest): Promise<MaintenancePreview> {
    return withOperationLock(this.environment.paths, async () => {
      await this.blaze.requireHealthy();
      return this.plan(request);
    });
  }

  private async preservedResources(request: MaintenanceRequest): Promise<string> {
    const resources = await Promise.all((['roster', 'staff'] as const).filter(source => request.rosters[source] === undefined)
      .map(source => this.service.list(LISTS[source])));
    return resourceFingerprint([
      ...resources,
      ...(!request.resetCheckins ? [
        await this.service.list(LISTS.checkins), ...await this.service.store.search<Practitioner>('Practitioner', '_count=200')
      ] : [])
    ]);
  }

  async apply(
    request: MaintenanceRequest, backupDirectory: string, confirm: (preview: MaintenancePreview) => Promise<string>
  ): Promise<{ preview: MaintenancePreview; backup: BackupRecord }> {
    const { paths, config } = this.environment;
    return withOperationLock(paths, async () => {
      await assertApplicationStopped(paths, config);
      await this.blaze.requireHealthy();
      const preview = await this.plan(request);
      const pending = await pendingOperation(paths);
      if (pending && pending.operationKey !== preview.operationKey) {
        throw new Error(`Unfinished ${pending.action}: retry the same operation with the same reviewed inputs first. Original backup: ${pending.backup}`);
      }
      if (await confirm(preview) !== preview.confirmation) throw new Error('Confirmation did not match. No backup, reset or import was performed.');
      const backup = await this.createBackup(this.environment, this.blaze, backupDirectory);
      await this.blaze.requireHealthy();
      await assertApplicationStopped(paths, config);
      if ((await this.plan(request)).fingerprint !== preview.fingerprint) {
        throw new Error('The database changed after confirmation. No reset or import was performed; review a fresh preview.');
      }
      const preserved = await this.preservedResources(request);
      const journal: PendingOperation = {
        operationKey: preview.operationKey, action: preview.action, stage: 'prepared',
        startedAt: pending?.startedAt ?? new Date().toISOString(), backup: pending?.backup ?? backup.directory
      };
      await writePrivateJson(paths.pendingFile, journal);
      try {
        if (request.resetCheckins) {
          journal.stage = 'reset';
          await writePrivateJson(paths.pendingFile, journal);
          await resetCheckins(this.service);
        }
        if (preview.rosters.length) {
          journal.stage = 'import';
          await writePrivateJson(paths.pendingFile, journal);
          await importRosters(this.service, request.rosters);
        }
        journal.stage = 'verification';
        await writePrivateJson(paths.pendingFile, journal);
        if (request.resetCheckins) {
          const reset = await previewResetCheckins(this.service);
          if (reset.checkedIn !== 0 || reset.practitioners !== 0) throw new Error('Reset verification found remaining check-in records.');
        }
        await verifyRosters(this.service, request.rosters);
        if (await this.preservedResources(request) !== preserved) throw new Error('Unselected rosters or preserved attendance changed unexpectedly.');
        await unlink(paths.pendingFile);
      } catch (error) {
        throw new Error(`Maintenance stopped during ${journal.stage}. Keep the app stopped and retry the same ops command. Original backup: ${journal.backup}. ${errorMessage(error)}`);
      }
      return { preview, backup };
    });
  }
}
