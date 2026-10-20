import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { MedplumStore } from './fhir.js';
import { preloadStaff } from './preload.js';

const config = loadConfig();
const { app, service, worker } = await buildApp(new MedplumStore(config.medplum), config);
try {
  await service.initialize();
  const preloaded = await preloadStaff(service);
  if (preloaded) app.log.info({ count: preloaded }, 'Preloaded agenda staff roster; no attendance recorded.');
  if (!config.email) app.log.warn('Brevo is not configured. Check-ins are saved, but email Tasks will remain queued.');
  const timer = setInterval(() => {
    void worker.tick().catch(error => app.log.error({ message: error instanceof Error ? error.message : 'Unknown worker error' }, 'Email worker failed'));
  }, 5000);
  app.addHook('onClose', async () => clearInterval(timer));
  const shutdown = () => { void app.close().catch(error => { console.error(error); process.exitCode = 1; }); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error, 'Startup failed; no registration server is available.');
  await app.close();
  process.exitCode = 1;
}
