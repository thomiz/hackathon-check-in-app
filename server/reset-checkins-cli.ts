import { loadConfig } from './config.js';
import { BlazeStore } from './fhir.js';
import { RegistrationService } from './registration.js';
import { resetCheckins } from './reset-checkins.js';
import { assertApplicationStopped, assertMaintenanceComplete, operationPaths, withOperationLock } from './operations-runtime.js';

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] !== '--confirm-reset-checkins') {
  throw new Error('Stop the check-in app and back up Blaze first. Usage: npm run checkins:reset -- --confirm-reset-checkins');
}
const config = loadConfig();
const service = new RegistrationService(new BlazeStore(config.fhir), config.sessionSecret);
const paths = operationPaths(config.fhir.baseUrl);
const count = await withOperationLock(paths, async () => {
  await assertMaintenanceComplete(paths);
  await assertApplicationStopped(paths, config);
  return resetCheckins(service);
});
console.log(`Reset verified: removed ${count} event check-in records. Rosters, participant details and audit records were preserved.`);
