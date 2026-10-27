import { readFile } from 'node:fs/promises';
import { loadConfig } from './config.js';
import { BlazeStore } from './fhir.js';
import { RegistrationService } from './registration.js';
import { importRoster, parseRoster } from './imports.js';

const [source, file] = process.argv.slice(2);
if ((source !== 'roster' && source !== 'staff') || !file) {
  throw new Error('Usage: npm run import -- roster|staff "D:\\path\\reviewed-roster.csv"');
}
const config = loadConfig();
const service = new RegistrationService(new BlazeStore(config.fhir), config.sessionSecret);
await service.initialize();
const count = await importRoster(service, source, parseRoster(await readFile(file, 'utf8')));
console.log(`Imported ${count} ${source} entries. Replaced the selected list; absent rows were removed from it. The other roster and attendance history were preserved. No attendance was recorded.`);
