import { tracks, type Confirmation, type Role } from './domain.js';

export const receiptRole = (role: Role): string => role === 'track-lead' ? 'Track lead' : 'Attendee';
export const receiptTrack = (track: Confirmation['track']): string => tracks.find(item => item.code === track)?.label ?? 'Not selected';
export const receiptTime = (arrived: string): string => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Oslo', dateStyle: 'medium', timeStyle: 'long'
}).format(new Date(arrived));

export function receiptText(receipt: Confirmation): string {
  const line = (value: string) => value.replace(/\s+/gu, ' ').trim();
  return [
    'Norwegian FHIR Hackathon 2026',
    'Check-in confirmation',
    `Name: ${line(receipt.name)}`,
    `Email: ${line(receipt.email)}`,
    `Primary track: ${receipt.track || 'Not selected'}`,
    `Checked in: ${receiptTime(receipt.arrived)}`,
    `Receipt reference: ${receipt.receiptId}`
  ].join('\n');
}
