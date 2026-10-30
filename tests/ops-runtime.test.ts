import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import {
  applicationState, appPortOpen, assertApplicationStopped, operationPaths, readOptionalFile, requestApplicationStop,
  serveApplicationControl, withOperationLock, writePrivateJson
} from '../server/operations-runtime';
import { startApplication } from '../server/startup';
import { Operations } from '../scripts/ops-core';
import { waitFor } from '../scripts/ops-platform';
import { operationsFixture, type OperationsFixture } from './ops-fixtures';

let fixture: OperationsFixture;
const cleanup: Array<() => Promise<void>> = [];
beforeEach(async () => { fixture = await operationsFixture(); });
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
  vi.restoreAllMocks();
  await rm(fixture.base, { recursive: true, force: true });
});

describe('runtime ownership and maintenance exclusion', () => {
  it('uses the same lock for localhost, IPv4 and IPv6 loopback spellings', () => {
    expect(operationPaths('http://localhost:8090/fhir').appPipe).toBe(operationPaths('http://127.0.0.1:8090/fhir/').appPipe);
    expect(operationPaths('http://[::1]:8090/fhir').gatePipe).toBe(operationPaths('http://localhost:8090/fhir').gatePipe);
  });
  it('excludes concurrent operations and releases locks on failure', async () => {
    await withOperationLock(fixture.paths, async () => {
      await expect(withOperationLock(fixture.paths, async () => undefined)).rejects.toThrow('database lock');
    });
    await expect(withOperationLock(fixture.paths, async () => { throw new Error('Synthetic failure'); })).rejects.toThrow('Synthetic failure');
    expect(await withOperationLock(fixture.paths, async () => 42)).toBe(42);
  });
  it('does not disclose the control token in status and rejects an incorrect token', async () => {
    const stop = vi.fn(async () => undefined);
    const release = await serveApplicationControl(fixture.paths, true, stop);
    cleanup.push(release);
    const state = await applicationState(fixture.paths);
    expect(state).toEqual({ managed: true, pid: process.pid });
    await writePrivateJson(fixture.paths.controlFile, { token: '0'.repeat(64) });
    await expect(requestApplicationStop(fixture.paths)).rejects.toThrow('did not accept');
    expect(stop).not.toHaveBeenCalled();
  });
  it('never sends a shutdown request to an app started manually', async () => {
    const stop = vi.fn(async () => undefined);
    cleanup.push(await serveApplicationControl(fixture.paths, false, stop));
    await expect(requestApplicationStop(fixture.paths)).rejects.toThrow('outside ops');
    await expect(assertApplicationStopped(fixture.paths, fixture.environment.config)).rejects.toThrow('still running');
    expect(stop).not.toHaveBeenCalled();
  });
  it('refuses maintenance when an unknown process owns even an unhealthy application port', async () => {
    const server = createServer(socket => socket.end());
    await new Promise<void>(resolve => server.listen(fixture.environment.config.port, '127.0.0.1', resolve));
    cleanup.push(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    await expect(assertApplicationStopped(fixture.paths, fixture.environment.config)).rejects.toThrow('still running');
  });
  it('starts a real synthetic app and shuts it down gracefully before stopping Blaze', async () => {
    const running = await withOperationLock(fixture.paths, () => startApplication(
      fixture.environment.config, fixture.paths, true, fixture.store
    ));
    cleanup.push(running.close);
    const url = `http://127.0.0.1:${fixture.environment.config.port}/api/health`;
    expect(await (await fetch(url)).json()).toEqual({ status: 'ok' });
    const original = fixture.store.search.bind(fixture.store);
    let entered: () => void = () => undefined;
    let resume: () => void = () => undefined;
    const inRequest = new Promise<void>(resolve => { entered = resolve; });
    const requestCanFinish = new Promise<void>(resolve => { resume = resolve; });
    vi.spyOn(fixture.store, 'search').mockImplementationOnce(async (type, query) => {
      entered();
      await requestCanFinish;
      return original(type, query);
    });
    const request = fetch(url, { signal: AbortSignal.timeout(5000) });
    try {
      await inRequest;
      const operations = new Operations(fixture.environment, fixture.blaze, fixture.service);
      const stopping = operations.stop();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(fixture.blaze.events).not.toContain('stop');
      resume();
      const response = await request;
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'ok' });
      await stopping;
    } finally { resume(); }
    await running.closed;
    expect(fixture.blaze.events).toEqual(['stop']);
    expect(await applicationState(fixture.paths)).toBeUndefined();
    expect(await appPortOpen(fixture.environment.config)).toBe(false);
    expect(await readOptionalFile(fixture.paths.controlFile)).toBeUndefined();
  });
  it('releases application ownership if database initialization fails', async () => {
    fixture.store.resources.clear();
    fixture.store.fail = true;
    await expect(withOperationLock(fixture.paths, () => startApplication(
      fixture.environment.config, fixture.paths, true, fixture.store
    ))).rejects.toThrow('Injected transaction failure');
    await waitFor(async () => ({ ok: !(await applicationState(fixture.paths)), detail: 'lease still open' }), 'Test cleanup', 1000);
    expect(await readOptionalFile(fixture.paths.controlFile)).toBeUndefined();
  });
});
