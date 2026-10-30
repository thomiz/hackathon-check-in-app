import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rm } from 'node:fs/promises';
import { importRoster } from '../server/imports';
import { assertMaintenanceComplete, pendingOperation, readOptionalFile } from '../server/operations-runtime';
import { previewResetCheckins } from '../server/reset-checkins';
import { Operations, type MaintenanceRequest } from '../scripts/ops-core';
import { attendee, lead, operationsFixture, type OperationsFixture } from './ops-fixtures';

let fixture: OperationsFixture;
let operations: Operations;
let backup: ReturnType<typeof vi.fn>;
beforeEach(async () => {
  fixture = await operationsFixture();
  const createBackup = vi.fn(async () => fixture.backupRecord);
  backup = createBackup;
  operations = new Operations(fixture.environment, fixture.blaze, fixture.service, createBackup);
});
afterEach(async () => { vi.restoreAllMocks(); await rm(fixture.base, { recursive: true, force: true }); });
const reset: MaintenanceRequest = { resetCheckins: true, rosters: {} };
const imports: MaintenanceRequest = { resetCheckins: false, rosters: { roster: [attendee, lead] } };
async function arrive() {
  const [match] = await fixture.service.matches('Alice');
  const selected = await fixture.service.select(match!.token);
  return fixture.service.checkin(selected, selected.selection);
}
const confirm = async (preview: { confirmation: string }) => preview.confirmation;

