import type { DashboardRow } from './domain.js';

const columns = ['name', 'email', 'affiliation', 'track', 'role', 'arrived'] as const;
// Prefix formula-like values so spreadsheet tools do not evaluate them.
const cell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`;

export function checkinsCsv(rows: DashboardRow[]): string {
  return '\uFEFF' + [columns.join(','), ...rows.map(row => columns.map(key => cell(row[key])).join(','))].join('\r\n');
}
