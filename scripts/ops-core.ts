import { access, readFile, stat, statfs } from 'node:fs/promises';
import { join } from 'node:path';
import { ZodError } from 'zod';
import { loadConfig, repositoryRoot, type Config } from '../server/config.js';
import { backupDataFile, backupRecordSchema, JsonFileStore, readStore, storePaths, type BackupRecord } from '../server/file-store.js';
import { importRosters, previewRosters, verifyRosters, type RosterUpdates } from '../server/imports.js';
import { MemoryStore } from '../server/memory-store.js';
import { RegistrationService } from '../server/registration.js';
import { previewResetCheckins, resetCheckins } from '../server/reset-checkins.js';
import { startApplication } from '../server/startup.js';

export interface MaintenanceRequest { resetCheckins: boolean; rosters: RosterUpdates; keepMissing?: boolean }
export interface MaintenancePreview {
  action: 'reset' | 'import' | 'reset-and-import';
  reset: boolean;
  checkins: number;
  eventRecords: number;
  rosters: Awaited<ReturnType<typeof previewRosters>>['rosters'];
  confirmation: string;
}
export { backupRecordSchema, type BackupRecord } from '../server/file-store.js';
export interface OperationsEnvironment { root: string; config: Config }

export function loadOperationsEnvironment(root = repositoryRoot): OperationsEnvironment {
  return { root, config: loadConfig() };
}

export function errorMessage(error: unknown): string {
  if (error instanceof ZodError) return `Invalid input: ${error.issues.map(issue => `${issue.path.join('.') || 'input'} (${issue.code})`).join('; ')}`;
  if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code.startsWith('CSV_')) {
    return `CSV parsing failed (${error.code}). Check the header, quoting and row lengths; no roster was imported.`;
  }
  return error instanceof Error ? error.message : 'Unknown error';
}

export function localAppUrl(config: Config): string {
  const host = config.host === '0.0.0.0' ? '127.0.0.1' : config.host === '::' ? '[::1]' : config.host;
  return `http://${host.includes(':') && !host.startsWith('[') ? `[${host}]` : host}:${config.port}`;
}

export async function appHealth(config: Config, fetcher: typeof fetch = fetch): Promise<{ ok: boolean; detail: string }> {
  try {
    const response = await fetcher(`${localAppUrl(config)}/api/health`, { signal: AbortSignal.timeout(3000) });
    return response.ok ? { ok: true, detail: 'Healthy' } : { ok: false, detail: `HTTP ${response.status}` };
  } catch { return { ok: false, detail: 'Not running or not responding' }; }
}

export class Operations {
  constructor(readonly environment: OperationsEnvironment) {}
  get paths() { return storePaths(this.environment.config.dataDir); }
  defaultBackupDirectory() { return join(this.paths.directory, 'backups'); }
  private service(store: MemoryStore) { return new RegistrationService(store, this.environment.config.sessionSecret); }

  async status() {
    const errors: string[] = [];
    const capture = async <T>(label: string, action: () => Promise<T>): Promise<T | undefined> => {
      try { return await action(); }
      catch (error) { errors.push(`${label}: ${errorMessage(error)}`); return undefined; }
    };
    const { config } = this.environment;
    const app = await appHealth(config);
    if (!app.ok) errors.push(`App: ${app.detail}`);
    const data = await capture('Data file', async () => {
      const info = await stat(this.paths.file).catch(() => undefined);
      return info ? { bytes: info.size, modified: info.mtime.toISOString() } : undefined;
    });
    const lock = await readFile(this.paths.lock, 'utf8').then(text => JSON.parse(text) as { pid: number; purpose: string; since: string }).catch(() => undefined);
    const disk = await capture('Disk space', async () => {
      const value = await statfs(this.paths.directory);
      return { freeBytes: value.bavail * value.bsize };
    });
    const lastBackup = await capture('Last backup', async () => {
      const raw = await readFile(join(this.paths.directory, 'last-backup.json'), 'utf8').catch(() => undefined);
      if (!raw) return undefined;
      const record = backupRecordSchema.parse(JSON.parse(raw));
      await access(record.file);
      return { ...record, ageHours: Math.max(0, (Date.now() - Date.parse(record.createdAt)) / 3600000) };
    });
    const attendance = data ? await capture('Attendance counts', async () => {
      const service = this.service(await readStore(config.dataDir));
      const { totals, tracks } = await service.dashboard();
      return { totals, tracks };
    }) : undefined;
    return {
      ready: errors.length === 0, node: process.version, appUrl: config.publicUrl, dataFile: this.paths.file,
      data, lock, app, disk, lastBackup, attendance, errors
    };
  }

  async start() {
    try { await access(join(this.environment.root, 'dist', 'index.html')); }
    catch { throw new Error('The built UI is unavailable. Run "npm run build" before startup.'); }
    return startApplication(this.environment.config);
  }

  /** Copies the current snapshot. Safe while the app runs, because the app replaces the file atomically. */
  backup(directory = this.defaultBackupDirectory()): Promise<BackupRecord | undefined> {
    return backupDataFile(this.environment.config.dataDir, directory);
  }

  private async plan(service: RegistrationService, request: MaintenanceRequest): Promise<MaintenancePreview> {
    const hasImports = Object.values(request.rosters).some(rows => rows !== undefined);
    if (!request.resetCheckins && !hasImports) throw new Error('Select at least one roster or a check-in reset.');
    await service.initialize();
    const reset = await previewResetCheckins(service);
    const imports = hasImports ? await previewRosters(service, request.rosters, request.resetCheckins, { removeMissing: !request.keepMissing }) : undefined;
    return {
      action: request.resetCheckins ? hasImports ? 'reset-and-import' : 'reset' : 'import',
      reset: request.resetCheckins, checkins: reset.checkedIn, eventRecords: reset.practitioners,
      rosters: imports?.rosters ?? [],
      confirmation: request.resetCheckins ? hasImports ? 'RESET IMPORT' : 'RESET CHECKINS' : 'IMPORT ROSTERS'
    };
  }

  /** Read-only: works on an in-memory copy and may run while the app is running. */
  async preview(request: MaintenanceRequest): Promise<MaintenancePreview> {
    return this.plan(this.service(await readStore(this.environment.config.dataDir)), request);
  }

  async apply(
    request: MaintenanceRequest, backupDirectory: string | undefined, confirm: (preview: MaintenancePreview) => Promise<string>
  ): Promise<{ preview: MaintenancePreview; backup?: BackupRecord }> {
    // Holding the store lock guarantees the app is stopped and nothing else writes during maintenance.
    const store = await JsonFileStore.open(this.environment.config.dataDir, 'ops maintenance');
    try {
      const draft = new MemoryStore();
      draft.resources = store.resources;
      const preview = await this.plan(this.service(draft), request);
      if (await confirm(preview) !== preview.confirmation) throw new Error('Confirmation did not match. No backup, reset or import was performed.');
      const backup = await this.backup(backupDirectory);
      const service = this.service(store);
      // One atomic write: on any failure the data file is left exactly as it was.
      await store.batch(async () => {
        await service.initialize();
        if (request.resetCheckins) await resetCheckins(service);
        if (preview.rosters.length) await importRosters(service, request.rosters, { removeMissing: !request.keepMissing });
        if (request.resetCheckins) {
          const after = await previewResetCheckins(service);
          if (after.checkedIn !== 0 || after.practitioners !== 0) throw new Error('Reset verification found remaining check-in records.');
        }
        await verifyRosters(service, request.rosters, { removeMissing: !request.keepMissing });
      });
      return { preview, backup };
    } finally { await store.close(); }
  }
}
