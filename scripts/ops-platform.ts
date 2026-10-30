import { execFile } from 'node:child_process';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parse } from 'dotenv';
import { z } from 'zod';
import { loadConfig, type Config } from '../server/config.js';
import { localAppUrl, operationPaths, repositoryRoot } from '../server/operations-runtime.js';

export interface CommandResult { code: number; stdout: string; stderr: string }
export type CommandRunner = (program: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv; timeout?: number }) => Promise<CommandResult>;

export const runCommand: CommandRunner = (program, args, options) => new Promise((resolve, reject) => {
  execFile(program, args, { ...options, timeout: options.timeout ?? 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
    if (error?.killed) { reject(new Error(`${program} timed out. Its outcome may be uncertain; inspect Docker before retrying.`)); return; }
    if (error && typeof error.code !== 'number') {
      reject(new Error(`${program} could not run (${error.code ?? 'unknown error'}). Check the installed prerequisites and PATH.`));
      return;
    }
    resolve({ code: error && typeof error.code === 'number' ? error.code : 0, stdout, stderr });
  });
});

export function isWithin(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

export function canonicalFhirUrl(value: string): string {
  const url = new URL(value);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.protocol !== 'http:' ||
    url.username || url.password || url.search || url.hash) {
    throw new Error('Operations requires a local, unauthenticated HTTP Blaze endpoint. Do not expose Blaze on the network.');
  }
  url.hostname = '127.0.0.1';
  return url.href.replace(/\/+$/, '');
}

export async function loadOperationsEnvironment(root = repositoryRoot) {
  const file = resolve(root, '.env');
  let contents: string;
  try { contents = await readFile(file, 'utf8'); }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error('Missing .env. Run "npm run configure" and complete the initial installation first.');
    }
    throw error;
  }
  const env = { ...parse(contents), ...process.env };
  const config = loadConfig(env);
  const fhir = canonicalFhirUrl(config.fhir.baseUrl);
  if (new URL(fhir).pathname !== '/fhir') throw new Error('Operations expects the Compose Blaze endpoint ending in /fhir.');
  if (!env.BLAZE_DATA_DIR?.trim()) throw new Error('Set BLAZE_DATA_DIR explicitly in .env to the existing Blaze database directory.');
  return { root, env, config, paths: operationPaths(config.fhir.baseUrl, root) };
}
export type OperationsEnvironment = Awaited<ReturnType<typeof loadOperationsEnvironment>>;

export interface HealthResult { ok: boolean; detail: string }
export async function httpHealth(url: string, app = false, fetcher: typeof fetch = fetch): Promise<HealthResult> {
  try {
    const response = await fetcher(url, { signal: AbortSignal.timeout(3000), redirect: 'error' });
    if (!response.ok) return { ok: false, detail: `HTTP ${response.status}` };
    if (app) {
      const body: unknown = await response.json();
      if (!z.object({ status: z.literal('ok') }).safeParse(body).success) return { ok: false, detail: 'Unexpected application health response' };
    } else await response.arrayBuffer();
    return { ok: true, detail: 'healthy' };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? `Health request failed (${error.name})` : 'Health request failed' };
  }
}

export async function waitFor(check: () => Promise<HealthResult>, label: string, timeout = 180000): Promise<void> {
  const deadline = Date.now() + timeout;
  let result: HealthResult;
  do {
    result = await check();
    if (result.ok) return;
    if (Date.now() >= deadline) break;
    await sleep(Math.min(1000, Math.max(0, deadline - Date.now())));
  } while (Date.now() <= deadline);
  throw new Error(`${label} did not become ready within ${Math.ceil(timeout / 1000)} seconds: ${result.detail}.`);
}

