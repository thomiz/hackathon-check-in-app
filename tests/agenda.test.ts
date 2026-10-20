import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { agendaRoster, rosterCsv } from '../server/agenda';
import { parseRoster } from '../server/imports';
import { preloadStaff } from '../server/preload';
import { RegistrationService } from '../server/registration';
import { MemoryStore } from './memory-store';
import type { Bundle, Person } from 'fhir/r4';
import { detailsOf } from '../server/model';

const table = (rows: string) => `#### Track leads and partners

| Track | Name | Contact | Affiliate |
|-------|------|---------|-----------|
${rows}

#### Demo summary
`;
describe('master agenda staff generation', () => {
  it('maps roles/tracks and handles grouped entries and contact inconsistencies explicitly', () => {
    const { rows, warnings } = agendaRoster(table(
      '| IHE document sharing | Example Lead + 4 team members | [lead@example.invalid](mailto:lead@example.invalid) | Example |\n' +
      '| Partner | Example Partner | [display@example.invalid](mailto:target@example.invalid>) | Partner |'
    ));
    expect(rows[0]).toMatchObject({ name: 'Example Lead', role: 'track-lead', track: 'ihe-mhd' });
    expect(rows[1]).toMatchObject({ email: 'target@example.invalid', role: 'attendee', track: '' });
    expect(warnings).toHaveLength(2);
    expect(parseRoster(rosterCsv(rows))).toEqual(rows);
  });
  it('keeps participant identity stable when email changes', () => {
    const first = agendaRoster(table('| SMART on FHIR | Example Lead | [one@example.invalid](mailto:one@example.invalid) | Example |'));
    const next = agendaRoster(table('| SMART on FHIR | Example Lead | [two@example.invalid](mailto:two@example.invalid) | Example |'));
    expect(first.rows[0]?.id).toBe(next.rows[0]?.id);
  });
  it('fails clearly for unknown tracks, missing section and invalid contact', () => {
    expect(() => agendaRoster('no table')).toThrow('section');
    expect(() => agendaRoster(table('| Unknown | Name | [a@example.invalid](mailto:a@example.invalid) | Org |'))).toThrow('Unknown agenda track');
    expect(() => agendaRoster(table('| Partner | Name | no email | Org |'))).toThrow('mailto');
  });
  it('bundles matching CSV and Person instances, preloads once and records no attendance', async () => {
    const rows = parseRoster(await readFile(join('seed', 'staff.csv'), 'utf8'));
    const bundle = JSON.parse(await readFile(join('seed', 'staff-persons.json'), 'utf8')) as Bundle<Person>;
    expect(bundle.entry).toHaveLength(rows.length);
    for (const row of rows) {
      const p = bundle.entry?.find(entry => entry.resource?.id === row.id)?.resource;
      expect(p).toBeDefined();
      expect(detailsOf(p!)).toEqual({ name: row.name, email: row.email, affiliation: row.affiliation, track: row.track });
    }
    const store = new MemoryStore();
    const service = new RegistrationService(store, 'synthetic-preload-test-only-secret');
    await service.initialize();
    expect(await preloadStaff(service)).toBe(rows.length);
    expect(await preloadStaff(service)).toBe(0);
    expect((await service.dashboard()).totals).toMatchObject({ staff: rows.length, checkedIn: 0 });
    expect(await store.search('Practitioner', '')).toHaveLength(0);
  });
});
