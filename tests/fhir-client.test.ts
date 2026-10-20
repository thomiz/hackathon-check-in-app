import { describe, expect, it, vi } from 'vitest';
import type { Bundle, Person } from 'fhir/r4';
import { MedplumStore, put } from '../server/fhir';
import { emailTask, person, practitioner } from '../server/model';

const details = { name: 'Synthetic Person', email: 'test@example.invalid', affiliation: 'Example', track: 'smart' as const };
const credentials = { baseUrl: 'http://localhost:8103', clientId: 'synthetic', clientSecret: 'not-a-secret' };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }); }
describe('Medplum transport contract', () => {
  it('uses conditional POSTs with urn references instead of client-assigned IDs', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json({ access_token: 'test' }))
      .mockResolvedValueOnce(json({ resourceType: 'Bundle', type: 'transaction-response', entry: [{ response: { status: '201 Created' } }, { response: { status: '201 Created' } }, { response: { status: '201 Created' } }] }));
    const store = new MedplumStore(credentials, fetcher);
    const expected = person('temporary-person', details);
    expected.link = [{ target: { reference: 'Practitioner/temporary-practitioner' } }];
    await store.transaction([put(expected, true), put(practitioner('temporary-practitioner', details, 'attendee'), true), put(emailTask('temporary-practitioner', 'stable-id'), true)]);
    const bundle = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body)) as Bundle;
    expect(bundle.entry?.every(entry => entry.request?.method === 'POST' && entry.request.ifNoneExist && !entry.resource?.id)).toBe(true);
    expect((bundle.entry?.[0]?.resource as Person).link?.[0]?.target.reference).toBe(bundle.entry?.[1]?.fullUrl);
    expect(fetcher.mock.calls[1]?.[0]).toBe('http://localhost:8103/fhir/R4/');
  });
  it('follows all FHIR search pages', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json({ access_token: 'test' }))
      .mockResolvedValueOnce(json({ resourceType: 'Bundle', entry: [{ resource: { resourceType: 'Person', id: 'one' } }], link: [{ relation: 'next', url: 'http://localhost:8103/fhir/R4/Person?_page=2' }] }))
      .mockResolvedValueOnce(json({ resourceType: 'Bundle', entry: [{ resource: { resourceType: 'Person', id: 'two' } }] }));
    expect(await new MedplumStore(credentials, fetcher).search('Person', '')).toHaveLength(2);
  });
  it('rejects pagination links outside the Medplum FHIR root', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json({ access_token: 'test' }))
      .mockResolvedValueOnce(json({ resourceType: 'Bundle', link: [{ relation: 'next', url: 'https://other.invalid/steal' }] }));
    await expect(new MedplumStore(credentials, fetcher).search('Person', '')).rejects.toThrow('unsafe');
  });
  it('does not treat a failed transaction response as success', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json({ access_token: 'test' }))
      .mockResolvedValueOnce(json({ resourceType: 'Bundle', type: 'transaction-response', entry: [{ response: { status: '412 Precondition Failed' } }] }));
    await expect(new MedplumStore(credentials, fetcher).transaction([put(person('existing', details))])).rejects.toThrow('failed');
  });
});
