import { z } from 'zod';

export const CANONICAL = 'https://hl7.no/fhir/ig/hackathon-attendance-registration-app';
export const EVENT = 'hackathon-2026';
export const ID_SYSTEM = `${CANONICAL}/identifier/participant-2026`;
export const ROLE_SYSTEM = `${CANONICAL}/CodeSystem/participation-role`;
export const TRACK_SYSTEM = `${CANONICAL}/CodeSystem/track`;
export const JOB_SYSTEM = `${CANONICAL}/CodeSystem/workflow`;
export const EXT = {
  affiliation: `${CANONICAL}/StructureDefinition/affiliation`,
  track: `${CANONICAL}/StructureDefinition/primary-track`,
  manual: `${CANONICAL}/StructureDefinition/manual-registration`,
  attempts: `${CANONICAL}/StructureDefinition/email-attempts`,
  nextAttempt: `${CANONICAL}/StructureDefinition/email-next-attempt`
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
export type Details = z.infer<typeof detailsSchema>;
export type Candidate = { token: string; name: string; affiliation: string };
export type Selection = Details & { selection: string };
export type Confirmation = { name: string; alreadyCheckedIn: boolean; emailStatus: string };
export type DashboardRow = Details & {
  id: string;
  personId: string;
  role: Role;
  arrived: string;
  manual: boolean;
  taskId: string;
  emailStatus: string;
  emailReason: string;
};
export type Dashboard = {
  totals: { roster: number; staff: number; checkedIn: number; rosterMissing: number; staffMissing: number; manual: number; attendees: number; trackLeads: number };
  tracks: Record<string, number>;
  rows: DashboardRow[];
};
