import { buildApp } from './app.js';
import type { Config } from './config.js';
import { BlazeStore, type FhirStore } from './fhir.js';
import { assertMaintenanceComplete, serveApplicationControl, type OperationPaths } from './operations-runtime.js';
import { preloadStaff } from './preload.js';

// Call while holding the operation lock; the application lease then lasts until close().
export async function startApplication(config: Config, paths: OperationPaths, managed = false, store: FhirStore = new BlazeStore(config.fhir)) {
  await assertMaintenanceComplete(paths);
  const { app, service } = await buildApp(store, config);
  let resolveClosed: () => void;
  let rejectClosed: (error: unknown) => void;
  const closed = new Promise<void>((resolve, reject) => { resolveClosed = resolve; rejectClosed = reject; });
  void closed.catch(error => { app.log.error(error, 'Shutdown failed; inspect the app before maintenance.'); process.exitCode = 1; });
  let closing: Promise<void> | undefined;
  let stopping = false;
  app.server.on('request', (_request, response) => {
    response.once('finish', () => {
      // Node 18 does not automatically close keep-alive sockets that become idle during shutdown.
      if (stopping) app.server.closeIdleConnections();
    });
  });
  const close = (): Promise<void> => {
    closing ??= (async () => {
      try {
        stopping = true;
        await app.close();
        await releaseControl();
        resolveClosed();
      } catch (error) { rejectClosed(error); throw error; }
    })();
    return closing;
  };
  let releaseControl: () => Promise<void>;
  try { releaseControl = await serveApplicationControl(paths, managed, close); }
  catch (error) { await app.close(); throw error; }
  try {
    await service.initialize();
    const preloaded = await preloadStaff(service);
    if (preloaded) app.log.info({ count: preloaded }, 'Preloaded agenda staff roster; no attendance recorded.');
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    await close();
    throw error;
  }
  return { close, closed };
}

export async function waitForApplication(running: Awaited<ReturnType<typeof startApplication>>): Promise<void> {
  const shutdown = () => {
    void running.close().catch(error => { console.error('Shutdown failed:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  try { await running.closed; }
  finally {
    process.removeListener('SIGINT', shutdown);
    process.removeListener('SIGTERM', shutdown);
  }
}
