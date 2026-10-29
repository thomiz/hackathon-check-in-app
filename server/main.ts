import { loadConfig } from './config.js';
import { operationPaths, withOperationLock } from './operations-runtime.js';
import { startApplication, waitForApplication } from './startup.js';

const config = loadConfig();
const paths = operationPaths(config.fhir.baseUrl);
try {
  const running = await withOperationLock(paths, () => startApplication(config, paths));
  await waitForApplication(running);
} catch (error) {
  console.error('The check-in server failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
}
