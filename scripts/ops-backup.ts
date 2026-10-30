import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, realpath, stat, statfs, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { z } from 'zod';
import { writePrivateJson, type OperationPaths } from '../server/operations-runtime.js';
import { isWithin, runCommand, type BlazeController, type CommandResult, type CommandRunner, type OperationsEnvironment } from './ops-platform.js';

interface BackupFile { path: string; bytes: number; sha256: string }
export async function scanBackupFiles(directory: string): Promise<BackupFile[]> {
  const files: BackupFile[] = [];
  const visit = async (path: string): Promise<void> => {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Database backups must not contain symbolic links or junctions.');
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) {
        const hash = createHash('sha256');
        for await (const chunk of createReadStream(child)) hash.update(chunk);
        files.push({ path: relative(directory, child), bytes: (await stat(child)).size, sha256: hash.digest('hex') });
      } else throw new Error('Database backups must contain only regular files and directories.');
    }
  };
  await visit(directory);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export const backupRecordSchema = z.object({
  version: z.literal(1), createdAt: z.string().datetime(), directory: z.string(), source: z.string(),
  fhirBaseUrl: z.string(), fileCount: z.number().int().nonnegative(), bytes: z.number().nonnegative(),
  digest: z.string().regex(/^[a-f0-9]{64}$/)
});
export type BackupRecord = z.infer<typeof backupRecordSchema>;

export async function backupDatabase(
  environment: OperationsEnvironment, blaze: BlazeController, backupDirectory: string,
  run: CommandRunner = runCommand
): Promise<BackupRecord> {
  if (process.platform !== 'win32') throw new Error('The database backup command requires Windows and robocopy. Use the documented cold-backup procedure on other platforms.');
  const source = await blaze.dataDirectory();
  const parent = await realpath(backupDirectory);
  if (!(await stat(parent)).isDirectory()) throw new Error('The backup destination must be an existing private directory.');
  if (isWithin(source, parent) || isWithin(await realpath(environment.root), parent)) {
    throw new Error('Choose a backup directory outside both the database directory and the Git checkout.');
  }
  const container = await blaze.inspect();
  if (!container) throw new Error('No Blaze container exists to verify the database location.');
  await blaze.validateContainer(container);
  const restart = container.State.Running;
  if (restart) await blaze.stop();
  const stopped = await blaze.inspect();
  if (!stopped || stopped.Id !== container.Id || stopped.State.Running) throw new Error('Could not verify that the same Blaze container is stopped. No backup was made.');

  const before = await scanBackupFiles(source);
  const bytes = before.reduce((total, file) => total + file.bytes, 0);
  const disk = await statfs(parent);
  if (disk.bavail * disk.bsize < bytes) throw new Error('The backup disk does not have enough free space. Blaze remains stopped.');
  const createdAt = new Date().toISOString();
  const directory = join(parent, `blaze-${createdAt.replace(/[:.]/g, '-')}-${randomBytes(4).toString('hex')}`);
  await mkdir(directory);
  const destination = join(directory, 'blaze');
  await mkdir(destination);
  let copied: CommandResult;
  try {
    copied = await run('robocopy.exe', [source, destination, '/E', '/COPY:DAT', '/DCOPY:DAT', '/R:1', '/W:1', '/XJ', '/NFL', '/NDL', '/NJH', '/NJS', '/NP'], {
      cwd: environment.root, env: environment.env, timeout: 30 * 60000
    });
  } catch (error) {
    throw new Error(`Backup copy failed. Blaze remains stopped. Incomplete copy: ${directory}. ${error instanceof Error ? error.message : 'Unknown copy error'}`);
  }
  if (copied.code < 0 || copied.code >= 8) throw new Error(`Backup copy failed (robocopy exit ${copied.code}). Blaze remains stopped. Incomplete copy: ${directory}`);
  const [after, saved] = await Promise.all([scanBackupFiles(source), scanBackupFiles(destination)]);
  const manifest = JSON.stringify(before);
  if (JSON.stringify(after) !== manifest || JSON.stringify(saved) !== manifest) {
    throw new Error(`Backup contents did not verify. Blaze remains stopped. Do not use the incomplete copy: ${directory}`);
  }
  const stillStopped = await blaze.inspect();
  if (!stillStopped || stillStopped.Id !== container.Id || stillStopped.State.Running) {
    throw new Error('Blaze changed or restarted during backup. The copy is not verified; do not use it.');
  }
  const record: BackupRecord = {
    version: 1, createdAt, directory, source, fhirBaseUrl: environment.config.fhir.baseUrl,
    fileCount: before.length, bytes, digest: createHash('sha256').update(manifest).digest('hex')
  };
  await writeFile(join(directory, 'backup.json'), JSON.stringify({ ...record, files: before }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  await saveBackupRecord(environment.paths, record);
  if (restart) {
    try { await blaze.resume(); }
    catch (error) { throw new Error(`Backup verified at ${directory}, but Blaze could not restart. Keep the app stopped. ${error instanceof Error ? error.message : 'Unknown restart error'}`); }
  }
  return record;
}

export async function saveBackupRecord(paths: OperationPaths, record: BackupRecord): Promise<void> {
  await writePrivateJson(paths.backupFile, record);
}
