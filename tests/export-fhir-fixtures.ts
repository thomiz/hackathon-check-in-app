import { mkdir, writeFile } from 'node:fs/promises';
import { MemoryStore } from './memory-store';
import { RegistrationService } from '../server/registration';
import { importRoster } from '../server/imports';
import type { Bundle } from 'fhir/r4';

const store = new MemoryStore();
const service = new RegistrationService(store, 'synthetic-only-fixture-session-secret');
await service.initialize();
await importRoster(service, 'staff', [
  { id: 'fixture-lead', name: 'Fixture Lead', email: 'lead@example.invalid', affiliation: 'Synthetic Org', track: 'smart', role: 'track-lead' }
]);
const selected = await service.select((await service.matches('Fixture'))[0]!.token);
await service.checkin({ ...selected, track: 'care-plans' }, selected.selection);
await service.manual({ name: 'Fixture Visitor', email: 'visitor@example.invalid', affiliation: 'Synthetic Other', track: '' },
  'attendee', 'Synthetic validation fixture', '9061b246-5781-4de7-8268-461dff50dc1f', 'test-operator');
const bundle: Bundle = {
  resourceType: 'Bundle', type: 'collection',
  entry: [...store.resources.values()].map(resource => ({ fullUrl: `https://example.invalid/fhir/R4/${resource.resourceType}/${resource.id}`, resource }))
};
await mkdir('fhir/output', { recursive: true });
await writeFile('fhir/output/runtime-fixtures.json', JSON.stringify(bundle, null, 2));
console.log('Exported synthetic resources created by the actual registration service.');
