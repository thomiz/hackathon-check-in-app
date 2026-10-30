import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseOperationsArgs, readRosterInputs, runOperations } from '../scripts/ops';
import { errorMessage } from '../scripts/ops-core';
import { parseRoster } from '../server/imports';
import { operationsFixture, type OperationsFixture } from './ops-fixtures';

let fixture: OperationsFixture;
beforeEach(async () => { fixture = await operationsFixture(); });
afterEach(async () => { vi.restoreAllMocks(); await rm(fixture.base, { recursive: true, force: true }); });

describe('operations command line', () => {
  it('shows help without .env, Docker, a database or installed deployment configuration', async () => {
    const print = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(await runOperations(['help'])).toBe(0);
    expect(print).toHaveBeenCalledWith(expect.stringContaining('PREVIEWS'));
  });
  it('makes import and reset previews by default', () => {
    expect(parseOperationsArgs(['reset'])).toMatchObject({ command: 'reset', options: {} });
    expect(parseOperationsArgs(['import', '--attendees', 'reviewed.csv']).options.apply).toBeUndefined();
    expect(parseOperationsArgs(['reset', '--dry-run']).options['dry-run']).toBe(true);
  });
  it.each([
    ['import'],
    ['import', '--staff', 'staff.csv', '--agenda', 'agenda.md'],
    ['reset', '--apply'],
    ['reset', '--apply', '--dry-run', '--backup-dir', 'private'],
    ['reset', '--confirm', 'anything'],
    ['reset', '--confirm', ''],
    ['import', '--attendees', 'first.csv', '--attendees', 'second.csv'],
    ['import', '--attendees', 'file.csv', '--backup-dir', 'private'],
    ['start', '--attendees', 'file.csv'],
    ['backup'],
    ['backup', '--backup-dir', ''],
    ['status', 'stop'],
    ['unknown'],
    ['reset', '--yes']
  ])('rejects invalid or ambiguous arguments: %j', (...args) => {
    expect(() => parseOperationsArgs(args)).toThrow();
  });
  it('accepts combined imports and explicit reset without splitting Windows paths', () => {
    const { options } = parseOperationsArgs([
      'import', '--attendees', 'D:\\private data\\attendees.csv', '--staff', 'D:\\private data\\staff.csv',
      '--reset-checkins', '--apply', '--backup-dir', 'D:\\private backups', '--confirm', 'EXACT PHRASE'
    ]);
    expect(options.attendees).toBe('D:\\private data\\attendees.csv');
    expect(options['reset-checkins']).toBe(true);
    expect(options.confirm).toBe('EXACT PHRASE');
  });
  it('reads complete CSVs without generating or changing seed files and warns about Git paths', async () => {
    const file = join(fixture.root, 'reviewed.csv');
    await writeFile(file, 'id,name,email,affiliation,track,role\nalice,Alice Example,alice@example.invalid,Synthetic,smart,attendee\n');
    const { options } = parseOperationsArgs(['import', '--attendees', file]);
    const result = await readRosterInputs(options, fixture.root, fixture.root);
    expect(result.rosters.roster).toHaveLength(1);
    expect(result.warnings[0]).toContain('inside the Git checkout');
    expect(result.warnings.join(' ')).not.toContain('alice@example.invalid');
  });
  it('reports agenda review warnings without logging personal contacts', async () => {
    const file = join(fixture.base, 'agenda.md');
    await writeFile(file, '#### Track leads and partners\n\n| Track | Name | Contact | Affiliate |\n| --- | --- | --- | --- |\n' +
      '| SMART on FHIR | Synthetic Lead + others | [wrong@example.invalid](mailto:lead@example.invalid) | Synthetic |\n');
    const { options } = parseOperationsArgs(['import', '--agenda', file]);
    const result = await readRosterInputs(options, fixture.root, fixture.root);
    expect(result.rosters.staff).toHaveLength(1);
    expect(result.agendaWarnings).toBe(2);
    expect(result.warnings.join(' ')).not.toContain('lead@example.invalid');
    expect(result.warnings.join(' ')).not.toContain('Synthetic Lead');
  });
  it('redacts invalid row values from command-line error output', () => {
    try { parseRoster('name,email,affiliation,track,role\nAlice Example,alice@example.invalid,Synthetic,secret-personal-value,attendee'); }
    catch (error) {
      expect(errorMessage(error)).toContain('Invalid input');
      expect(errorMessage(error)).not.toContain('secret-personal-value');
    }
    try { parseRoster('name,email\n"secret-personal-value'); }
    catch (error) {
      expect(errorMessage(error)).toContain('CSV parsing failed');
      expect(errorMessage(error)).not.toContain('secret-personal-value');
    }
  });
});
