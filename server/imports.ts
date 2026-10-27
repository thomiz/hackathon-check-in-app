import { parse } from 'csv-parse/sync';
import type { Person } from 'fhir/r4';
import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { detailsSchema, ID_SYSTEM, LISTS, ROLE_SYSTEM, roleSchema, tracks } from '../shared/domain.js';
import { AppError, put } from './fhir.js';
import { detailsOf, person, roleOf } from './model.js';
import { normalize, type RegistrationService } from './registration.js';

const rowSchema = detailsSchema.extend({ id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/), role: roleSchema });
export type ImportRow = z.infer<typeof rowSchema>;

const inputRowSchema = rowSchema.extend({ id: rowSchema.shape.id.or(z.literal('')).optional() }).transform(row => ({
  ...row,
  id: row.id || `roster-${createHash('sha256').update(JSON.stringify([normalize(row.name), normalize(row.affiliation)])).digest('hex').slice(0, 32)}`
}));
const exportTrackCodes = new Map<string, string>([
  ...tracks.map(({ label, code }): [string, string] => [label, code]),
  ['Medication Definition on FHIR', 'medication-definition'],
  ['Document sharing for IHE MHD', 'ihe-mhd'],
  ['Digital home monitoring plans and observations', 'care-plans']
]);

export function parseRoster(csv: string): ImportRow[] {
  const records: unknown = parse(csv, { columns: true, skip_empty_lines: true, bom: true, trim: true });
  const rows = z.array(z.record(z.string())).min(1).max(500).parse(records);
  return rows.map(row => inputRowSchema.parse('Your name' in row ? {
    id: row.id,
    name: row['Your name'],
    email: row['E-postadresse'],
    affiliation: row['Your affiliation/employer'],
    track: exportTrackCodes.get(row['What primary track do you want to attend?'] ?? '') ?? row['What primary track do you want to attend?'],
    role: row.role ?? 'attendee'
  } : row));
}
export async function importRoster(service: RegistrationService, source: 'roster' | 'staff', rows: ImportRow[]): Promise<number> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) throw new AppError(400, `Duplicate participant ID ${row.id} in CSV.`);
    ids.add(row.id);
  }
  return service.retry(async () => {
    const list = await service.list(LISTS[source]);
    const otherList = await service.list(LISTS[source === 'staff' ? 'roster' : 'staff']);
    const all = await service.store.search<Person>('Person', '_count=200');
    const entries = [];
    list.entry = [];
    for (const row of rows) {
      const existing = all.find(p => p.identifier?.some(i => i.system === ID_SYSTEM && i.value === row.id));
      const resourceId = existing?.id ?? randomUUID();
      for (const p of all) {
        const details = detailsOf(p);
        if (p.id !== resourceId && (details.email.toLowerCase() === row.email.toLowerCase() ||
          (normalize(details.name) === normalize(row.name) && normalize(details.affiliation) === normalize(row.affiliation)))) {
          throw new AppError(409, `Ambiguous duplicate for ID ${row.id}. Reconcile stable IDs before importing.`);
        }
      }
      if (rows.some(other => other.id !== row.id && (other.email.toLowerCase() === row.email.toLowerCase() ||
        (normalize(other.name) === normalize(row.name) && normalize(other.affiliation) === normalize(row.affiliation))))) {
        throw new AppError(400, `Ambiguous duplicate within CSV for ID ${row.id}.`);
      }
      const other = otherList.entry?.find(e => !e.deleted && e.item.reference === `Person/${resourceId}`);
      if (other && other.flag?.coding?.find(c => c.system === ROLE_SYSTEM)?.code !== row.role) {
        throw new AppError(409, `Conflicting roles for ID ${row.id}. Resolve the organizer-reviewed role first.`);
      }
      const checkedInReference = existing?.link?.find(link => link.target.reference?.startsWith('Practitioner/'))?.target.reference;
      if (checkedInReference) {
        const checkedIn = await service.store.read<import('fhir/r4').Practitioner>('Practitioner', checkedInReference.slice(13));
        if (!checkedIn || roleOf(checkedIn) !== row.role) throw new AppError(409, `Confirmed role conflict for ID ${row.id}. Use an audited staff correction first.`);
      }
      // Reimports must not overwrite confirmed details or track changes made at check-in.
      if (!existing?.link?.length) entries.push(put(person(resourceId, row, existing, row.id), !existing));
      const entry = { item: { reference: `Person/${resourceId}` }, flag: { coding: [{ system: ROLE_SYSTEM, code: row.role }] } };
      list.entry.push(entry);
    }
    list.date = new Date().toISOString();
    entries.push(put(list));
    await service.store.transaction(entries);
    return rows.length;
  });
}
