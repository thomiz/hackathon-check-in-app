import { parse } from 'csv-parse/sync';
import type { BundleEntry, List, Person, Practitioner } from 'fhir/r4';
import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { ID_SYSTEM, LISTS, ROLE_SYSTEM, tracks, type RosterSource } from '../shared/domain.js';
import { AppError, put, resourceFingerprint } from './fhir.js';
import { detailsOf, person, refs, roleOf } from './model.js';
import type { RegistrationService } from './registration.js';
import { GENERATED_ID_PREFIX, rowSchema, sameParticipant, stableRosterId, type ImportRow } from './roster.js';

export type { ImportRow } from './roster.js';
export type { RosterSource } from '../shared/domain.js';
export type RosterUpdates = Partial<Record<RosterSource, ImportRow[]>>;
export interface ImportOptions {
  /** Remove people who are in the selected list but not in the supplied rows (default true). */
  removeMissing?: boolean;
}
export interface RosterChanges { added: string[]; updated: string[]; removed: string[] }
export interface RosterPreview {
  source: RosterSource;
  total: number;
  added: number;
  removed: number;
  updated: number;
  unchanged: number;
  confirmedDetailsPreserved: number;
  /** Display names per change, for the authenticated staff preview. Not printed by the CLI. */
  changes: RosterChanges;
}

