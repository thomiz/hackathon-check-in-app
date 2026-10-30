import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { backupDatabase, scanBackupFiles } from '../scripts/ops-backup';
import { readOptionalFile } from '../server/operations-runtime';
import type { CommandRunner } from '../scripts/ops-platform';
import { operationsFixture, type OperationsFixture } from './ops-fixtures';

let fixture: OperationsFixture;
beforeEach(async () => {
  fixture = await operationsFixture();
  await writeFile(join(fixture.data, 'CURRENT'), 'synthetic manifest');
  await mkdir(join(fixture.data, 'index'));
  await writeFile(join(fixture.data, 'index', '000001.sst'), 'synthetic data, no personal information');
});
afterEach(async () => { vi.restoreAllMocks(); await rm(fixture.base, { recursive: true, force: true }); });
const copy: CommandRunner = async (_program, args) => {
  await cp(args[0]!, args[1]!, { recursive: true });
  return { code: 1, stdout: '', stderr: '' };
};

describe.skipIf(process.platform !== 'win32')('verified cold database backups', () => {
  it.each([0, 1, 7])('accepts robocopy exit %i only after verifying every saved byte', async code => {
    const runner = vi.fn<CommandRunner>(async (...args) => ({ ...await copy(...args), code }));
    const result = await backupDatabase(fixture.environment, fixture.blaze, fixture.backups, runner);
    expect(fixture.blaze.events).toEqual(['stop', 'resume']);
    expect(result.fileCount).toBe(2);
    expect(result.bytes).toBeGreaterThan(0);
    expect(await scanBackupFiles(join(result.directory, 'blaze'))).toEqual(await scanBackupFiles(fixture.data));
    const manifest: unknown = JSON.parse(await readFile(join(result.directory, 'backup.json'), 'utf8'));
    expect(manifest).toMatchObject({ version: 1, fileCount: 2, digest: result.digest });
    expect(JSON.parse((await readOptionalFile(fixture.paths.backupFile))!)).toEqual(result);
    expect(runner.mock.calls[0]![0]).toBe('robocopy.exe');
    expect(runner.mock.calls[0]![1]).toContain('/E');
    expect(runner.mock.calls[0]![1]).not.toContain('/MIR');
  });
  it('backs up with the actual Windows robocopy executable', async () => {
    const destination = join(fixture.backups, 'private backups & copies');
    await mkdir(destination);
    const result = await backupDatabase(fixture.environment, fixture.blaze, destination);
    expect(result.fileCount).toBe(2);
    expect(await scanBackupFiles(join(result.directory, 'blaze'))).toEqual(await scanBackupFiles(fixture.data));
  });
  it('does not start Blaze if it was already stopped', async () => {
    await fixture.blaze.stop();
    fixture.blaze.events = [];
    await backupDatabase(fixture.environment, fixture.blaze, fixture.backups, copy);
    expect(fixture.blaze.events).toEqual([]);
    expect(fixture.blaze.container.State.Running).toBe(false);
  });
  it('leaves Blaze stopped and never records a failed copy as a backup', async () => {
    await expect(backupDatabase(fixture.environment, fixture.blaze, fixture.backups, async () => ({ code: 8, stdout: '', stderr: '' })))
      .rejects.toThrow('robocopy exit 8');
    expect(fixture.blaze.events).toEqual(['stop']);
    expect(await readOptionalFile(fixture.paths.backupFile)).toBeUndefined();
    const directories = (await readdir(fixture.backups)).filter(name => name !== 'synthetic-verified');
    expect(directories).toHaveLength(1);
    expect(await readOptionalFile(join(fixture.backups, directories[0]!, 'backup.json'))).toBeUndefined();
  });
  it('rejects a success exit code when the copied contents differ', async () => {
    const corrupt: CommandRunner = async (...args) => {
      const result = await copy(...args);
      await writeFile(join(args[1][1]!, 'CURRENT'), 'corruption');
      return result;
    };
    await expect(backupDatabase(fixture.environment, fixture.blaze, fixture.backups, corrupt)).rejects.toThrow('did not verify');
    expect(fixture.blaze.events).toEqual(['stop']);
    expect(await readOptionalFile(fixture.paths.backupFile)).toBeUndefined();
  });
  it('identifies incomplete copies when the copy process cannot finish', async () => {
    const runner: CommandRunner = async () => { throw new Error('Synthetic command timeout'); };
    await expect(backupDatabase(fixture.environment, fixture.blaze, fixture.backups, runner)).rejects.toThrow('Incomplete copy:');
    expect(fixture.blaze.events).toEqual(['stop']);
    expect(await readOptionalFile(fixture.paths.backupFile)).toBeUndefined();
  });
  it('detects database changes during the cold copy', async () => {
    const changed: CommandRunner = async (...args) => {
      const result = await copy(...args);
      await writeFile(join(fixture.data, 'CURRENT'), 'unexpected source change');
      return result;
    };
    await expect(backupDatabase(fixture.environment, fixture.blaze, fixture.backups, changed)).rejects.toThrow('did not verify');
    expect(fixture.blaze.events).toEqual(['stop']);
  });
  it('rejects backup destinations in the database or Git checkout before stopping anything', async () => {
    await expect(backupDatabase(fixture.environment, fixture.blaze, fixture.data, copy)).rejects.toThrow('outside both');
    await expect(backupDatabase(fixture.environment, fixture.blaze, fixture.root, copy)).rejects.toThrow('outside both');
    expect(fixture.blaze.events).toEqual([]);
  });
  it('retains the verified backup when restarting Blaze fails', async () => {
    vi.spyOn(fixture.blaze, 'resume').mockRejectedValueOnce(new Error('Synthetic restart failure'));
    await expect(backupDatabase(fixture.environment, fixture.blaze, fixture.backups, copy)).rejects.toThrow('Backup verified at');
    expect(await readOptionalFile(fixture.paths.backupFile)).toBeDefined();
    expect(fixture.blaze.container.State.Running).toBe(false);
  });
});
