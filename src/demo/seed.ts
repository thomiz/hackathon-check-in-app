import type { List, Person, Resource } from 'fhir/r4';
import { CANONICAL, LISTS } from '../../shared/domain';

// SUSHI writes every FSH instance, including IG examples, to fsh-generated/resources.
// Vite inlines them at build time, so `npm run fhir:build` must run before a demo build.
const generated = import.meta.glob<Resource>('../../fhir/fsh-generated/resources/*.json', { eager: true, import: 'default' });

// The IG publishes the attendee example roster under its own identifier; the app looks for
// the event roster, so the demo maps it in memory without changing the IG examples.
export const DEMO_LIST_ALIASES: Record<string, string> = { 'synthetic-attendee-roster': LISTS.roster };

const DEMO_TYPES = new Set(['Person', 'Practitioner', 'List']);

export function demoResources(): Resource[] {
  const resources = Object.values(generated).filter(resource => DEMO_TYPES.has(resource.resourceType)).map(resource => structuredClone(resource));
  if (!resources.length) throw new Error('No FHIR IG examples were bundled. Run "npm run fhir:build" before building the demo.');
  const lists = resources.filter((resource): resource is List => resource.resourceType === 'List');
  for (const list of lists) {
    for (const identifier of list.identifier ?? []) {
      if (identifier.system === `${CANONICAL}/identifier/list` && identifier.value && DEMO_LIST_ALIASES[identifier.value]) {
        identifier.value = DEMO_LIST_ALIASES[identifier.value];
      }
    }
  }
  // An example Person may link to a checked-in Practitioner that the example check-in List
  // does not include. Add it, so the demo starts from a consistent "already checked in" state.
  const checkins = lists.find(list => list.identifier?.some(identifier => identifier.value === LISTS.checkins));
  if (checkins) {
    const listed = new Set((checkins.entry ?? []).map(entry => entry.item.reference));
    const practitioners = new Set(resources.filter(resource => resource.resourceType === 'Practitioner').map(resource => `Practitioner/${resource.id}`));
    for (const person of resources.filter((resource): resource is Person => resource.resourceType === 'Person')) {
      for (const reference of person.link?.map(link => link.target.reference) ?? []) {
        if (!reference || listed.has(reference) || !practitioners.has(reference)) continue;
        checkins.entry = [...(checkins.entry ?? []), { item: { reference }, date: checkins.date }];
        listed.add(reference);
      }
    }
  }
  return resources;
}
