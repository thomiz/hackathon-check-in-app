import { createHash } from 'node:crypto';
import { z } from 'zod';
import { detailsSchema, roleSchema } from '../shared/domain.js';
import type { ImportRow } from './imports.js';

const trackCodes: Record<string, ImportRow['track']> = {
  'digital home monitoring': 'care-plans',
  'fhir 101': 'fhir-101',
  'smart on fhir': 'smart',
  'ihe document sharing': 'ihe-mhd',
  'ehds patient summary': 'ehds-summary',
  'medication definition': 'medication-definition'
};

export function agendaRoster(markdown: string): { rows: ImportRow[]; warnings: string[] } {
  const headings = [...markdown.matchAll(/^#### Track leads?(?: and partners)?\s*$/gim)];
  if (!headings.length) throw new Error('Agenda has no Track leads section.');
  const rows: ImportRow[] = [];
  const warnings: string[] = [];
  for (const [index, heading] of headings.entries()) {
    const start = heading.index! + heading[0].length;
    const end = headings[index + 1]?.index ?? markdown.length;
    const section = markdown.slice(start, end).split(/^#{1,4} /m)[0]!;
    const lines = section.split(/\r?\n/).filter(line => line.trim().startsWith('|'));
    const header = lines.shift()?.split('|').slice(1, -1).map(cell => cell.trim().toLowerCase());
    if (header?.join(',') !== 'track,name,contact,affiliate' && header?.join(',') !== 'role,name,contact,affiliate') {
      throw new Error('Unexpected agenda staff-table columns.');
    }
    if (!lines.shift()?.match(/^\|[\s:|-]+\|$/)) throw new Error('Agenda staff-table separator is missing.');
    for (const line of lines) {
      const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
      if (cells.length !== 4) throw new Error('Agenda contains a malformed staff-table row.');
      const [trackLabel, sourceName, contact, affiliation] = cells as [string, string, string, string];
      if (trackLabel.toLowerCase() === 'partner') continue;
      const track = trackCodes[trackLabel.toLowerCase()];
      if (track === undefined) throw new Error(`Unknown agenda track: ${trackLabel}`);
      const emailMatch = /\[([^\]]+)\]\((?:mailto:)?([^)>]+)>?\)/i.exec(contact);
      if (!emailMatch) throw new Error(`No valid email contact for ${sourceName}.`);
      const email = z.string().email().parse(emailMatch[2]?.trim());
      if (emailMatch[1]?.trim().toLowerCase() !== email.toLowerCase()) {
        warnings.push(`${sourceName}: displayed email differs from contact target; using ${email}. Review the master agenda.`);
      }
      const name = sourceName.split(/\s+\+\s+/)[0]!.trim();
      if (name !== sourceName) warnings.push(`${sourceName}: imported named person "${name}" only; unnamed team members need organizer-provided names and contacts.`);
      const details = detailsSchema.parse({ name, email, affiliation, track });
      // Name-based event IDs remain unchanged when the source email is corrected.
      const id = `agenda-${createHash('sha256').update(name.normalize('NFC').toLowerCase()).digest('hex').slice(0, 24)}`;
      const role = roleSchema.parse(track ? 'track-lead' : 'attendee');
      if (rows.some(row => row.id === id || row.email.toLowerCase() === email.toLowerCase())) {
        throw new Error(`Duplicate agenda person/contact: ${name}. Resolve in the master source before generating.`);
      }
      rows.push({ id, ...details, role });
    }
  }
  if (!rows.length) throw new Error('Agenda staff table is empty.');
  return { rows, warnings };
}

export function rosterCsv(rows: ImportRow[]): string {
  const columns = ['id', 'name', 'email', 'affiliation', 'track', 'role'] as const;
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [columns.join(','), ...rows.map(row => columns.map(key => cell(row[key])).join(','))].join('\r\n') + '\r\n';
}