describe('guarded maintenance core', () => {
  it('previews without backups, journal files, initialization or database writes', async () => {
    const snapshot = structuredClone(fixture.store.resources);
    const transaction = vi.spyOn(fixture.store, 'transaction');
    const preview = await operations.preview(imports);
    expect(preview.confirmation).toBe('IMPORT 2 ATTENDEES; REMOVE 0 ROSTER MEMBERSHIPS');
    expect(preview.rosters[0]).toMatchObject({ added: 1, unchanged: 1 });
    expect(transaction).not.toHaveBeenCalled();
    expect(backup).not.toHaveBeenCalled();
    expect(await readOptionalFile(fixture.paths.pendingFile)).toBeUndefined();
    expect(fixture.store.resources).toEqual(snapshot);
  });
  it('does not initialize event Lists when previewing an empty database', async () => {
    fixture.store.resources.clear();
    const transaction = vi.spyOn(fixture.store, 'transaction');
    await expect(operations.preview(reset)).rejects.toThrow('Event Lists are missing');
    expect(transaction).not.toHaveBeenCalled();
    expect(fixture.store.resources.size).toBe(0);
  });
  it('requires an exact current-count confirmation before any backup or writes', async () => {
    await arrive();
    const snapshot = structuredClone(fixture.store.resources);
    await expect(operations.apply(reset, fixture.backups, async () => 'RESET 0 CHECK-INS AND 0 EVENT RECORDS')).rejects.toThrow('Confirmation did not match');
    expect(backup).not.toHaveBeenCalled();
    expect(fixture.store.resources).toEqual(snapshot);
  });
  it('does not perform maintenance if the fresh backup fails', async () => {
    const snapshot = structuredClone(fixture.store.resources);
    backup.mockRejectedValueOnce(new Error('Synthetic backup failure'));
    await expect(operations.apply(imports, fixture.backups, confirm)).rejects.toThrow('backup failure');
    expect(fixture.store.resources).toEqual(snapshot);
    expect(await pendingOperation(fixture.paths)).toBeUndefined();
  });
  it('rechecks the database after backup, even when counts have not changed', async () => {
    backup.mockImplementationOnce(async () => {
      await importRoster(fixture.service, 'roster', [{ ...attendee, track: 'care-plans' }]);
      return fixture.backupRecord;
    });
    await expect(operations.apply(imports, fixture.backups, confirm)).rejects.toThrow('database changed');
    expect((await fixture.service.dashboard()).totals.roster).toBe(1);
    expect(await pendingOperation(fixture.paths)).toBeUndefined();
  });
  it('refuses to recover an unfinished operation against a different database directory', async () => {
    fixture.store.fail = true;
    await expect(operations.apply(imports, fixture.backups, confirm)).rejects.toThrow('Maintenance stopped');
    fixture.store.fail = false;
    vi.spyOn(fixture.blaze, 'dataDirectory').mockResolvedValue(fixture.backups);
    await expect(operations.apply(imports, fixture.backups, confirm)).rejects.toThrow('retry the same operation');
    expect(backup).toHaveBeenCalledTimes(1);
  });
  it('imports only selected lists and preserves actual attendance', async () => {
    const receipt = await arrive();
    await operations.apply(imports, fixture.backups, confirm);
    expect(backup).toHaveBeenCalledTimes(1);
    expect((await fixture.service.dashboard()).totals).toMatchObject({ roster: 2, staff: 1, checkedIn: 1 });
    expect(await fixture.service.receipt(receipt.receiptId)).toMatchObject({ receiptId: receipt.receiptId });
    expect(await pendingOperation(fixture.paths)).toBeUndefined();
  });
  it('resets before applying coordinated role changes and verifies both rosters', async () => {
    await arrive();
    const updated = { ...attendee, role: 'track-lead' as const };
    const request = { resetCheckins: true, rosters: { roster: [updated, lead], staff: [updated] } };
    const preview = await operations.preview(request);
    expect(preview.confirmation).toContain('RESET 1 CHECK-INS AND 1 EVENT RECORDS');
    await operations.apply(request, fixture.backups, confirm);
    expect((await fixture.service.dashboard()).totals).toMatchObject({ checkedIn: 0, roster: 2, staff: 1 });
    expect(await previewResetCheckins(fixture.service)).toMatchObject({ checkedIn: 0, practitioners: 0 });
    expect(await pendingOperation(fixture.paths)).toBeUndefined();
  });
  it('persists a failed reset, blocks startup and safely resumes deletion', async () => {
    await arrive();
    const transaction = fixture.store.transaction.bind(fixture.store);
    vi.spyOn(fixture.store, 'transaction').mockImplementationOnce(transaction).mockRejectedValueOnce(new Error('Synthetic delete failure'));
    await expect(operations.apply(reset, fixture.backups, confirm)).rejects.toThrow('Maintenance stopped during reset');
    expect(await pendingOperation(fixture.paths)).toMatchObject({ action: 'reset', stage: 'reset', backup: fixture.backupRecord.directory });
    expect(await previewResetCheckins(fixture.service)).toMatchObject({ checkedIn: 0, practitioners: 1 });
    await expect(assertMaintenanceComplete(fixture.paths)).rejects.toThrow('Unfinished reset');
    await expect(operations.start()).rejects.toThrow('Unfinished reset');
    expect(fixture.blaze.events).toEqual([]);
    await expect(operations.apply(imports, fixture.backups, confirm)).rejects.toThrow('retry the same operation');
    expect(backup).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
    await operations.apply(reset, fixture.backups, confirm);
    expect(await previewResetCheckins(fixture.service)).toMatchObject({ checkedIn: 0, practitioners: 0 });
    await assertMaintenanceComplete(fixture.paths);
  });
  it('keeps registration blocked when import fails after a successful reset', async () => {
    await arrive();
    const transaction = fixture.store.transaction.bind(fixture.store);
    vi.spyOn(fixture.store, 'transaction').mockImplementationOnce(transaction).mockImplementationOnce(transaction)
      .mockRejectedValueOnce(new Error('Synthetic import failure'));
    const request = { ...imports, resetCheckins: true };
    await expect(operations.apply(request, fixture.backups, confirm)).rejects.toThrow('Maintenance stopped during import');
    expect(await pendingOperation(fixture.paths)).toMatchObject({ action: 'reset-and-import', stage: 'import' });
    expect((await fixture.service.dashboard()).totals).toMatchObject({ checkedIn: 0, roster: 1 });
    await expect(operations.apply(reset, fixture.backups, confirm)).rejects.toThrow('retry the same operation');
    vi.restoreAllMocks();
    await operations.apply(request, fixture.backups, confirm);
    expect((await fixture.service.dashboard()).totals).toMatchObject({ checkedIn: 0, roster: 2 });
    expect(await pendingOperation(fixture.paths)).toBeUndefined();
  });
  it('does not treat a verification failure as successful maintenance', async () => {
    vi.spyOn(fixture.store, 'transaction').mockResolvedValueOnce(undefined);
    await expect(operations.apply(imports, fixture.backups, confirm)).rejects.toThrow('could not be verified');
    expect(await pendingOperation(fixture.paths)).toMatchObject({ stage: 'verification' });
  });
  it('refuses startup when the built UI is missing without starting Blaze', async () => {
    await expect(operations.start()).rejects.toThrow('built UI is unavailable');
    expect(fixture.blaze.events).toEqual([]);
  });
  it('allows a database-only restart to recover failed maintenance without opening registration', async () => {
    fixture.store.fail = true;
    await expect(operations.apply(imports, fixture.backups, confirm)).rejects.toThrow('Maintenance stopped');
    expect(await operations.start(true)).toBeUndefined();
    expect(fixture.blaze.events).toEqual(['start']);
    await expect(operations.start()).rejects.toThrow('Unfinished import');
  });
});

describe('one-shot operations status', () => {
  it('returns aggregate attendance without contacts or credentials', async () => {
    await arrive();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{"status":"ok"}'));
    const report = await operations.status();
    expect(report.ready).toBe(true);
    expect(report.attendance?.totals).toMatchObject({ roster: 1, staff: 1, checkedIn: 1 });
    const output = JSON.stringify(report);
    expect(output).not.toContain(attendee.email);
    expect(output).not.toContain(attendee.name);
    expect(output).not.toContain(fixture.environment.config.sessionSecret);
    expect(output).not.toContain(fixture.environment.config.staffPasswordHash);
    expect(output).not.toContain('"rows"');
  });
  it('reports an unhealthy container explicitly even if HTTP health would succeed', async () => {
    fixture.blaze.container.State.Health!.Status = 'starting';
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{"status":"ok"}'));
    const report = await operations.status();
    expect(report.ready).toBe(false);
    expect(report.blaze.health).toMatchObject({ ok: false, detail: expect.stringContaining('starting') });
    expect(report.errors.join(' ')).toContain('starting');
  });
});
