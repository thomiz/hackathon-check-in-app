import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../server/config';

beforeEach(() => {
  const values = {
    FHIR_BASE_URL: 'http://localhost:8090/fhir',
    SESSION_SECRET: 'synthetic-only-secret-over-32-characters', STAFF_USERNAME: 'organizer',
    STAFF_PASSWORD_HASH: `${'a'.repeat(32)}:${'b'.repeat(128)}`, HOST: '127.0.0.1', PUBLIC_URL: 'http://localhost:8080'
  };
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());
describe('configuration', () => {
  it('supports local workstation configuration', () => {
    expect(loadConfig()).toMatchObject({ host: '127.0.0.1', publicUrl: 'http://localhost:8080', fhir: { baseUrl: 'http://localhost:8090/fhir' } });
  });
  it('rejects a missing FHIR server URL', () => {
    vi.stubEnv('FHIR_BASE_URL', '');
    expect(() => loadConfig()).toThrow('FHIR_BASE_URL');
  });
});
