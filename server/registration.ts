import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import Fuse from 'fuse.js';
import type { AuditEvent, BundleEntry, List, Person, Practitioner, Task } from 'fhir/r4';
import { z } from 'zod';
import {
  CANONICAL, EXT, ID_SYSTEM, JOB_SYSTEM, LISTS, ROLE_SYSTEM, type Candidate, type Confirmation, type Dashboard,
  type Details, type Role, type Selection, detailsSchema, roleSchema
} from '../shared/domain.js';
import { AppError, FhirError, put, type FhirStore } from './fhir.js';
import { detailsOf, emailTask, emptyList, person, practitioner, refs, roleOf } from './model.js';

export const normalize = (value: string): string => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
export const letterCount = (value: string): number => (value.match(/\p{L}/gu) ?? []).length;

export class RegistrationService {
  constructor(public store: FhirStore, private secret: string) {}
  sign(id: string, purpose: string): string {
    const value = Buffer.from(JSON.stringify({ id, purpose, exp: Date.now() + 30 * 60000 })).toString('base64url');
    return `${value}.${createHmac('sha256', this.secret).update(value).digest('base64url')}`;
  }
  verify(token: string, purpose: string): string {
    const parts = token.split('.');
    if (parts.length !== 2) throw new AppError(400, 'Invalid selection. Search and select your entry again.');
    const [value, signature] = parts;
    if (!value || !signature) throw new AppError(400, 'Invalid selection. Search and select your entry again.');
    const expected = createHmac('sha256', this.secret).update(value).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new AppError(400, 'Invalid selection signature.');
    let data: unknown;
    try { data = JSON.parse(Buffer.from(value, 'base64url').toString()); }
    catch { throw new AppError(400, 'Invalid selection data.'); }
    const result = z.object({ id: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/), purpose: z.literal(purpose), exp: z.number().min(Date.now()) }).safeParse(data);
    if (!result.success) throw new AppError(400, 'Selection expired. Search and select your entry again.');
    return result.data.id;
  }
  async list(id: string): Promise<List> {
    const lists = await this.store.search<List>('List', `identifier=${encodeURIComponent(`${CANONICAL}/identifier/list|${id}`)}`);
    if (lists.length !== 1) throw new AppError(503, 'Event Lists are missing or duplicated. Restart the backend or ask staff to repair them.');
    return lists[0]!;
  }
  async initialize(): Promise<void> {
    for (const id of Object.values(LISTS)) {
      if (!(await this.store.search<List>('List', `identifier=${encodeURIComponent(`${CANONICAL}/identifier/list|${id}`)}`)).length) {
        try { await this.store.transaction([put(emptyList(id), true)]); }
        catch (error) { if (!(error instanceof FhirError && error.status === 409)) throw error; }
      }
    }
  }
  async expected(): Promise<Person[]> {
    const [roster, staff, people] = await Promise.all([
      this.list(LISTS.roster), this.list(LISTS.staff), this.store.search<Person>('Person', '_count=200')
    ]);
    const references = [...new Set([roster, staff].flatMap(refs))];
    const byId = new Map(people.map(p => [p.id, p]));
    const result: Person[] = [];
    for (const reference of references) {
      if (!reference.startsWith('Person/')) throw new AppError(503, 'Invalid reference in roster.');
      const resource = byId.get(reference.slice(7));
      if (!resource) throw new AppError(503, 'Roster contains a missing Person; staff must repair the import.');
      result.push(resource);
    }
    return result;
  }
  async matches(name: string, affiliation = '', staff = false): Promise<Candidate[]> {
    if (!staff && letterCount(name) < 5) return [];
    const people = (await this.expected()).map(resource => ({
      id: resource.id!, ...detailsOf(resource),
      normalizedName: normalize(detailsOf(resource).name),
      normalizedAffiliation: normalize(detailsOf(resource).affiliation)
    }));
    const query = normalize(name);
    const fuse = new Fuse(people, { keys: ['normalizedName'], threshold: 0.42, ignoreLocation: true, includeScore: true, minMatchCharLength: 2 });
    let matches = query ? fuse.search(query).map(match => match.item) : staff ? people : [];
    if (affiliation.trim()) {
      const allowed = new Set(new Fuse(people, { keys: ['normalizedAffiliation'], threshold: 0.38, ignoreLocation: true })
        .search(normalize(affiliation)).map(match => match.item.id));
      matches = matches.filter(item => allowed.has(item.id));
    }
    return matches.map(item => ({ token: this.sign(item.id, 'candidate'), name: item.name, affiliation: item.affiliation }));
  }
  async select(token: string): Promise<Selection> {
    const id = this.verify(token, 'candidate');
    const expected = await this.expected();
    const resource = expected.find(item => item.id === id);
    if (!resource) throw new AppError(404, 'This entry is no longer in either roster. Please contact staff.');
    return { ...detailsOf(resource), selection: this.sign(id, 'checkin') };
  }
  async expectedRole(id: string): Promise<Role> {
    const lists = await Promise.all([this.list(LISTS.roster), this.list(LISTS.staff)]);
    const roles = new Set(lists.flatMap(list => (list.entry ?? [])
      .filter(entry => !entry.deleted && entry.item.reference === `Person/${id}`)
      .map(entry => roleSchema.parse(entry.flag?.coding?.find(code => code.system === ROLE_SYSTEM)?.code))));
    if (roles.size !== 1) throw new AppError(409, 'Roster role is missing or conflicting. Ask staff to correct the import.');
    return [...roles][0]!;
  }
  async retry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt++) {
      try { return await operation(); }
      catch (error) {
        if (!(error instanceof AppError && error.status === 409) || attempt === 3) throw error;
        await new Promise(resolve => setTimeout(resolve, 20 * (attempt + 1)));
      }
    }
    throw new AppError(409, 'Concurrent updates could not be resolved. Please retry.');
  }
  async checkin(details: Details, token: string): Promise<Confirmation> {
    const id = this.verify(token, 'checkin');
    return this.retry(async () => {
      if (!(await this.expected()).some(item => item.id === id)) throw new AppError(404, 'Roster entry no longer exists.');
      return this.commit(id, details, await this.expectedRole(id));
    });
  }
  async manual(details: Details, role: Role, reason: string, requestId: string, staff: string): Promise<Confirmation> {
    const stableIdentifier = `manual-${createHash('sha256').update(requestId).digest('hex').slice(0, 32)}`;
    return this.retry(async () => {
      const people = await this.store.search<Person>('Person', '_count=200');
      const existing = people.find(p => p.identifier?.some(i => i.system === ID_SYSTEM && i.value === stableIdentifier));
      const id = existing?.id ?? randomUUID();
      if (people.some(item => item.id !== id && (
        detailsOf(item).email.toLowerCase() === details.email.toLowerCase() ||
        (normalize(detailsOf(item).name) === normalize(details.name) && normalize(detailsOf(item).affiliation) === normalize(details.affiliation))
      ))) throw new AppError(409, 'A possible existing participant was found. Use staff lookup and resolve the duplicate before manual registration.');
      return this.commit(id, details, role, { staff, reason, stableIdentifier });
    });
  }
  private async commit(id: string, details: Details, role: Role, manual?: { staff: string; reason: string; stableIdentifier: string }): Promise<Confirmation> {
    const list = await this.list(LISTS.checkins);
    const currentPerson = await this.store.read<Person>('Person', id);
    const linked = currentPerson?.link?.find(link => link.target.reference?.startsWith('Practitioner/'))?.target.reference;
    if (linked && refs(list).includes(linked)) {
      const current = await this.store.read<Practitioner>('Practitioner', linked.slice(13));
      const task = (await this.store.search<Task>('Task', `focus=${encodeURIComponent(linked)}&code=${encodeURIComponent(`${JOB_SYSTEM}|confirmation-email`)}`))[0];
      if (!current || !task) throw new AppError(503, 'Existing check-in is incomplete; contact staff.');
      return { name: detailsOf(current).name, alreadyCheckedIn: true, emailStatus: task.status };
    }
    if (!manual && !currentPerson) throw new AppError(404, 'Participant was not found.');
    const stableIdentifier = currentPerson?.identifier?.find(i => i.system === ID_SYSTEM)?.value ?? manual?.stableIdentifier;
    if (!stableIdentifier) throw new AppError(503, 'Participant has no event identifier.');
    const practitionerId = randomUUID();
    const checkedIn = practitioner(practitionerId, detailsSchema.parse(details), role, undefined, stableIdentifier);
    const expected = person(id, details, currentPerson, stableIdentifier);
    expected.link = [{ target: { reference: `Practitioner/${practitionerId}` } }];
    const now = new Date().toISOString();
    list.date = now;
    list.entry = [...(list.entry ?? []), {
      item: { reference: `Practitioner/${practitionerId}` }, date: now,
      ...(manual ? { extension: [{ url: EXT.manual, valueBoolean: true }] } : {})
    }];
    const entries = [put(expected, !currentPerson), put(checkedIn, true), put(list), put(emailTask(practitionerId, stableIdentifier), true)];
    if (manual) entries.push(put(this.audit(id, manual.staff, manual.reason, 'Manual registration'), true));
    await this.store.transaction(entries);
    return { name: details.name, alreadyCheckedIn: false, emailStatus: 'ready' };
  }
  audit(id: string, staff: string, reason: string, action: string): AuditEvent {
    return {
      resourceType: 'AuditEvent', id: randomUUID(),
      type: { system: 'http://terminology.hl7.org/CodeSystem/audit-event-type', code: 'rest', display: 'RESTful Operation' },
      action: 'U', recorded: new Date().toISOString(), outcome: '0',
      agent: [{ requestor: true, who: { identifier: { system: `${CANONICAL}/staff`, value: staff } } }],
      source: { observer: { display: 'Hackathon registration backend' } },
      entity: [{ what: { reference: `Person/${id}` }, description: `${action}: ${reason}` }]
    };
  }
  async correct(id: string, details: Details, role: Role, reason: string, staff: string): Promise<void> {
    await this.retry(async () => {
      const expected = await this.store.read<Person>('Person', id);
      if (!expected) throw new AppError(404, 'Participant not found.');
      const link = expected.link?.find(item => item.target.reference?.startsWith('Practitioner/'))?.target.reference;
      const current = link ? await this.store.read<Practitioner>('Practitioner', link.slice(13)) : undefined;
      const entries: BundleEntry[] = [put(person(id, details, expected)), put(this.audit(id, staff, reason, 'Correction'), true)];
      if (current) entries.push(put(practitioner(current.id!, details, role, current)));
      for (const listId of [LISTS.roster, LISTS.staff]) {
        const list = await this.list(listId);
        let changed = false;
        for (const entry of list.entry ?? []) {
          if (!entry.deleted && entry.item.reference === `Person/${id}`) {
            entry.flag = { coding: [{ system: ROLE_SYSTEM, code: role }] }; changed = true;
          }
        }
        if (changed) { list.date = new Date().toISOString(); entries.push(put(list)); }
      }
      await this.store.transaction(entries);
    });
  }
  async dashboard(): Promise<Dashboard> {
    const [roster, staff, checkins] = await Promise.all(Object.values(LISTS).map(id => this.list(id)));
    if (!roster || !staff || !checkins) throw new AppError(503, 'Event Lists are unavailable.');
    const tasks = await this.store.search<Task>('Task', `code=${encodeURIComponent(`${CANONICAL}/CodeSystem/workflow|confirmation-email`)}&_count=200`);
    const people = await this.store.search<Person>('Person', '_count=200');
    const practitioners = await this.store.search<Practitioner>('Practitioner', '_count=200');
    const rows: Dashboard['rows'] = [];
    for (const ref of refs(checkins)) {
      if (!ref.startsWith('Practitioner/')) throw new AppError(503, 'Check-in List contains an invalid reference.');
      const item = practitioners.find(p => p.id === ref.slice(13));
      if (!item?.id) throw new AppError(503, 'Check-in refers to a missing Practitioner.');
      const entry = checkins.entry?.find(e => !e.deleted && e.item.reference === ref);
      const task = tasks.find(t => t.focus?.reference === ref);
      const expected = people.find(p => p.link?.some(link => link.target.reference === ref));
      if (!expected?.id) throw new AppError(503, 'Checked-in Practitioner has no linked Person.');
      rows.push({
        ...detailsOf(item), id: item.id, personId: expected.id, role: roleOf(item), arrived: entry?.date ?? '',
        manual: entry?.extension?.some(e => e.url === EXT.manual && e.valueBoolean) ?? false,
        taskId: task?.id ?? '', emailStatus: task?.status ?? 'missing', emailReason: task?.statusReason?.text ?? ''
      });
    }
    const missing = async (list: List): Promise<number> => {
      let count = 0;
      for (const ref of refs(list)) {
        const p = people.find(person => person.id === ref.slice(7));
        if (!p) throw new AppError(503, 'Roster refers to a missing Person.');
        const links = p.link?.map(link => link.target.reference) ?? [];
        if (!rows.some(row => links.includes(`Practitioner/${row.id}`))) count++;
      }
      return count;
    };
    const byTrack: Record<string, number> = {};
    for (const row of rows) byTrack[row.track || 'unselected'] = (byTrack[row.track || 'unselected'] ?? 0) + 1;
    return {
      totals: {
        roster: refs(roster).length, staff: refs(staff).length, checkedIn: rows.length,
        rosterMissing: await missing(roster), staffMissing: await missing(staff),
        manual: rows.filter(r => r.manual).length, attendees: rows.filter(r => r.role === 'attendee').length,
        trackLeads: rows.filter(r => r.role === 'track-lead').length
      },
      tracks: byTrack, rows: rows.sort((a, b) => b.arrived.localeCompare(a.arrived))
    };
  }
}
