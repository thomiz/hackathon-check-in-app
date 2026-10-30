import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { createConnection, createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { Config } from './config.js';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

export function operationPaths(baseUrl: string, root = repositoryRoot) {
  const url = new URL(baseUrl);
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) url.hostname = '127.0.0.1';
  const key = createHash('sha256').update(url.href.replace(/\/+$/, '')).digest('hex').slice(0, 24);
  const directory = join(root, 'data', 'ops', key);
  const pipe = (name: string) => process.platform === 'win32'
    ? `\\\\.\\pipe\\hackathon-check-in-${key}-${name}`
    : join(tmpdir(), `hackathon-check-in-${key}-${name}.sock`);
  return {
    directory, gatePipe: pipe('operation'), appPipe: pipe('app'),
    controlFile: join(directory, 'control.json'), pendingFile: join(directory, 'pending.json'),
    backupFile: join(directory, 'last-backup.json')
  };
}
export type OperationPaths = ReturnType<typeof operationPaths>;

export function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

export async function readOptionalFile(path: string): Promise<string | undefined> {
  try { return await readFile(path, 'utf8'); }
  catch (error) { if (hasCode(error, 'ENOENT')) return undefined; throw error; }
}

export async function writePrivateJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await rename(temporary, path);
  } finally {
    try { await unlink(temporary); }
    catch (error) { if (!hasCode(error, 'ENOENT')) throw error; }
  }
}

async function listen(server: Server, path: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const failed = (error: Error) => reject(hasCode(error, 'EADDRINUSE')
      ? new Error('Another app or operation holds the database lock. Stop it or wait for it to finish; do not delete the database.')
      : error);
    server.once('error', failed);
    server.listen(path, () => { server.removeListener('error', failed); resolve(); });
  });
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

export async function withOperationLock<T>(paths: OperationPaths, action: () => Promise<T>): Promise<T> {
  const server = createServer(socket => socket.destroy());
  await listen(server, paths.gatePipe);
  try { return await action(); }
  finally { await closeServer(server); }
}

const appStateSchema = z.object({ pid: z.number().int().positive(), managed: z.boolean() });
export type ApplicationState = z.infer<typeof appStateSchema>;

async function controlRequest(paths: OperationPaths, message: object): Promise<unknown | undefined> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(paths.appPipe);
    let response = '';
    let finished = false;
    const fail = (error: Error) => { finished = true; socket.destroy(); reject(error); };
    const timer = setTimeout(() => fail(new Error('The application control channel did not respond. Keep services unchanged and inspect the app window.')), 3000);
    socket.once('connect', () => socket.write(`${JSON.stringify(message)}\n`));
    socket.on('data', data => {
      response += data.toString();
      if (response.length > 4096) { fail(new Error('Invalid application control response.')); return; }
      if (!response.includes('\n')) return;
      try {
        const value: unknown = JSON.parse(response.trim());
        finished = true;
        socket.destroy();
        resolve(value);
      } catch { fail(new Error('Invalid application control response.')); }
    });
    socket.once('error', error => {
      if (finished) return;
      if (hasCode(error, 'ENOENT') || hasCode(error, 'ECONNREFUSED')) { finished = true; resolve(undefined); }
      else fail(error);
    });
    socket.once('close', () => {
      clearTimeout(timer);
      if (!finished) fail(new Error('The application control channel closed without a response.'));
    });
  });
}

export async function applicationState(paths: OperationPaths): Promise<ApplicationState | undefined> {
  const response = await controlRequest(paths, { action: 'status' });
  if (response === undefined) return undefined;
  const parsed = appStateSchema.safeParse(response);
  if (!parsed.success) throw new Error('Invalid application state. Keep services unchanged and inspect the app window.');
  return parsed.data;
}

