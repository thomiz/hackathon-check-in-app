import { describe, expect, it, vi } from 'vitest';
import type { Bundle, Person } from 'fhir/r4';
import { BlazeStore, put } from '../server/fhir';
import { person, practitioner } from '../server/model';

const details = { name: 'Synthetic Person', email: 'test@example.invalid', affiliation: 'Example', track: 'smart' as const };
const config = { baseUrl: 'http://localhost:8090/fhir' };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/fhir+json' } }); }
describe('Blaze transport contract', () => {
  it('posts transactions to the FHIR base without credentials, using conditional POSTs and urn references', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ resourceType: 'Bundle', type: 'transaction-response', entry: [{ response: { status: '201' } }, { response: { status: '201' } }] }));
    const store = new BlazeStore(config, fetcher);
    const expected = person('temporary-person', details);
    expected.link = [{ target: { reference: 'Practitioner/temporary-practitioner' } }];
    await store.transaction([put(expected, true), put(practitioner('temporary-practitioner', details, 'attendee'), true)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe('http://localhost:8090/fhir/');
    const init = fetcher.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(Object.keys(init?.headers as Record<string, string>)).not.toContain('authorization');
    const bundle = JSON.parse(String(init?.body)) as Bundle;
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry?.every(entry => entry.request?.method === 'POST' && entry.request.ifNoneExist && !entry.resource?.id)).toBe(true);
    expect((bundle.entry?.[0]?.resource as Person).link?.[0]?.target.reference).toBe(bundle.entry?.[1]?.fullUrl);
  });
  it('sends version-aware updates with If-Match', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ resourceType: 'Bundle', type: 'transaction-response', entry: [{ response: { status: '200' } }] }));
    const existing = person('existing', details);
    existing.meta = { versionId: '7' };
    await new BlazeStore(config, fetcher).transaction([put(existing)]);
    const bundle = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as Bundle;
    expect(bundle.entry?.[0]?.request).toEqual({ method: 'PUT', url: 'Person/existing', ifMatch: 'W/"7"' });
  });
  it('follows Blaze search pages under the FHIR base', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ resourceType: 'Bundle', entry: [{ resource: { resourceType: 'Person', id: 'one' } }], link: [{ relation: 'next', url: 'http://localhost:8090/fhir/Person/__page/DD7MLX6H7OGJN7SD?_count=200' }] }))
      .mockResolvedValueOnce(json({ resourceType: 'Bundle', entry: [{ resource: { resourceType: 'Person', id: 'two' } }] }));
    expect(await new BlazeStore(config, fetcher).search('Person', '_count=200')).toHaveLength(2);
    expect(fetcher.mock.calls[0]?.[0]).toBe('http://localhost:8090/fhir/Person?_count=200');
    expect(fetcher.mock.calls[1]?.[0]).toBe('http://localhost:8090/fhir/Person/__page/DD7MLX6H7OGJN7SD?_count=200');
  });
  it('rejects pagination links outside the Blaze FHIR base', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ resourceType: 'Bundle', link: [{ relation: 'next', url: 'https://other.invalid/steal' }] }));
    await expect(new BlazeStore(config, fetcher).search('Person', '')).rejects.toThrow('unsafe');
  });
  it('maps a failed If-Match precondition to a retryable conflict', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json({ resourceType: 'OperationOutcome', issue: [] }, 412));
    await expect(new BlazeStore(config, fetcher).transaction([put(person('existing', details))])).rejects.toMatchObject({ status: 409 });
  });
  it('does not treat a failed transaction response as success', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ resourceType: 'Bundle', type: 'transaction-response', entry: [{ response: { status: '412 Precondition Failed' } }] }));
    await expect(new BlazeStore(config, fetcher).transaction([put(person('existing', details))])).rejects.toThrow('failed');
  });
  it('reports an unreachable Blaze server as unavailable', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(new BlazeStore(config, fetcher).read('Person', 'x')).rejects.toMatchObject({ status: 503 });
  });
});
