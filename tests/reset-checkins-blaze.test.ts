import { expect, it } from 'vitest';
import { BlazeStore, put } from '../server/fhir';
import { importRoster } from '../server/imports';
import { RegistrationService } from '../server/registration';
import { resetCheckins } from '../server/reset-checkins';
import { LISTS } from '../shared/domain';

// Set only for a disposable Blaze instance, never the event database.
const baseUrl = process.env.BLAZE_RESET_TEST_URL;
it.skipIf(!baseUrl)('resets and checks in again against Blaze with referential integrity enabled', async () => {
  if (!baseUrl) throw new Error('BLAZE_RESET_TEST_URL must identify a disposable test database.');
  const service = new RegistrationService(new BlazeStore({ baseUrl }), 'synthetic-test-secret-at-least-32-characters');
  expect(await service.store.search('Person', '_count=1')).toHaveLength(0);
  expect(await service.store.search('Practitioner', '_count=1')).toHaveLength(0);
  expect(await service.store.search('List', '_count=1')).toHaveLength(0);
  await service.initialize();
  const row = { id: 'reset-test', name: 'Synthetic Reset', email: 'reset@example.invalid', affiliation: 'Test', track: 'smart' as const, role: 'attendee' as const };
  await importRoster(service, 'roster', [row]);
  await importRoster(service, 'staff', [row]);
  const arrive = async () => {
    const [candidate] = await service.matches('Synthetic');
    const selection = await service.select(candidate!.token);
    return service.checkin(selection, selection.selection);
  };
  const first = await arrive();
  const list = await service.list(LISTS.checkins);
  list.entry = [];
  await expect(service.store.transaction([
    put(list), { request: { method: 'DELETE', url: `Practitioner/${first.receiptId}` } }
  ])).rejects.toMatchObject({ status: 409, diagnostics: expect.stringContaining('Referential integrity violated') });
  expect(await resetCheckins(service)).toBe(1);
  expect((await service.dashboard()).totals).toMatchObject({ checkedIn: 0, roster: 1, staff: 1 });
  const second = await arrive();
  expect(second.alreadyCheckedIn).toBe(false);
  expect(second.receiptId).not.toBe(first.receiptId);
  expect(await resetCheckins(service)).toBe(1);
  expect(await resetCheckins(service)).toBe(0);
}, 60000);