export async function serveApplicationControl(paths: OperationPaths, managed: boolean, stop: () => Promise<void>) {
  const token = randomBytes(32).toString('hex');
  const server = createServer(socket => {
    let input = '';
    const timer = setTimeout(() => socket.destroy(), 3000);
    socket.once('close', () => clearTimeout(timer));
    socket.on('error', error => {
      if (!hasCode(error, 'ECONNRESET') && !hasCode(error, 'EPIPE')) console.error('Application control connection failed:', error.message);
    });
    socket.on('data', data => {
      input += data.toString();
      if (input.length > 1024) { socket.destroy(); return; }
      if (!input.includes('\n')) return;
      const request = z.object({ action: z.enum(['status', 'stop']), token: z.string().optional() });
      let value: unknown;
      try { value = JSON.parse(input.trim()); }
      catch { socket.end('{"error":"Invalid control request."}\n'); return; }
      const parsed = request.safeParse(value);
      if (!parsed.success) { socket.end('{"error":"Invalid control request."}\n'); return; }
      if (parsed.data.action === 'status') {
        socket.end(`${JSON.stringify({ pid: process.pid, managed })}\n`);
        return;
      }
      const supplied = Buffer.from(parsed.data.token ?? '');
      const expected = Buffer.from(token);
      if (!managed || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
        socket.end('{"error":"This app must be stopped from its own terminal."}\n');
        return;
      }
      socket.end('{"accepted":true}\n', () => {
        void stop().catch(error => console.error('Application shutdown failed:', error instanceof Error ? error.message : 'Unknown error'));
      });
    });
  });
  await listen(server, paths.appPipe);
  try {
    if (managed) {
      await writePrivateJson(paths.controlFile, { token });
    }
  } catch (error) { await closeServer(server); throw error; }
  return async () => {
    try {
      if (managed) {
        try { await unlink(paths.controlFile); }
        catch (error) { if (!hasCode(error, 'ENOENT')) throw error; }
      }
    } finally { await closeServer(server); }
  };
}

export async function requestApplicationStop(paths: OperationPaths): Promise<void> {
  const state = await applicationState(paths);
  if (!state) return;
  if (!state.managed) throw new Error('The app was started outside ops. Press Ctrl+C in its terminal before continuing.');
  const raw = await readOptionalFile(paths.controlFile);
  if (!raw) throw new Error('No matching app control token exists in this checkout. Stop the app from its own terminal.');
  const { token } = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(JSON.parse(raw));
  const response = await controlRequest(paths, { action: 'stop', token });
  if (!z.object({ accepted: z.literal(true) }).safeParse(response).success) {
    throw new Error('The app did not accept the stop request. Stop it from its own terminal.');
  }
}

export function localAppUrl(config: Config): string {
  const host = config.host === '0.0.0.0' ? '127.0.0.1' : config.host === '::' ? '[::1]' : config.host;
  return `http://${host.includes(':') && !host.startsWith('[') ? `[${host}]` : host}:${config.port}`;
}

export async function appPortOpen(config: Config): Promise<boolean> {
  const url = new URL(localAppUrl(config));
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: url.hostname.replace(/^\[|\]$/g, ''), port: config.port });
    socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Could not establish whether the app port is stopped.')); });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', error => {
      if (hasCode(error, 'ECONNREFUSED')) resolve(false);
      else reject(error);
    });
  });
}

export async function assertApplicationStopped(paths: OperationPaths, config: Config): Promise<void> {
  if (await applicationState(paths) || await appPortOpen(config)) {
    throw new Error('The check-in app or another listener is still running. Run "npm run ops -- stop --app-only" (or Ctrl+C for a manual app) before maintenance.');
  }
}

export const pendingOperationSchema = z.object({
  operationKey: z.string(), action: z.string(), stage: z.string(), startedAt: z.string(), backup: z.string()
});
export type PendingOperation = z.infer<typeof pendingOperationSchema>;

export async function pendingOperation(paths: OperationPaths): Promise<PendingOperation | undefined> {
  const raw = await readOptionalFile(paths.pendingFile);
  if (raw === undefined) return undefined;
  try { return pendingOperationSchema.parse(JSON.parse(raw)); }
  catch { throw new Error(`The maintenance journal is invalid. Keep the app stopped and inspect ${paths.pendingFile}.`); }
}

export async function assertMaintenanceComplete(paths: OperationPaths): Promise<void> {
  const pending = await pendingOperation(paths);
  if (pending) throw new Error(`Unfinished ${pending.action} (${pending.stage}). Keep the app stopped and rerun the same ops maintenance command. Original backup: ${pending.backup}`);
}
