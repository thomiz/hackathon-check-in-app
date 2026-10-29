import { loadConfig } from './config.js';
import { BlazeStore } from './fhir.js';
import { RegistrationService } from './registration.js';
import { resetCheckins } from './reset-checkins.js';

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] !== '--confirm-reset-checkins') {
  throw new Error('Stop the check-in app and back up Blaze first. Usage: npm run checkins:reset -- --confirm-reset-checkins');
}
const config = loadConfig();
const service = new RegistrationService(new BlazeStore(config.fhir), config.sessionSecret);
const count = await resetCheckins(service);
console.log(`Reset verified: removed ${count} event check-in records. Rosters, participant details and audit records were preserved.`);
