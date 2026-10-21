import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Person, Practitioner } from 'fhir/r4';
import { MemoryStore } from './memory-store';
import { RegistrationService, letterCount } from '../server/registration';
import { importRoster, parseRoster, type ImportRow } from '../server/imports';
import { detailsOf } from '../server/model';
import { put } from '../server/fhir';
import { LISTS } from '../shared/domain';

const alice: ImportRow = { id: 'synthetic-alice', name: 'Alice Example', email: 'alice@example.invalid', affiliation: 'Example Labs', track: 'smart', role: 'attendee' };
const bob: ImportRow = { id: 'synthetic-bob', name: 'Alicia Example', email: 'alicia@example.invalid', affiliation: 'Another Group', track: 'fhir-101', role: 'track-lead' };
let store: MemoryStore;
let service: RegistrationService;
async function select(name = 'Alice') {
  const matches = await service.matches(name);
  const match = matches[0];
  if (!match) throw new Error('Missing test match');
  return service.select(match.token);
}
async function checkin() {
  const selected = await select();
  return service.checkin(selected, selected.selection);
}

beforeEach(async () => {
  store = new MemoryStore(); service = new RegistrationService(store, 'test-only-session-secret-over-32-characters');
  await service.initialize();
  await importRoster(service, 'roster', [alice]);
});
describe('rosters and matching', () => {
  it('imports Persons only and no check-ins or Practitioners', async () => {
    expect(await store.search('Practitioner', '')).toHaveLength(0);
    expect((await service.dashboard()).totals).toMatchObject({ roster: 1, checkedIn: 0, rosterMissing: 1 });
  });
  it('deduplicates both rosters and preserves stable identity on repeat import', async () => {
    await importRoster(service, 'staff', [alice]);
    await importRoster(service, 'roster', [alice]);
    expect(await store.search('Person', '')).toHaveLength(1);
    expect(await service.matches('Alice')).toHaveLength(1);
    expect((await service.dashboard()).totals.staff).toBe(1);
  });
  it('requires five letters, excludes punctuation and supports near partial names', async () => {
    expect(letterCount('A l-i.c')).toBe(4);
    expect(await service.matches('Alic')).toEqual([]);
    expect(await service.matches('A l-i.c')).toEqual([]);
    expect(await service.matches('Alcie')).toHaveLength(1);
    expect(await service.matches('Example')).toHaveLength(1);
    expect(await service.matches('Alice', 'Unrelated')).toEqual([]);
  });
  it('shows all near matches with no email until explicit selection', async () => {
    await importRoster(service, 'staff', [bob]);
    const matches = await service.matches('Alici');
    expect(matches.length).toBe(2);
    expect(Object.keys(matches[0]!).sort()).toEqual(['affiliation', 'name', 'token']);
    expect((await service.select(matches[0]!.token)).email).toContain('@');
  });
  it('rejects malformed, tampered, wrong-purpose and expired selection tokens', async () => {
    const candidate = (await service.matches('Alice'))[0]!;
    await expect(service.checkin(alice, candidate.token)).rejects.toThrow('expired');
    await expect(service.select(`${candidate.token}x`)).rejects.toThrow('signature');
    vi.spyOn(Date, 'now').mockReturnValueOnce(0);
    const expired = service.sign('some-id', 'candidate');
    await expect(service.select(expired)).rejects.toThrow('expired');
    vi.restoreAllMocks();
  });
  it('rejects ambiguous duplicates and conflicting roster roles', async () => {
    await expect(importRoster(service, 'staff', [{ ...alice, id: 'different' }])).rejects.toThrow('Ambiguous');
    await expect(importRoster(service, 'staff', [{ ...alice, role: 'track-lead' }])).rejects.toThrow('Conflicting');
  });
  it('reports malformed CSV columns and duplicate rows', async () => {
    expect(() => parseRoster('name,email\nAlice,nope')).toThrow();
    await expect(importRoster(service, 'roster', [alice, alice])).rejects.toThrow('Duplicate');
  });
});
describe('transactional check-in', () => {
  it('links Person and Practitioner, records role and persists changed track', async () => {
    const selected = await select();
    const receipt = await service.checkin({ ...selected, track: 'care-plans' }, selected.selection);
    const people = await store.search<Person>('Person', '');
    const practitioners = await store.search<Practitioner>('Practitioner', '');
    expect(people[0]?.link?.[0]?.target.reference).toBe(`Practitioner/${practitioners[0]?.id}`);
    expect(detailsOf(people[0]!).track).toBe('care-plans');
    expect(detailsOf(practitioners[0]!).track).toBe('care-plans');
    expect(practitioners[0]?.identifier?.[0]?.value).toBe(alice.id);
    expect((await service.dashboard()).tracks['care-plans']).toBe(1);
    expect(receipt).toMatchObject({ name: alice.name, email: alice.email, affiliation: alice.affiliation, track: 'care-plans', role: 'attendee', receiptId: practitioners[0]?.id, alreadyCheckedIn: false });
    expect(receipt.arrived).toBe((await service.list(LISTS.checkins)).entry?.[0]?.date);
    expect(await store.search('Task', '')).toHaveLength(0);
  });
  it('does not persist a selected draft or imported track changes before submission', async () => {
    const selected = await select(); selected.track = 'ehds-summary';
    expect((await service.dashboard()).totals.checkedIn).toBe(0);
    expect(detailsOf((await store.search<Person>('Person', ''))[0]!).track).toBe('smart');
  });
  it('returns the original saved receipt on repeated submissions, not new draft details', async () => {
    const first = await checkin();
    const selected = await select();
    const repeated = await service.checkin({ ...selected, name: 'Unsaved name', track: 'fhir-101' }, selected.selection);
    expect(first.alreadyCheckedIn).toBe(false);
    expect(repeated).toEqual({ ...first, alreadyCheckedIn: true });
    expect((await service.dashboard()).totals.checkedIn).toBe(1);
  });
  it('checks in track leads from staff roster without Google Sheet sign-up', async () => {
    await importRoster(service, 'staff', [bob]);
    const selected = await select('Alicia');
    await service.checkin(selected, selected.selection);
    expect((await service.dashboard()).totals).toMatchObject({ checkedIn: 1, trackLeads: 1, staffMissing: 0, rosterMissing: 1 });
  });
  it('does not count people in both rosters twice', async () => {
    await importRoster(service, 'staff', [alice]); await checkin();
    expect((await service.dashboard()).totals).toMatchObject({ roster: 1, staff: 1, checkedIn: 1, rosterMissing: 0, staffMissing: 0 });
  });
  it('saves manual registrations with an audit without inflating either roster', async () => {
    const id = 'b84670ad-39ac-4cf8-bc12-981f290b8cb9';
    const details = { ...bob, name: 'Manual Visitor' };
    const first = await service.manual(details, 'attendee', 'Not on either roster', id, 'organizer');
    expect(await service.manual(details, 'attendee', 'Not on either roster', id, 'organizer')).toEqual({ ...first, alreadyCheckedIn: true });
    expect((await service.dashboard()).totals).toMatchObject({ roster: 1, staff: 0, checkedIn: 1, manual: 1 });
    expect(await store.search('AuditEvent', '')).toHaveLength(1);
    await expect(service.manual(alice, 'attendee', 'Should not duplicate', id, 'organizer')).rejects.toThrow('possible existing');
  });
  it('fails without false success and retries optimistic conflicts', async () => {
    store.fail = true;
    await expect(checkin()).rejects.toThrow('failure');
    store.fail = false;
    expect((await service.dashboard()).totals.checkedIn).toBe(0);
    store.conflicts = 1;
    await checkin();
    expect((await service.dashboard()).totals.checkedIn).toBe(1);
  });
  it('preserves both simultaneous arrivals', async () => {
    await importRoster(service, 'staff', [bob]);
    const a = await select('Alice'); const b = await select('Alicia');
    await Promise.all([service.checkin(a, a.selection), service.checkin(b, b.selection)]);
    expect((await service.dashboard()).totals.checkedIn).toBe(2);
  });
  it('deduplicates simultaneous submissions for the same attendee', async () => {
    const selected = await select();
    await Promise.all([service.checkin(selected, selected.selection), service.checkin(selected, selected.selection)]);
    expect(await store.search('Practitioner', '')).toHaveLength(1);
    expect(await store.search('Task', '')).toHaveLength(0);
    expect((await service.dashboard()).totals.checkedIn).toBe(1);
  });
  it('corrects both linked resources and does not let reimport overwrite confirmed track', async () => {
    await checkin();
    const p = (await store.search<Person>('Person', ''))[0]!;
    await service.correct(p.id!, { ...alice, track: 'ehds-summary' }, 'track-lead', 'Organizer correction', 'organizer');
    await importRoster(service, 'roster', [{ ...alice, role: 'track-lead' }]);
    const dashboard = await service.dashboard();
    expect(dashboard.rows[0]).toMatchObject({ personId: p.id, role: 'track-lead', track: 'ehds-summary' });
    expect(detailsOf((await store.search<Person>('Person', ''))[0]!).track).toBe('ehds-summary');
  });
});
describe('persisted attendance receipts', () => {
  it('reports receipt retrieval failure after a saved transaction and recovers without another arrival', async () => {
    vi.spyOn(service, 'receipt').mockRejectedValueOnce(new Error('Receipt retrieval unavailable'));
    await expect(checkin()).rejects.toThrow('Receipt retrieval unavailable');
    expect((await service.dashboard()).totals.checkedIn).toBe(1);
    const recovered = await checkin();
    expect(recovered.alreadyCheckedIn).toBe(true);
    expect(await store.search('Practitioner', '')).toHaveLength(1);
    expect(recovered.arrived).toBe((await service.list(LISTS.checkins)).entry?.[0]?.date);
  });
  it('reconstructs receipts after restart and includes staff corrections with the original arrival', async () => {
    const first = await checkin();
    const restored = new RegistrationService(store, 'same-secret');
    expect(await restored.receipt(first.receiptId)).toEqual({ ...first, alreadyCheckedIn: true });
    const p = (await store.search<Person>('Person', ''))[0]!;
    await restored.correct(p.id!, { ...alice, track: 'ehds-summary' }, 'track-lead', 'Organizer correction', 'organizer');
    expect(await restored.receipt(first.receiptId)).toEqual({ ...first, track: 'ehds-summary', role: 'track-lead', alreadyCheckedIn: true });
  });
  it('rejects missing check-ins and invalid persisted timestamps', async () => {
    await expect(service.receipt('missing')).rejects.toThrow('not found');
    const first = await checkin();
    const list = await service.list(LISTS.checkins);
    list.entry![0]!.date = 'invalid';
    await store.transaction([put(list)]);
    await expect(service.receipt(first.receiptId)).rejects.toThrow('timestamp');
  });
});
