import { useState } from 'react';
import type { Dashboard, MissingPerson } from '../shared/domain';

const secondaryMetrics = [
  ['roster', 'Advance sign-ups'], ['staff', 'Staff roster'], ['checkedIn', 'Checked in'],
  ['rosterMissing', 'Sign-ups not here'], ['staffMissing', 'Staff not here'],
  ['manual', 'Manual registrations'], ['trackLeads', 'Track leads here']
] as const satisfies readonly (readonly [keyof Dashboard['totals'], string])[];

const missingKeys = { rosterMissing: 'attendees', staffMissing: 'staff' } as const;

export function AttendanceTotals({ totals, missing }: { totals: Dashboard['totals']; missing?: Dashboard['missing'] }) {
  const [open, setOpen] = useState<keyof typeof missingKeys>();
  const people: MissingPerson[] = open && missing ? missing[missingKeys[open]] : [];
  const label = open ? secondaryMetrics.find(([key]) => key === open)![1] : '';
  return <>
    <section className="metrics metrics-primary" aria-label="Attendees and staff checked in">
      <div className="metric metric-highlight"><strong>{totals.attendees}</strong><span>Attendees checked in</span></div>
      <div className="metric metric-highlight"><strong>{totals.staffCheckedIn}</strong><span>Staff checked in</span></div>
    </section>
    <section className="metrics" aria-label="Other attendance totals">
      {secondaryMetrics.map(([key, text]) => {
        const content = <><strong>{totals[key]}</strong><span>{text}</span></>;
        if (!missing || !(key in missingKeys)) return <div className="metric" key={key}>{content}</div>;
        return <button type="button" className="metric metric-button" key={key} aria-expanded={open === key}
          onClick={() => setOpen(open === key ? undefined : key as keyof typeof missingKeys)}>{content}</button>;
      })}
    </section>
    {open && <section className="card missing-list" aria-label={label}>
      <h2>{label} ({people.length})</h2>
      {people.length ? <ul>{people.map(person =>
        <li key={person.personId}><strong>{person.name}</strong><br /><small>{[person.affiliation, person.email].filter(Boolean).join(' · ')}</small></li>)}</ul>
        : <p className="muted">Everyone has checked in.</p>}
    </section>}
  </>;
}
