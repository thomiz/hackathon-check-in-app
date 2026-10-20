import type { Bundle, BundleEntry, Resource } from 'fhir/r4';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export class FhirError extends AppError {}
export interface FhirStore {
  read<T extends Resource>(type: T['resourceType'], id: string): Promise<T | undefined>;
  search<T extends Resource>(type: T['resourceType'], query: string): Promise<T[]>;
  transaction(entries: BundleEntry[]): Promise<void>;
}

export function put(resource: Resource, createOnly = false): BundleEntry {
  if (!resource.id) throw new Error('A stable resource ID is required.');
  if (createOnly) {
    const identifier = 'identifier' in resource && Array.isArray(resource.identifier) ? resource.identifier[0] : undefined;
    return {
      fullUrl: `urn:uuid:${randomUUID()}`, resource,
      request: {
        method: 'POST', url: resource.resourceType,
        ...(identifier?.system && identifier.value ? { ifNoneExist: `identifier=${encodeURIComponent(`${identifier.system}|${identifier.value}`)}` } : {})
      }
    };
  }
  return {
    resource,
    request: {
      method: 'PUT', url: `${resource.resourceType}/${resource.id}`,
      ...(resource.meta?.versionId ? { ifMatch: `W/"${resource.meta.versionId}"` } : {})
    }
  };
}

export class MedplumStore implements FhirStore {
  private token?: { value: string; expires: number };
  constructor(private config: { baseUrl: string; clientId: string; clientSecret: string }, private fetcher: typeof fetch = fetch) {}
  private async accessToken(): Promise<string> {
    if (this.token && this.token.expires > Date.now()) return this.token.value;
    let response: Response;
    try {
      response = await this.fetcher(`${this.config.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: this.config.clientId, client_secret: this.config.clientSecret }),
        signal: AbortSignal.timeout(10000)
      });
    } catch { throw new FhirError(503, 'Cannot connect to Medplum authentication. Check the local server.'); }
    if (!response.ok) throw new FhirError(503, 'Medplum client authentication failed. Check backend credentials.');
    const token = z.object({ access_token: z.string(), expires_in: z.number().optional() }).parse(await response.json());
    this.token = { value: token.access_token, expires: Date.now() + Math.max(0, (token.expires_in ?? 300) - 30) * 1000 };
    return this.token.value;
  }
  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.accessToken();
    let response: Response;
    try {
      response = await this.fetcher(`${this.config.baseUrl}/fhir/R4/${path}`, {
        ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/fhir+json' },
        signal: AbortSignal.timeout(15000)
      });
    } catch { throw new FhirError(503, 'Medplum is unavailable or the write outcome is uncertain. Retry with the same registration.'); }
    if (response.status === 401) this.token = undefined;
    if (!response.ok && response.status !== 404) {
      throw new FhirError(response.status === 412 || response.status === 409 ? 409 : 503,
        response.status === 412 || response.status === 409 ? 'FHIR version conflict; retry the operation.' : `Medplum rejected the request (HTTP ${response.status}).`);
    }
    return response;
  }
  async read<T extends Resource>(type: T['resourceType'], id: string): Promise<T | undefined> {
    const response = await this.request(`${type}/${encodeURIComponent(id)}`);
    return response.status === 404 ? undefined : await response.json() as T;
  }
  async search<T extends Resource>(type: T['resourceType'], query: string): Promise<T[]> {
    const resources: T[] = [];
    let path: string | undefined = `${type}?${query}`;
    const visited = new Set<string>();
    while (path) {
      if (visited.has(path)) throw new FhirError(503, 'Medplum returned a cyclic pagination link.');
      visited.add(path);
      const response = await this.request(path);
      if (response.status === 404) throw new FhirError(503, 'FHIR search endpoint was not found.');
      const bundle = await response.json() as Bundle<T>;
      if (bundle.resourceType !== 'Bundle') throw new FhirError(503, 'Expected a FHIR search Bundle.');
      for (const entry of bundle.entry ?? []) if (entry.resource?.resourceType === type) resources.push(entry.resource);
      const next = bundle.link?.find(link => link.relation === 'next')?.url;
      path = undefined;
      if (next) {
        const root = `${this.config.baseUrl}/fhir/R4/`;
        const url = new URL(next, root);
        if (!url.href.startsWith(root)) throw new FhirError(503, 'Medplum returned an unsafe pagination link.');
        path = url.href.slice(root.length);
      }
    }
    return resources;
  }
  async transaction(entries: BundleEntry[]): Promise<void> {
    const aliases = new Map(entries.filter(e => e.request?.method === 'POST' && e.resource?.id && e.fullUrl)
      .map(e => [`${e.resource!.resourceType}/${e.resource!.id}`, e.fullUrl!]));
    const rewrite = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(rewrite);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) =>
        [key, key === 'reference' && typeof item === 'string' ? aliases.get(item) ?? item : rewrite(item)]));
      return value;
    };
    const prepared = entries.map(entry => {
      const copy = rewrite(entry) as BundleEntry;
      if (copy.request?.method === 'POST' && copy.resource) delete copy.resource.id;
      return copy;
    });
    const response = await this.request('', {
      method: 'POST', body: JSON.stringify({ resourceType: 'Bundle', type: 'transaction', entry: prepared })
    });
    if (response.status === 404) throw new FhirError(503, 'FHIR transaction endpoint was not found.');
    const bundle = await response.json() as Bundle;
    if (bundle.type !== 'transaction-response' || bundle.entry?.length !== entries.length) {
      throw new FhirError(503, 'Medplum did not confirm the complete transaction.');
    }
    for (const entry of bundle.entry) {
      const status = Number(entry.response?.status?.split(' ')[0]);
      if (!Number.isFinite(status) || status < 200 || status >= 300) {
        throw new FhirError(status === 412 || status === 409 ? 409 : 503, 'FHIR transaction failed; attendance has not been confirmed.');
      }
    }
  }
}
