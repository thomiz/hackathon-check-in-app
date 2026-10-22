import type { Bundle, BundleEntry, Resource } from 'fhir/r4';
import { randomUUID } from 'node:crypto';

export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export class FhirError extends AppError {
  constructor(status: number, message: string, public diagnostics?: string) { super(status, message); }
}
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

/**
 * Blaze has no built-in authentication, so it must only be reachable from the
 * registration PC (Compose binds it to 127.0.0.1).
 */
export class BlazeStore implements FhirStore {
  private root: string;
  constructor(config: { baseUrl: string }, private fetcher: typeof fetch = fetch) {
    this.root = `${config.baseUrl.replace(/\/+$/, '')}/`;
  }
  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.root}${path}`, {
        ...init, headers: { accept: 'application/fhir+json', 'content-type': 'application/fhir+json' },
        signal: AbortSignal.timeout(15000)
      });
    } catch { throw new FhirError(503, 'Blaze is unavailable or the write outcome is uncertain. Retry with the same registration.'); }
    if (!response.ok && response.status !== 404) {
      let outcome: unknown;
      try { outcome = JSON.parse(await response.text()); }
      catch (error) { if (!(error instanceof SyntaxError)) throw error; }
      const diagnostics = outcome && typeof outcome === 'object' && 'issue' in outcome && Array.isArray(outcome.issue)
        ? outcome.issue.flatMap((issue: unknown) => issue && typeof issue === 'object' && 'diagnostics' in issue && typeof issue.diagnostics === 'string'
          ? [issue.diagnostics] : []).join('; ') || undefined
        : undefined;
      throw new FhirError(response.status === 412 || response.status === 409 ? 409 : 503,
        response.status === 412 ? 'FHIR version conflict; retry the operation.'
          : response.status === 409 ? 'Blaze rejected the request due to a conflict. Check the server diagnostics.'
            : `Blaze rejected the request (HTTP ${response.status}).`, diagnostics);
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
      if (visited.has(path)) throw new FhirError(503, 'Blaze returned a cyclic pagination link.');
      visited.add(path);
      const response = await this.request(path);
      if (response.status === 404) throw new FhirError(503, 'FHIR search endpoint was not found.');
      const bundle = await response.json() as Bundle<T>;
      if (bundle.resourceType !== 'Bundle') throw new FhirError(503, 'Expected a FHIR search Bundle.');
      for (const entry of bundle.entry ?? []) if (entry.resource?.resourceType === type) resources.push(entry.resource);
      const next = bundle.link?.find(link => link.relation === 'next')?.url;
      path = undefined;
      if (next) {
        const url = new URL(next, this.root);
        if (!url.href.startsWith(this.root)) throw new FhirError(503, 'Blaze returned an unsafe pagination link. Check that BASE_URL in compose.yaml matches FHIR_BASE_URL.');
        path = url.href.slice(this.root.length);
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
      throw new FhirError(503, 'Blaze did not confirm the complete transaction.');
    }
    for (const entry of bundle.entry) {
      const status = Number(entry.response?.status?.split(' ')[0]);
      if (!Number.isFinite(status) || status < 200 || status >= 300) {
        throw new FhirError(status === 412 || status === 409 ? 409 : 503, 'FHIR transaction failed; attendance has not been confirmed.');
      }
    }
  }
}