const composeSchema = z.object({
  services: z.object({ blaze: z.object({
    network_mode: z.string().optional(),
    environment: z.object({ BASE_URL: z.string() }),
    ports: z.array(z.object({ host_ip: z.string(), published: z.union([z.string(), z.number()]), target: z.number(), protocol: z.string().optional() })),
    volumes: z.array(z.object({ type: z.string(), source: z.string(), target: z.string() }))
  }) })
});
const containerSchema = z.object({
  Id: z.string(),
  State: z.object({ Running: z.boolean(), Status: z.string(), Health: z.object({ Status: z.string() }).optional() }),
  Mounts: z.array(z.object({ Type: z.string(), Source: z.string(), Destination: z.string() })),
  Config: z.object({ Env: z.array(z.string()) }),
  HostConfig: z.object({ PortBindings: z.record(z.array(z.object({ HostIp: z.string(), HostPort: z.string() })).nullable()).nullable() })
});
export type BlazeContainer = z.infer<typeof containerSchema>;

export interface BlazeController {
  dataDirectory(): Promise<string>;
  inspect(): Promise<BlazeContainer | undefined>;
  validateContainer(container: BlazeContainer): Promise<void>;
  health(): Promise<HealthResult>;
  requireHealthy(): Promise<void>;
  start(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
}

export class LocalBlaze implements BlazeController {
  constructor(private environment: OperationsEnvironment, private run: CommandRunner = runCommand) {}

