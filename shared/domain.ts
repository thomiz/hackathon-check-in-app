import { z } from 'zod';
import type { Practitioner } from 'fhir/r4';

export const CANONICAL = 'https://hl7.no/fhir/ig/hackathon-check-in-app';
export const EVENT = 'hackathon-2026';
export const ID_SYSTEM = `${CANONICAL}/identifier/participant-2026`;
export const ROLE_SYSTEM = `${CANONICAL}/CodeSystem/participation-role`;
export const TRACK_SYSTEM = `${CANONICAL}/CodeSystem/track`;
export const EXT = {
  affiliation: `${CANONICAL}/StructureDefinition/affiliation`,
  track: `${CANONICAL}/StructureDefinition/primary-track`,
  manual: `${CANONICAL}/StructureDefinition/manual-registration`
};
export const LISTS = {
  roster: `${EVENT}-roster`,
  staff: `${EVENT}-staff`,
  checkins: `${EVENT}-checkins`
};
export const tracks = [
  { code: 'care-plans', label: 'Modeling Patient care plans as FHIR' },
  { code: 'smart', label: 'SMART on FHIR' },
  { code: 'medication-definition', label: 'Medication Definition on FHIR - Exploration of FHIR services from EMA and NoMA' },
  { code: 'ihe-mhd', label: 'Document sharing for IHE MHD' },
  { code: 'ehds-summary', label: 'EHDS patient summary' },
  { code: 'fhir-101', label: 'FHIR 101: Introduction to HL7 FHIR with practical assignments' }
] as const;
export const trackSchema = z.enum(['', 'care-plans', 'smart', 'medication-definition', 'ihe-mhd', 'ehds-summary', 'fhir-101']);
export const roleSchema = z.enum(['attendee', 'track-lead']);
export type Role = z.infer<typeof roleSchema>;
export const rosterSourceSchema = z.enum(['roster', 'staff']);
export type RosterSource = z.infer<typeof rosterSourceSchema>;
export const rosterSourceLabels: Record<RosterSource, string> = { roster: 'attendee list', staff: 'staff list' };
export const detailsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  affiliation: z.string().trim().min(1).max(160),
  track: trackSchema
});
export const checkinSchema = detailsSchema.extend({ selection: z.string().min(1).max(2048) });
export const manualSchema = detailsSchema.extend({
  role: roleSchema,
  reason: z.string().trim().min(5).max(500),
  requestId: z.string().uuid()
});
export const rosterEntrySchema = detailsSchema.extend({ role: roleSchema, reason: z.string().trim().min(5).max(500) });
export const rosterRemovalSchema = z.object({ reason: z.string().trim().min(5).max(500) });
export const rosterImportSchema = z.object({
  source: rosterSourceSchema,
  csv: z.string().min(1).max(900000),
  removeMissing: z.boolean().default(true)
});
export const rosterImportApplySchema = rosterImportSchema.extend({ token: z.string().regex(/^[a-f0-9]{64}$/) });
export type RosterImportPreview = {
  source: RosterSource; total: number; added: number; updated: number; removed: number; unchanged: number;
  confirmedDetailsPreserved: number; changes: { added: string[]; updated: string[]; removed: string[] }; token: string;
};
export type RosterImportResult = { imported: number; added: number; updated: number; removed: number; backup?: string };
export type Details = z.infer<typeof detailsSchema>;
export type Candidate = { token: string; name: string; affiliation: string; alreadyCheckedIn: boolean };
export type Selection = Details & { selection: string };
export type StaffSelection = Selection & { id: string; lists: RosterSource[] };
export type RosterChange = { personId: string; id: string; created: boolean; lists: RosterSource[] };
export type Confirmation = Details & { alreadyCheckedIn: boolean; role: Role; arrived: string; receiptId: string; practitioner: Practitioner };
export type DashboardRow = Details & {
  id: string;
  personId: string;
  role: Role;
  arrived: string;
  manual: boolean;
  lists: RosterSource[];
};
export type MissingPerson = Details & { personId: string };
export type Dashboard = {
  totals: { roster: number; staff: number; checkedIn: number; rosterMissing: number; staffMissing: number; manual: number; attendees: number; staffCheckedIn: number; trackLeads: number };
  missing: { attendees: MissingPerson[]; staff: MissingPerson[] };
  tracks: Record<string, number>;
  rows: DashboardRow[];
};