const inputRowSchema = rowSchema.extend({ id: rowSchema.shape.id.or(z.literal('')).optional() }).transform(row => ({
  ...row,
  id: row.id || stableRosterId(row.email)
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
const sources: RosterSource[] = ['roster', 'staff'];
const sameDetails = (a: ImportRow | Person, b: ImportRow): boolean => {
  const details = 'resourceType' in a ? detailsOf(a) : a;
  return details.name === b.name && details.email === b.email && details.affiliation === b.affiliation && details.track === b.track;
};
const stableIdOf = (p: Person) => p.identifier?.find(i => i.system === ID_SYSTEM)?.value;
const flagOf = (entry: NonNullable<List['entry']>[number]) => entry.flag?.coding?.find(c => c.system === ROLE_SYSTEM)?.code;

/**
 * Rows without an explicit ID get an email-based ID. Such a row adopts the ID of the one existing
 * participant with the same email (or the same name and affiliation, e.g. after an email correction),
 * or of the one explicitly identified row for that person in the other supplied CSV. This keeps
 * identities from older name-based IDs, the agenda staff roster and dashboard additions.
 */
function adoptExistingIds(rowsBySource: Map<RosterSource, ImportRow[]>, people: Person[]): void {
  const explicitRows = [...rowsBySource.values()].flat().filter(row => !row.id.startsWith(GENERATED_ID_PREFIX));
  for (const rows of rowsBySource.values()) {
    for (const row of rows) {
      if (!row.id.startsWith(GENERATED_ID_PREFIX) || people.some(p => stableIdOf(p) === row.id)) continue;
      const known = [...new Set(people.filter(p => sameParticipant(detailsOf(p), row)).map(stableIdOf).filter((id): id is string => !!id))];
      const supplied = [...new Set(explicitRows.filter(other => sameParticipant(other, row)).map(other => other.id))];
      const candidates = [...new Set([...known, ...supplied])];
      if (candidates.length === 1) row.id = candidates[0]!;
    }
  }
}

async function planRosters(service: RegistrationService, updates: RosterUpdates, afterReset = false, options: ImportOptions = {}) {
  const removeMissing = options.removeMissing ?? true;
  const selected = sources.filter(source => updates[source] !== undefined);
  if (!selected.length) throw new AppError(400, 'Select an attendee and/or staff roster to import.');
  const rowsBySource = new Map<RosterSource, ImportRow[]>();
  for (const source of selected) rowsBySource.set(source, z.array(rowSchema).min(1).max(500).parse(updates[source]));
  const [roster, staff, all, practitioners] = await Promise.all([
    service.list(LISTS.roster), service.list(LISTS.staff),
    service.store.search<Person>('Person', '_count=200'), service.store.search<Practitioner>('Practitioner', '_count=200')
  ]);
  adoptExistingIds(rowsBySource, all);
  const combined = new Map<string, ImportRow>();
  for (const rows of rowsBySource.values()) {
    const ids = new Set<string>();
    for (const row of rows) {
      if (ids.has(row.id)) throw new AppError(400, `Duplicate participant ID ${row.id} in CSV.`);
      ids.add(row.id);
      const other = combined.get(row.id);
      if (other && other.role !== row.role) throw new AppError(409, `Conflicting roles for ID ${row.id} in the supplied rosters.`);
      if (other && !sameDetails(other, row)) throw new AppError(409, `Conflicting details for ID ${row.id}. Supply matching rows in both rosters.`);
      combined.set(row.id, row);
    }
  }
  const fingerprint = resourceFingerprint([roster, staff, ...all, ...practitioners]);
  const lists = { roster, staff };
  const resetTargets = new Set(afterReset ? practitioners
    .filter(p => p.identifier?.some(i => i.system === ID_SYSTEM)).map(p => `Practitioner/${p.id}`) : []);
  const entries: BundleEntry[] = [];
  const people = new Map<string, { id: string; existing?: Person }>();
  const rows = [...combined.values()];
  for (const row of rows) {
    const matches = all.filter(p => stableIdOf(p) === row.id);
    if (matches.length > 1) throw new AppError(409, `Ambiguous database participant ID ${row.id}.`);
    const existing = matches[0] ? structuredClone(matches[0]) : undefined;
    if (existing?.link && afterReset) existing.link = existing.link.filter(link => !resetTargets.has(link.target.reference ?? ''));
    const id = existing?.id ?? randomUUID();
    people.set(row.id, { id, existing });
    for (const p of all) {
      if (p.id !== id && sameParticipant(detailsOf(p), row)) {
        throw new AppError(409, `Ambiguous duplicate for ID ${row.id}. Reconcile stable IDs before importing.`);
      }
    }
    if (rows.some(other => other.id !== row.id && sameParticipant(other, row))) {
      throw new AppError(400, `Ambiguous duplicate within CSV for ID ${row.id}.`);
    }
    const checkedInReference = existing?.link?.find(link => link.target.reference?.startsWith('Practitioner/'))?.target.reference;
    if (checkedInReference) {
      const checkedIn = practitioners.find(p => `Practitioner/${p.id}` === checkedInReference);
      if (!checkedIn || roleOf(checkedIn) !== row.role) throw new AppError(409, `Confirmed role conflict for ID ${row.id}. Use an audited staff correction first.`);
    }
    // Reimports must not overwrite confirmed details or track changes made at check-in.
    if (!existing?.link?.length) entries.push(put(person(id, row, existing, row.id), !existing));
  }
  const nameOf = (reference: string) => {
    const resource = all.find(p => `Person/${p.id}` === reference);
    return resource ? detailsOf(resource).name : reference;
  };
  const previews: RosterPreview[] = [];
  for (const source of selected) {
    const list = lists[source];
    const otherSource = source === 'roster' ? 'staff' : 'roster';
    const otherRows = rowsBySource.get(otherSource);
    const previous = list.entry?.filter(e => !e.deleted) ?? [];
    const incoming = rowsBySource.get(source)!;
    const nextReferences = new Set(incoming.map(row => `Person/${people.get(row.id)!.id}`));
    const changes: RosterChanges = { added: [], updated: [], removed: [] };
    let unchanged = 0, confirmedDetailsPreserved = 0;
    for (const row of incoming) {
      const { id, existing } = people.get(row.id)!;
      // The other list's role comes from its supplied rows, or from its entries where those are kept.
      const suppliedRole = otherRows?.find(r => r.id === row.id)?.role;
      const keptEntry = !otherRows || !removeMissing
        ? lists[otherSource].entry?.find(e => !e.deleted && e.item.reference === `Person/${id}`) : undefined;
      const otherRole = suppliedRole ?? (keptEntry ? flagOf(keptEntry) : undefined);
      if (otherRole !== undefined && otherRole !== row.role) {
        throw new AppError(409, `Conflicting roles for ID ${row.id}. Resolve the organizer-reviewed role first.`);
      }
      const old = previous.find(e => e.item.reference === `Person/${id}`);
      if (existing?.link?.length) confirmedDetailsPreserved++;
      if (!old) changes.added.push(row.name);
      else if ((!existing?.link?.length && existing && !sameDetails(existing, row)) || flagOf(old) !== row.role) changes.updated.push(row.name);
      else unchanged++;
    }
    const kept = previous.filter(e => !nextReferences.has(e.item.reference ?? ''));
    if (removeMissing) changes.removed.push(...kept.map(e => nameOf(e.item.reference ?? '')));
    previews.push({
      source, total: incoming.length, added: changes.added.length, updated: changes.updated.length,
      removed: changes.removed.length, unchanged, confirmedDetailsPreserved, changes
    });
    list.entry = [
      ...(removeMissing ? [] : kept),
      ...incoming.map(row => ({
        item: { reference: `Person/${people.get(row.id)!.id}` }, flag: { coding: [{ system: ROLE_SYSTEM, code: row.role }] }
      }))
    ];
    list.date = new Date().toISOString();
    entries.push(put(list));
  }
  // Identifies what a preview showed (inputs, mode, additions and removals); check-ins elsewhere do not change it.
  const token = createHash('sha256').update(JSON.stringify([
    removeMissing, selected.map(source => [source, rowsBySource.get(source)]),
    previews.map(p => [p.source, p.changes.added, p.changes.removed])
  ])).digest('hex');
  return { entries, previews, fingerprint, token };
}

export async function previewRosters(service: RegistrationService, updates: RosterUpdates, afterReset = false, options: ImportOptions = {}) {
  const { previews, fingerprint, token } = await planRosters(service, updates, afterReset, options);
  return { rosters: previews, fingerprint, token };
}

/**
 * Applies the import. With expectedToken, refuses if the additions/removals no longer match
 * what the caller previewed (for example after another import changed the list).
 */
export async function importRosters(service: RegistrationService, updates: RosterUpdates, options: ImportOptions & { expectedToken?: string } = {}): Promise<RosterPreview[]> {
  return service.retry(async () => {
    const { entries, previews, token } = await planRosters(service, updates, false, options);
    if (options.expectedToken !== undefined && options.expectedToken !== token) {
      throw new AppError(409, 'The roster changed since the preview. Preview the import again before applying it.');
    }
    await service.store.transaction(entries);
    return previews;
  });
}

export async function verifyRosters(service: RegistrationService, updates: RosterUpdates, options: ImportOptions = {}): Promise<void> {
  const removeMissing = options.removeMissing ?? true;
  const people = await service.store.search<Person>('Person', '_count=200');
  const rowsBySource = new Map(sources.filter(source => updates[source]).map(source => [source, structuredClone(updates[source]!)]));
  adoptExistingIds(rowsBySource, people);
  for (const [source, rows] of rowsBySource) {
    const list = await service.list(LISTS[source]);
    const entries = list.entry?.filter(e => !e.deleted) ?? [];
    if ((removeMissing && entries.length !== rows.length) || rows.some(row => {
      const match = people.find(p => stableIdOf(p) === row.id);
      return !match?.id || !entries.some(e => e.item.reference === `Person/${match.id}` && flagOf(e) === row.role);
    })) throw new AppError(503, `The ${source} import could not be verified. Keep the app stopped.`);
  }
}

export async function importRoster(service: RegistrationService, source: RosterSource, rows: ImportRow[], options: ImportOptions = {}): Promise<number> {
  const [preview] = await importRosters(service, { [source]: rows }, options);
  return preview!.total;
}
