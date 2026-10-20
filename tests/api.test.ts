import { scryptSync } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../server/app';
import { MemoryStore } from './memory-store';
import { importRoster } from '../server/imports';
import type { Config } from '../server/config';
import type { Selection } from '../shared/domain';

const salt = '0123456789abcdef0123456789abcdef';
export const config: Config = {
  host: '127.0.0.1', port: 8080, publicUrl: 'http://localhost:8080', privacyUrl: 'https://example.invalid/privacy',
  medplum: { baseUrl: 'http://localhost:8103', clientId: 'test', clientSecret: 'test' },
  sessionSecret: 'only-for-tests-secret-at-least-32-characters',
  staffUsername: 'organizer', staffPasswordHash: `${salt}:${scryptSync('test-password', salt, 64).toString('hex')}`, email: undefined
};
let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); });
async function setup() {
  const result = await buildApp(new MemoryStore(), config);
  app = result.app;
  await result.service.initialize();
  return result;
}
const origin = { origin: config.publicUrl };
async function login() {
  const response = await app!.inject({ method: 'POST', url: '/api/staff/login', headers: origin, payload: { username: 'organizer', password: 'test-password' } });
  return response.cookies[0]!.value;
}
describe('HTTP authorization and input boundaries', () => {
  it('rejects unauthenticated staff operations', async () => {
    await setup();
    expect((await app!.inject('/api/staff/dashboard')).statusCode).toBe(401);
    expect((await app!.inject({ method: 'POST', url: '/api/staff/manual', headers: origin, payload: {} })).statusCode).toBe(401);
  });
  it('rejects cross-origin mutation and wrong passwords', async () => {
    await setup();
    expect((await app!.inject({ method: 'POST', url: '/api/staff/login', headers: { origin: 'https://evil.invalid' }, payload: {} })).statusCode).toBe(403);
    expect((await app!.inject({ method: 'POST', url: '/api/staff/login', headers: origin, payload: { username: 'organizer', password: 'bad' } })).statusCode).toBe(401);
  });
  it('supports authenticated dashboard and manual check-in with validation', async () => {
    await setup();
    const staff = await login();
    const response = await app!.inject({
      method: 'POST', url: '/api/staff/manual', headers: origin, cookies: { staff },
      payload: { name: 'Synthetic Visitor', email: 'visitor@example.invalid', affiliation: 'Test', track: '', role: 'attendee', reason: 'Not in either list', requestId: 'd013a848-0639-4824-a97a-5d457e42ab21' }
    });
    expect(response.statusCode).toBe(200);
    const dashboard = await app!.inject({ url: '/api/staff/dashboard', cookies: { staff } });
    expect(dashboard.json().totals.manual).toBe(1);
    expect(dashboard.headers['cache-control']).toBe('no-store');
    expect((await app!.inject({ method: 'POST', url: '/api/checkin', headers: origin, payload: { email: 'bad' } })).statusCode).toBe(400);
  });
  it('provides public matching summaries and explicit selection', async () => {
    const { service } = await setup();
    await importRoster(service, 'roster', [{ id: 'test', name: 'Alice Example', email: 'test@example.invalid', affiliation: 'Example', role: 'attendee', track: 'smart' }]);
    const match = await app!.inject('/api/matches?name=Alice');
    expect(match.json()[0]).not.toHaveProperty('email');
    const selected = await app!.inject({ method: 'POST', url: '/api/select', headers: origin, payload: { token: match.json()[0].token } });
    expect(selected.json().email).toBe('test@example.invalid');
    const checkin = await app!.inject({ method: 'POST', url: '/api/checkin', headers: origin, payload: { ...selected.json<Selection>(), track: 'ehds-summary' } });
    expect(checkin.statusCode).toBe(200);
    const again = await app!.inject({ method: 'POST', url: '/api/checkin', headers: origin, payload: selected.json() });
    expect(again.json().alreadyCheckedIn).toBe(true);
  });
});
