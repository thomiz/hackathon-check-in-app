import { tracks, type Confirmation, type Role } from './domain.js';

export const receiptRole = (role: Role): string => role === 'track-lead' ? 'Track lead' : 'Attendee';
export const receiptTrack = (track: Confirmation['track']): string => tracks.find(item => item.code === track)?.label ?? 'Not selected';
export const receiptTime = (arrived: string): string => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Oslo', dateStyle: 'medium', timeStyle: 'long'
}).format(new Date(arrived));

const line = (value: string) => value.replace(/\s+/gu, ' ').trim();

export const receiptSubject = 'Norwegian FHIR Hackathon 2026 check-in confirmation';

export function receiptText(receipt: Confirmation): string {
  return [
    `Name: ${line(receipt.name)}`,
    `Primary track: ${receipt.track || 'Not selected'}`,
    `Checked in: ${receiptTime(receipt.arrived)}`,
    `Receipt reference: ${receipt.receiptId}`
  ].join('\n');
}

// RFC 6068 mailto URI so phone cameras (notably iOS) offer to open a pre-filled email to the attendee.
export function receiptMailto(receipt: Confirmation): string {
  const to = encodeURIComponent(line(receipt.email)).replace(/%40/gu, '@');
  const body = encodeURIComponent(receiptText(receipt).replace(/\n/gu, '\r\n'));
  return `mailto:${to}?subject=${encodeURIComponent(receiptSubject)}&body=${body}`;
}
