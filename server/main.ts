import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { BlazeStore } from './fhir.js';
import { preloadStaff } from './preload.js';

const config = loadConfig();
const { app, service } = await buildApp(new BlazeStore(config.fhir), config);
try {
  await service.initialize();
  const preloaded = await preloadStaff(service);
  if (preloaded) app.log.info({ count: preloaded }, 'Preloaded agenda staff roster; no attendance recorded.');
  const shutdown = () => { void app.close().catch(error => { console.error(error); process.exitCode = 1; }); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error, 'Startup failed; no registration server is available.');
  await app.close();
  process.exitCode = 1;
}
