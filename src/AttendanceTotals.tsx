import type { Dashboard } from '../shared/domain';

const secondaryMetrics = [
  ['roster', 'Advance sign-ups'], ['staff', 'Staff roster'], ['checkedIn', 'Checked in'],
  ['rosterMissing', 'Sign-ups not here'], ['staffMissing', 'Staff not here'],
  ['manual', 'Manual registrations'], ['trackLeads', 'Track leads here']
] as const satisfies readonly (readonly [keyof Dashboard['totals'], string])[];

export function AttendanceTotals({ totals }: { totals: Dashboard['totals'] }) {
  return <>
    <section className="metrics metrics-primary" aria-label="Attendees and staff checked in">
      <div className="metric metric-highlight"><strong>{totals.attendees}</strong><span>Attendees checked in</span></div>
      <div className="metric metric-highlight"><strong>{totals.staffCheckedIn}</strong><span>Staff checked in</span></div>
    </section>
    <section className="metrics" aria-label="Other attendance totals">
      {secondaryMetrics.map(([key, label]) =>
        <div className="metric" key={key}><strong>{totals[key]}</strong><span>{label}</span></div>)}
    </section>
  </>;
}
