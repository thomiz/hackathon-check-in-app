import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../server/config';

beforeEach(() => {
  const values = {
    MEDPLUM_BASE_URL: 'http://localhost:8103', MEDPLUM_CLIENT_ID: 'synthetic', MEDPLUM_CLIENT_SECRET: 'synthetic',
    SESSION_SECRET: 'synthetic-only-secret-over-32-characters', STAFF_USERNAME: 'organizer',
    STAFF_PASSWORD_HASH: `${'a'.repeat(32)}:${'b'.repeat(128)}`, BREVO_API_KEY: '', BREVO_SENDER_EMAIL: ''
  };
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());
describe('configuration', () => {
  it('supports blank optional Brevo values from the generated .env', () => {
    expect(loadConfig().email).toBeUndefined();
  });
  it('rejects partially configured email instead of silently queueing forever', () => {
    vi.stubEnv('BREVO_API_KEY', 'synthetic');
    expect(() => loadConfig()).toThrow('Configure both');
  });
});
