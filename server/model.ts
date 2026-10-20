import type { Extension, List, Person, Practitioner, Task } from 'fhir/r4';
import { randomUUID } from 'node:crypto';
import { CANONICAL, EVENT, EXT, ID_SYSTEM, JOB_SYSTEM, ROLE_SYSTEM, TRACK_SYSTEM, type Details, type Role, detailsSchema, roleSchema } from '../shared/domain.js';
import { AppError } from './fhir.js';

export function extensions(details: Details): Extension[] {
  return [
    { url: EXT.affiliation, valueString: details.affiliation },
    ...(details.track ? [{ url: EXT.track, valueCoding: { system: TRACK_SYSTEM, code: details.track } }] : [])
  ];
}
export function profile(name: string) { return `${CANONICAL}/StructureDefinition/${name}`; }
export function detailsOf(resource: Person | Practitioner): Details {
  const name = resource.name?.[0];
  return detailsSchema.parse({
    name: name?.text ?? [...(name?.given ?? []), name?.family].filter(Boolean).join(' '),
    email: resource.telecom?.find(item => item.system === 'email')?.value,
    affiliation: resource.extension?.find(item => item.url === EXT.affiliation)?.valueString,
    track: resource.extension?.find(item => item.url === EXT.track)?.valueCoding?.code ?? ''
  });
}
export function person(id: string, details: Details, existing?: Person, stableIdentifier = id): Person {
  return {
    ...existing, resourceType: 'Person', id,
    meta: { ...existing?.meta, profile: [profile('expected-participant')] },
    identifier: existing?.identifier ?? [{ system: ID_SYSTEM, value: stableIdentifier }],
    name: [{ text: details.name }],
    telecom: [{ system: 'email', value: details.email }],
    extension: extensions(details)
  };
}
export function practitioner(id: string, details: Details, role: Role, existing?: Practitioner, stableIdentifier = id): Practitioner {
  return {
    ...existing, resourceType: 'Practitioner', id,
    meta: { ...existing?.meta, profile: [profile('checked-in-participant')] },
    identifier: existing?.identifier ?? [{ system: ID_SYSTEM, value: stableIdentifier }],
    name: [{ text: details.name }], telecom: [{ system: 'email', value: details.email }],
    extension: extensions(details),
    qualification: [{ code: { coding: [{ system: ROLE_SYSTEM, code: role }] } }]
  };
}
export function roleOf(resource: Practitioner): Role {
  const code = resource.qualification?.flatMap(q => q.code.coding ?? []).find(c => c.system === ROLE_SYSTEM)?.code;
  const parsed = roleSchema.safeParse(code);
  if (!parsed.success) throw new AppError(503, 'A checked-in Practitioner has an invalid event role.');
  return parsed.data;
}
export function emptyList(id: string): List {
  return {
    resourceType: 'List', id, meta: { profile: [profile(id.endsWith('checkins') ? 'checkin-list' : 'roster-list')] },
    identifier: [{ system: `${CANONICAL}/identifier/list`, value: id }],
    title: id, status: 'current', mode: 'working',
    code: { coding: [{ system: `${CANONICAL}/CodeSystem/list-purpose`, code: id.split('-').at(-1) }] },
    date: new Date().toISOString()
  };
}
export function refs(list: List): string[] {
  return [...new Set((list.entry ?? []).filter(e => !e.deleted).map(e => e.item.reference).filter((ref): ref is string => !!ref))];
}
export function emailTask(practitionerId: string, participantIdentifier: string): Task {
  return {
    resourceType: 'Task', id: randomUUID(), meta: { profile: [profile('confirmation-email')] },
    identifier: [{ system: `${CANONICAL}/identifier/email`, value: `${EVENT}:${participantIdentifier}` }],
    status: 'ready', intent: 'order',
    code: { coding: [{ system: JOB_SYSTEM, code: 'confirmation-email' }] },
    focus: { reference: `Practitioner/${practitionerId}` }, authoredOn: new Date().toISOString(),
    extension: [{ url: EXT.attempts, valueInteger: 0 }]
  };
}