  private async docker(args: string[], label: string, timeout?: number): Promise<string> {
    const result = await this.run(process.platform === 'win32' ? 'docker.exe' : 'docker', args, {
      cwd: this.environment.root, env: this.environment.env, timeout
    });
    if (result.code !== 0) throw new Error(`${label} failed (exit ${result.code}). Check Docker Desktop and run the Docker command manually for diagnostics.`);
    return result.stdout.trim();
  }
  private compose(args: string[], label: string, timeout?: number) {
    return this.docker(['compose', '--project-directory', this.environment.root, '--file', resolve(this.environment.root, 'compose.yaml'),
      '--env-file', resolve(this.environment.root, '.env'), ...args], label, timeout);
  }
  private async checkEngine() {
    const host = this.environment.env.DOCKER_CONTEXT
      ? await this.docker(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], 'Docker context inspection')
      : this.environment.env.DOCKER_HOST || await this.docker(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], 'Docker context inspection');
    if (!(host.startsWith('npipe:////./pipe/') || (process.platform !== 'win32' && host.startsWith('unix:///')))) {
      throw new Error('Operations supports only the local Docker engine. Remote Docker contexts cannot safely back up a local directory.');
    }
    const raw = await this.docker(['version', '--format', '{{json .Server}}'], 'Docker engine check');
    const server = z.object({ Os: z.literal('linux') }).safeParse(JSON.parse(raw));
    if (!server.success) throw new Error('Docker Desktop must be running with Linux containers.');
  }
  async dataDirectory(): Promise<string> {
    const raw = await this.compose(['config', '--format', 'json'], 'Compose configuration validation');
    const parsed = composeSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new Error('Unsupported Compose configuration. Keep the standalone Blaze service, explicit loopback port and host bind mount.');
    const service = parsed.data.services.blaze;
    const base = new URL(this.environment.config.fhir.baseUrl);
    if (service.network_mode === 'host' || service.ports.length !== 1 || service.ports[0]?.host_ip !== '127.0.0.1' ||
      service.ports[0]?.target !== 8080 || String(service.ports[0]?.published) !== (base.port || '80') ||
      (service.ports[0]?.protocol ?? 'tcp') !== 'tcp' ||
      canonicalFhirUrl(`${service.environment.BASE_URL.replace(/\/+$/, '')}/fhir`) !== canonicalFhirUrl(base.href)) {
      throw new Error('Compose must publish Blaze only on 127.0.0.1, with its port and BASE_URL matching FHIR_BASE_URL.');
    }
    const mounts = service.volumes.filter(volume => volume.target === '/app/data');
    if (mounts.length !== 1 || mounts[0]?.type !== 'bind') throw new Error('Blaze must use one host bind mount at /app/data.');
    const directory = await realpath(resolve(this.environment.root, mounts[0].source));
    if (!(await stat(directory)).isDirectory()) throw new Error('The configured Blaze data path is not a directory.');
    if (isWithin(directory, this.environment.paths.directory)) throw new Error('The Blaze data directory must not contain the operations state directory.');
    return directory;
  }
  async inspect(): Promise<BlazeContainer | undefined> {
    await this.checkEngine();
    const ids = (await this.compose(['ps', '--all', '--quiet', 'blaze'], 'Blaze container lookup')).split(/\s+/).filter(Boolean);
    if (!ids.length) return undefined;
    if (ids.length !== 1) throw new Error('Expected exactly one Blaze container; do not run two containers on the same database.');
    const raw = await this.docker(['inspect', '--format', '{{json .}}', ids[0]!], 'Blaze container inspection');
    const parsed = containerSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new Error('Docker returned an unsupported Blaze container description.');
    return parsed.data;
  }
  async validateContainer(container: BlazeContainer): Promise<void> {
    const data = await this.dataDirectory();
    const mount = container.Mounts.find(m => m.Destination === '/app/data');
    if (mount?.Type !== 'bind') throw new Error('The existing Blaze container does not use the expected host bind mount.');
    const source = process.platform === 'win32'
      ? mount.Source.replace(/^\/(?:run\/desktop\/mnt\/host|host_mnt|mnt\/host)\/([a-z])\//i, '$1:/')
      : mount.Source;
    const actual = await realpath(source);
    if (relative(actual, data) !== '') throw new Error('The running/stopped Blaze container uses a different database directory. Resolve the configuration mismatch before maintenance.');
    const bindings = container.HostConfig.PortBindings;
    const ports = bindings?.['8080/tcp'];
    const port = new URL(this.environment.config.fhir.baseUrl).port || '80';
    const base = container.Config.Env.find(value => value.startsWith('BASE_URL='))?.slice('BASE_URL='.length);
    if (Object.keys(bindings ?? {}).length !== 1 || ports?.length !== 1 || ports[0]?.HostIp !== '127.0.0.1' || ports[0]?.HostPort !== port ||
      !base || canonicalFhirUrl(`${base.replace(/\/+$/, '')}/fhir`) !== canonicalFhirUrl(this.environment.config.fhir.baseUrl)) {
      throw new Error('The existing Blaze container does not match the configured loopback endpoint. Resolve the mismatch before maintenance.');
    }
  }
  health() {
    return httpHealth(new URL('/health', this.environment.config.fhir.baseUrl).href);
  }
  async requireHealthy() {
    const container = await this.inspect();
    if (!container) throw new Error('Blaze has not been started. Start it before previewing or applying maintenance.');
    await this.validateContainer(container);
    const health = await this.health();
    if (!container.State.Running || container.State.Health?.Status !== 'healthy' || !health.ok) {
      throw new Error(`Blaze is not healthy (${container.State.Health?.Status ?? container.State.Status}; ${health.detail}). Keep the app stopped.`);
    }
  }
  async start() {
    await this.checkEngine();
    await this.dataDirectory();
    const existing = await this.inspect();
    if (existing) await this.validateContainer(existing);
    await this.compose(['up', '-d', 'blaze'], 'Blaze startup', 180000);
    await this.waitHealthy();
  }
  async resume() {
    const container = await this.inspect();
    if (!container) throw new Error('The backed-up Blaze container no longer exists. Keep registration closed and inspect Docker.');
    await this.validateContainer(container);
    await this.compose(['start', 'blaze'], 'Blaze restart', 90000);
    await this.waitHealthy();
  }
  private async waitHealthy() {
    await waitFor(async () => {
      const container = await this.inspect();
      if (!container) return { ok: false, detail: 'No Blaze container' };
      await this.validateContainer(container);
      if (['dead', 'exited'].includes(container.State.Status)) throw new Error('Blaze exited during startup. Inspect "docker compose logs blaze".');
      if (container.State.Health?.Status !== 'healthy') return { ok: false, detail: container.State.Health?.Status ?? container.State.Status };
      return this.health();
    }, 'Blaze');
  }
  async stop() {
    await this.checkEngine();
    const existing = await this.inspect();
    if (existing) await this.validateContainer(existing);
    await this.compose(['stop', 'blaze'], 'Blaze shutdown', 90000);
    const container = await this.inspect();
    if (container?.State.Running) throw new Error('Blaze did not stop. Do not copy its database files.');
  }
}

export const applicationHealth = (config: Config) => httpHealth(`${localAppUrl(config)}/api/health`, true);
