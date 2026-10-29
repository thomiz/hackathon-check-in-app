import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalFhirUrl, httpHealth, loadOperationsEnvironment, LocalBlaze, waitFor, type CommandRunner } from '../scripts/ops-platform';
import { operationsFixture, type OperationsFixture } from './ops-fixtures';

let fixture: OperationsFixture;
beforeEach(async () => { fixture = await operationsFixture(); });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await rm(fixture.base, { recursive: true, force: true }); });

function dockerRunner(options: { remote?: boolean; exposed?: boolean; data?: string } = {}) {
  return vi.fn<CommandRunner>(async (_program, args) => {
    let stdout = '';
    const base = new URL(fixture.environment.config.fhir.baseUrl);
    if (args[0] === 'context') stdout = options.remote ? 'tcp://remote.example.invalid:2375' : 'npipe:////./pipe/docker_engine';
    else if (args[0] === 'version') stdout = '{"Os":"linux"}';
    else if (args[0] === 'inspect') stdout = JSON.stringify(fixture.blaze.container);
    else if (args.includes('config')) stdout = JSON.stringify({ services: { blaze: {
      environment: { BASE_URL: base.origin },
      ports: [{ host_ip: options.exposed ? '0.0.0.0' : '127.0.0.1', published: base.port, target: 8080, protocol: 'tcp' }],
      volumes: [{ type: 'bind', source: options.data ?? fixture.data, target: '/app/data' }]
    } } });
    else if (args.includes('ps')) stdout = fixture.blaze.container.Id;
    return { code: 0, stdout, stderr: '' };
  });
}

describe('Docker and health boundaries', () => {
  it('reads effective Compose bind paths and checks the existing container mount', async () => {
    const run = dockerRunner();
    const blaze = new LocalBlaze(fixture.environment, run);
    expect(await blaze.dataDirectory()).toBe(fixture.data);
    await blaze.validateContainer(fixture.blaze.container);
    expect(run.mock.calls.some(([, args]) => args.includes('--project-directory') && args.includes('--env-file'))).toBe(true);
  });
  it('uses Compose 2.4-compatible startup and bounded readiness checks', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('OK'));
    const run = dockerRunner();
    const blaze = new LocalBlaze(fixture.environment, run);
    await blaze.start();
    expect(run.mock.calls.some(([, args]) => args.slice(-3).join(' ') === 'up -d blaze')).toBe(true);
    expect(run.mock.calls.flatMap(([, args]) => args)).not.toContain('--wait-timeout');
  });
  it('refuses remote Docker contexts before issuing a startup command', async () => {
    delete fixture.environment.env.DOCKER_HOST;
    delete fixture.environment.env.DOCKER_CONTEXT;
    const run = dockerRunner({ remote: true });
    await expect(new LocalBlaze(fixture.environment, run).start()).rejects.toThrow('local Docker engine');
    expect(run.mock.calls.some(([, args]) => args.includes('up'))).toBe(false);
  });
  it('refuses network-exposed or missing database configurations rather than making an empty database', async () => {
    await expect(new LocalBlaze(fixture.environment, dockerRunner({ exposed: true })).dataDirectory()).rejects.toThrow('only on 127.0.0.1');
    await expect(new LocalBlaze(fixture.environment, dockerRunner({ data: join(fixture.root, 'missing-data') })).dataDirectory()).rejects.toThrow();
  });
  it('refuses maintenance when the existing container uses a different data directory', async () => {
    const blaze = new LocalBlaze(fixture.environment, dockerRunner());
    const container = structuredClone(fixture.blaze.container);
    container.Mounts[0]!.Source = fixture.backups;
    await expect(blaze.validateContainer(container)).rejects.toThrow('different database directory');
  });
  it('does not silently switch databases or stop a mismatched container', async () => {
    const run = dockerRunner({ data: fixture.backups });
    const blaze = new LocalBlaze(fixture.environment, run);
    await expect(blaze.start()).rejects.toThrow('different database directory');
    await expect(blaze.stop()).rejects.toThrow('different database directory');
    expect(run.mock.calls.some(([, args]) => args.includes('up') || args.includes('stop'))).toBe(false);
  });
  it('refuses extra published ports on an existing container', async () => {
    const container = structuredClone(fixture.blaze.container);
    container.HostConfig.PortBindings!['9090/tcp'] = [{ HostIp: '0.0.0.0', HostPort: '9090' }];
    await expect(new LocalBlaze(fixture.environment, dockerRunner()).validateContainer(container)).rejects.toThrow('loopback endpoint');
  });
  it.each([
    'https://remote.example.invalid/fhir', 'http://user:password@localhost:8090/fhir',
    'http://localhost:8090/fhir?token=secret', 'http://localhost:8090/fhir#fragment'
  ])('rejects unsupported FHIR endpoints without echoing credentials', url => {
    expect(() => canonicalFhirUrl(url)).toThrow('local, unauthenticated');
  });
  it('requires the exact application health shape rather than an arbitrary HTTP 200', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{"status":"not-ok"}'))
      .mockResolvedValueOnce(new Response('{"status":"ok"}')).mockRejectedValueOnce(new Error('Offline'));
    expect((await httpHealth('http://127.0.0.1/api/health', true, fetcher)).ok).toBe(false);
    expect((await httpHealth('http://127.0.0.1/api/health', true, fetcher)).ok).toBe(true);
    expect((await httpHealth('http://127.0.0.1/api/health', true, fetcher)).detail).toContain('failed');
  });
  it('fails bounded readiness checks explicitly', async () => {
    await expect(waitFor(async () => ({ ok: false, detail: 'not healthy' }), 'Synthetic service', 5)).rejects.toThrow('not healthy');
  });
});

describe('operations environment', () => {
  it('reads configuration relative to the repository without overwriting secrets', async () => {
    for (const key of ['HOST', 'PORT', 'PUBLIC_URL', 'FHIR_BASE_URL', 'BLAZE_DATA_DIR', 'SESSION_SECRET', 'STAFF_USERNAME', 'STAFF_PASSWORD_HASH']) vi.stubEnv(key, undefined);
    const contents = `HOST=127.0.0.1\nPORT=8081\nPUBLIC_URL=http://localhost:8081\nFHIR_BASE_URL=http://localhost:8090/fhir\n` +
      `BLAZE_DATA_DIR=${fixture.data}\nSESSION_SECRET=${'a'.repeat(64)}\nSTAFF_USERNAME=organizer\nSTAFF_PASSWORD_HASH=${'a'.repeat(32)}:${'b'.repeat(128)}\n`;
    await writeFile(join(fixture.root, '.env'), contents);
    const loaded = await loadOperationsEnvironment(fixture.root);
    expect(loaded.config.port).toBe(8081);
    expect(loaded.config.sessionSecret).toBe('a'.repeat(64));
    vi.stubEnv('PORT', '8082');
    expect((await loadOperationsEnvironment(fixture.root)).config.port).toBe(8082);
  });
  it('fails clearly when initial configuration is missing', async () => {
    await expect(loadOperationsEnvironment(fixture.root)).rejects.toThrow('Missing .env');
  });
});
