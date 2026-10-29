import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importRosters, type ImportRow } from '../server/imports';
import { operationPaths } from '../server/operations-runtime';
import { RegistrationService } from '../server/registration';
import type { BackupRecord } from '../scripts/ops-backup';
import type { BlazeContainer, BlazeController, OperationsEnvironment } from '../scripts/ops-platform';
import { MemoryStore } from './memory-store';

export const attendee: ImportRow = {
  id: 'ops-alice', name: 'Alice Example', email: 'alice@example.invalid', affiliation: 'Synthetic', track: 'smart', role: 'attendee'
};
export const lead: ImportRow = {
  id: 'ops-bob', name: 'Bob Example', email: 'bob@example.invalid', affiliation: 'Synthetic', track: 'fhir-101', role: 'track-lead'
};

export async function unusedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port allocated.');
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}

export class TestBlaze implements BlazeController {
  events: string[] = [];
  readonly container: BlazeContainer;
  constructor(readonly data: string, fhirUrl: string) {
    this.container = {
      Id: 'synthetic-blaze-id',
      State: { Running: true, Status: 'running', Health: { Status: 'healthy' } },
      Mounts: [{ Type: 'bind', Source: data, Destination: '/app/data' }],
      Config: { Env: [`BASE_URL=${new URL(fhirUrl).origin}`] },
      HostConfig: { PortBindings: { '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: new URL(fhirUrl).port }] } }
    };
  }
  async dataDirectory() { return this.data; }
  async inspect() { return structuredClone(this.container); }
  async validateContainer() {}
  async health() { return { ok: this.container.State.Running, detail: this.container.State.Running ? 'healthy' : 'stopped' }; }
  async requireHealthy() { if (!this.container.State.Running) throw new Error('Synthetic Blaze is stopped.'); }
  async start() { this.events.push('start'); this.container.State.Running = true; this.container.State.Status = 'running'; }
  async resume() { this.events.push('resume'); this.container.State.Running = true; this.container.State.Status = 'running'; }
  async stop() { this.events.push('stop'); this.container.State.Running = false; this.container.State.Status = 'exited'; }
}

export async function operationsFixture() {
  const base = await mkdtemp(join(tmpdir(), 'checkin-ops-test-'));
  const root = join(base, 'checkout');
  const data = join(root, 'data', 'blaze');
  const backups = join(base, 'backups');
  await mkdir(data, { recursive: true });
  await mkdir(backups);
  const port = await unusedPort();
  const fhirUrl = `http://127.0.0.1:${await unusedPort()}/fhir`;
  // The key includes a synthetic path so independent tests never share runtime locks.
  const paths = operationPaths(`${fhirUrl}/${randomUUID()}`, root);
  const environment: OperationsEnvironment = {
    root, paths, env: { ...process.env, BLAZE_DATA_DIR: data },
    config: {
      host: '127.0.0.1', port, publicUrl: `http://localhost:${port}`, privacyUrl: 'https://example.invalid/privacy',
      fhir: { baseUrl: fhirUrl }, sessionSecret: 'synthetic-operations-test-secret-at-least-32-characters',
      staffUsername: 'organizer', staffPasswordHash: `${'a'.repeat(32)}:${'b'.repeat(128)}`
    }
  };
  const store = new MemoryStore();
  const service = new RegistrationService(store, environment.config.sessionSecret);
  await service.initialize();
  await importRosters(service, { roster: [attendee], staff: [attendee] });
  const blaze = new TestBlaze(data, fhirUrl);
  const backupRecord: BackupRecord = {
    version: 1, createdAt: new Date().toISOString(), directory: join(backups, 'synthetic-verified'),
    source: data, fhirBaseUrl: fhirUrl, fileCount: 1, bytes: 42, digest: 'a'.repeat(64)
  };
  await mkdir(backupRecord.directory);
  await writeFile(join(backupRecord.directory, 'backup.json'), JSON.stringify(backupRecord));
  return { base, root, data, backups, environment, paths, store, service, blaze, backupRecord };
}
export type OperationsFixture = Awaited<ReturnType<typeof operationsFixture>>;
