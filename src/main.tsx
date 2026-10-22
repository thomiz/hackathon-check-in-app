import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { tracks, type Candidate, type Confirmation, type Dashboard, type DashboardRow, type Details, type Role, type Selection } from '../shared/domain';
import { api } from './api';
import { Receipt } from './Receipt';
import './styles.css';

const blank: Details = { name: '', email: '', affiliation: '', track: '' };
const message = (error: unknown) => error instanceof Error ? error.message : 'An unexpected error occurred.';
const letterCount = (value: string) => (value.match(/\p{L}/gu) ?? []).length;

function DetailsFields({ value, onChange }: { value: Details; onChange: (value: Details) => void }) {
  return <>
    <label>Full name<input autoComplete="name" required maxLength={160} value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} /></label>
    <label>Email<input autoComplete="email" type="email" required maxLength={254} value={value.email} onChange={e => onChange({ ...value, email: e.target.value })} /></label>
    <label>Affiliation / organization<input autoComplete="organization" required maxLength={160} value={value.affiliation} onChange={e => onChange({ ...value, affiliation: e.target.value })} /></label>
    <label>Primary track <span className="muted">(optional; you can change your choice)</span>
      <select value={value.track} onChange={e => onChange({ ...value, track: e.target.value as Details['track'] })}>
        <option value="">Not selected</option>
        {tracks.map(track => <option key={track.code} value={track.code}>{track.label}</option>)}
      </select>
    </label>
  </>;
}

function Search({ onSelect, staff = false }: { onSelect: (candidate: Candidate) => Promise<void>; staff?: boolean }) {
  const [name, setName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [results, setResults] = useState<Candidate[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const sequence = useRef(0);
  useEffect(() => {
    const seq = ++sequence.current;
    const controller = new AbortController();
    setResults([]); setError(''); setSearched(false); setLoading(false);
    if (letterCount(name) < (staff ? 1 : 5)) return () => controller.abort();
    setLoading(true);
    const timer = setTimeout(() => {
      void api<Candidate[]>(`${staff ? '/staff' : ''}/matches?${new URLSearchParams({ name, affiliation })}`, undefined, 'GET', controller.signal)
        .then(items => { if (sequence.current === seq && !controller.signal.aborted) { setResults(items); setSearched(true); } })
        .catch(err => { if (!controller.signal.aborted && sequence.current === seq) setError(message(err)); })
        .finally(() => { if (!controller.signal.aborted && sequence.current === seq) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [name, affiliation, staff]);
  async function choose(candidate: Candidate) {
    setSelecting(true); setError('');
    try { await onSelect(candidate); } catch (err) { setError(message(err)); }
    finally { setSelecting(false); }
  }
  return <section aria-labelledby="find-heading">
    <h2 id="find-heading">Find your registration</h2>
    <label>Your name<input autoComplete="off" value={name} maxLength={160} onChange={e => setName(e.target.value)} aria-describedby="search-help" /></label>
    <p id="search-help" className="muted">Type at least {staff ? 'one letter' : 'five letters'}, then select your name below.</p>
    <label>Affiliation <span className="muted">(optional filter)</span><input autoComplete="off" value={affiliation} maxLength={160} onChange={e => setAffiliation(e.target.value)} /></label>
    <div aria-live="polite">{loading && <p>Looking for near matches...</p>}{searched && !results.length && <p>No near matches. Try another spelling or ask registration staff.</p>}</div>
    {error && <p className="error" role="alert">{error}</p>}
    <ul className="candidates" aria-label="Matching registrations">
      {results.map(candidate => <li key={candidate.token}><button type="button" disabled={selecting} onClick={() => void choose(candidate)}>
        <strong>{candidate.name}</strong><span>{candidate.affiliation}</span><span className="select-label">Select registration →</span>
      </button></li>)}
    </ul>
  </section>;
}

function Checkin() {
  const [selected, setSelected] = useState<Selection>();
  const [details, setDetails] = useState<Details>(blank);
  const [result, setResult] = useState<Confirmation>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [privacyUrl, setPrivacyUrl] = useState('');
  useEffect(() => { void api<{ privacyUrl: string }>('/config').then(value => setPrivacyUrl(value.privacyUrl)).catch(err => setError(message(err))); }, []);
  function reset() { setSelected(undefined); setResult(undefined); setDetails(blank); setError(''); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setError('');
    try {
      setResult(await api<Confirmation>('/checkin', { ...details, selection: selected.selection }));
      setSelected(undefined); setDetails(blank);
    } catch (err) { setError(message(err)); } finally { setBusy(false); }
  }
  return <main className="registration">
    <div className="intro"><p className="eyebrow">9 NOVEMBER 2026 · REBEL, OSLO</p><h1>Welcome to the<br />FHIR Hackathon</h1><p>Find your registration, choose a track and let us know you’re here.</p></div>
    <div className="card">
      {result ? <Receipt receipt={result} onDone={reset} /> : selected ? <form onSubmit={event => void submit(event)}>
        <p className="eyebrow">REVIEW & CONFIRM</p><h2>Your registration</h2>
        <DetailsFields value={details} onChange={setDetails} />
        <p className="notice">Choose a different primary track if you wish. Changes are saved only when you confirm.</p>
        <button disabled={busy} type="submit">{busy ? 'Saving attendance...' : 'Confirm attendance'}</button>
        <button className="secondary" type="button" disabled={busy} onClick={reset}>Back to search</button>
      </form> : <Search onSelect={async candidate => {
        const value = await api<Selection>('/select', { token: candidate.token });
        setSelected(value); setDetails(value); setError('');
      }} />}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
    <p className="privacy">For quick check-in, name and affiliation near matches are visible to other users. Selecting a registration reveals its email and track. This is not identity verification. {privacyUrl && <a href={privacyUrl} target="_blank" rel="noreferrer">Event privacy notice</a>}<br />Not listed? Please ask registration staff for help.</p>
  </main>;
}

function Staff() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [details, setDetails] = useState<Details>(blank);
  const [role, setRole] = useState<Role | ''>('attendee');
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState<string>();
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [csv, setCsv] = useState('');
  const [source, setSource] = useState('roster');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [receipt, setReceipt] = useState<Confirmation>();
  async function refresh() { setDashboard(await api<Dashboard>('/staff/dashboard')); }
  async function action(operation: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); } catch (err) { setError(message(err)); } finally { setBusy(false); }
  }
  useEffect(() => {
    void api('/staff/session').then(() => { setLoggedIn(true); return refresh(); }).catch(err => {
      if (message(err).includes('login required') || message(err).includes('session expired')) return;
      setError(message(err));
    });
  }, []);
  function resetForm() { setEditing(undefined); setDetails(blank); setRole('attendee'); setReason(''); setRequestId(crypto.randomUUID()); }
  function edit(row: DashboardRow) { setEditing(row.personId); setDetails(row); setRole(row.role); setReason(''); document.getElementById('participant-form')?.scrollIntoView({ behavior: 'smooth' }); }
  const filtered = dashboard?.rows.filter(row => `${row.name} ${row.email} ${row.affiliation}`.toLowerCase().includes(filter.toLowerCase())) ?? [];
  if (receipt) return <main className="registration"><div className="card"><Receipt receipt={receipt} onDone={() => setReceipt(undefined)} /></div></main>;
  return <main className="staff">
    <div className="staff-title"><div><p className="eyebrow">EVENT OPERATIONS</p><h1>Registration desk</h1></div>
      {loggedIn && <button className="secondary" onClick={() => void action(async () => { await api('/staff/logout', {}); setLoggedIn(false); setDashboard(undefined); resetForm(); })}>Sign out</button>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    {!loggedIn ? <form className="card login" onSubmit={event => {
      event.preventDefault();
      void action(async () => { await api('/staff/login', { username, password }); setPassword(''); setLoggedIn(true); await refresh(); });
    }}>
      <h2>Staff sign-in</h2><label>Username<input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /></label>
      <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy}>Sign in</button>
    </form> : <>
      <div className="toolbar"><button disabled={busy} onClick={() => void action(refresh)}>Refresh dashboard</button><a className="button secondary" href="/api/staff/export">Export check-ins (CSV)</a></div>
      {dashboard && <>
        <section className="metrics" aria-label="Attendance totals">
          {Object.entries(dashboard.totals).map(([key, value]) => <div className="metric" key={key}><strong>{value}</strong><span>{({ roster: 'Advance sign-ups', staff: 'Staff roster', checkedIn: 'Checked in', rosterMissing: 'Sign-ups not here', staffMissing: 'Staff not here', manual: 'Manual registrations', attendees: 'Attendees here', trackLeads: 'Track leads here' } as Record<string, string>)[key]}</span></div>)}
        </section>
        <section className="card"><h2>Tracks at check-in</h2><ul className="track-totals">{[...tracks, { code: 'unselected', label: 'Not selected' }].map(track => <li key={track.code}><span>{track.label}</span><strong>{dashboard.tracks[track.code] ?? 0}</strong></li>)}</ul></section>
        <section className="card"><h2>Arrivals</h2><label>Filter check-ins<input value={filter} onChange={e => setFilter(e.target.value)} /></label>
          <div className="table-scroll"><table><thead><tr><th>Name / affiliation</th><th>Role / track</th><th>Arrival</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map(row => <tr key={row.id}>
              <td><strong>{row.name}</strong><br />{row.affiliation}<br /><small>{row.email}{row.manual ? ' · manual registration' : ''}</small></td>
              <td>{row.role}<br /><small>{tracks.find(t => t.code === row.track)?.label ?? 'Not selected'}</small></td>
              <td>{new Date(row.arrived).toLocaleTimeString('en-GB', { timeZone: 'Europe/Oslo' })}</td>
              <td><button className="secondary compact" onClick={() => edit(row)}>Correct details</button>
                <button disabled={busy} className="secondary compact" onClick={() => void action(async () => {
                  setReceipt(await api<Confirmation>(`/staff/receipts/${row.id}`));
                })}>Show receipt</button></td>
            </tr>)}</tbody></table></div>
          {!filtered.length && <p className="muted">No check-ins to display.</p>}
        </section>
      </>}
      <div className="staff-columns">
        <section className="card"><Search staff onSelect={async candidate => {
          const selected = await api<Selection & { id: string }>('/staff/select', { token: candidate.token });
          setEditing(selected.id); setDetails(selected); setRole(''); setReason('');
          setNotice('Confirm the organizer-reviewed role before saving. To record attendance, use the attendee check-in page.');
        }} /></section>
        <form className="card" id="participant-form" onSubmit={event => {
          event.preventDefault();
          void action(async () => {
            if (editing) {
              await api(`/staff/participants/${editing}`, { ...details, role, reason }, 'PUT');
              setNotice('Details corrected. Attendance was not changed.');
            } else {
              const result = await api<Confirmation>('/staff/manual', { ...details, role, reason, requestId });
              setReceipt(result);
            }
            resetForm(); await refresh();
          });
        }}>
          <h2>{editing ? 'Correct participant' : 'Manual registration'}</h2>
          <p className="muted">Search both rosters first. Manual registration is only for someone missing from both.</p>
          <DetailsFields value={details} onChange={setDetails} />
          <label>Verified event role<select required value={role} onChange={e => setRole(e.target.value as Role | '')}><option value="">Select verified role</option><option value="attendee">Attendee / other staff</option><option value="track-lead">Track lead (verified)</option></select></label>
          <label>Reason (recorded in audit log)<textarea required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
          <button disabled={busy}>{editing ? 'Save correction' : 'Register and check in'}</button>
          <button type="button" className="secondary" disabled={busy} onClick={resetForm}>Clear / new manual registration</button>
        </form>
      </div>
      <form className="card" onSubmit={event => {
        event.preventDefault();
        void action(async () => { const result = await api<{ imported: number }>('/staff/import', { source, csv }); setNotice(`Imported ${result.imported} entries; no check-ins created.`); setCsv(''); await refresh(); });
      }}>
        <h2>Import reviewed roster CSV</h2><p className="muted">Columns: name,email,affiliation,track,role, with optional id. Google Forms attendee exports are also supported and default to attendee. Missing IDs are generated from name and affiliation; keep these unchanged on reimport or supply the previous ID. For anyone already in the other roster, supply the same ID and event role. Imports add/update entries; they do not remove absent rows.</p>
        <label>Roster<select value={source} onChange={e => setSource(e.target.value)}><option value="roster">Google Sheet attendees</option><option value="staff">Agenda staff / track leads</option></select></label>
        <label>CSV content<textarea rows={6} required value={csv} onChange={e => setCsv(e.target.value)} /></label>
        <button disabled={busy}>Validate and import</button>
      </form>
    </>}
  </main>;
}

function App() {
  const [staff, setStaff] = useState(window.location.hash === '#staff');
  useEffect(() => {
    const changed = () => setStaff(window.location.hash === '#staff');
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  return <><header><a className="brand" href="#">HL7 <span>NORWAY</span></a><a href={staff ? '#' : '#staff'}>{staff ? 'Attendee check-in' : 'Staff access'}</a></header>{staff ? <Staff /> : <Checkin />}<footer>Norwegian FHIR Hackathon 2026 · Check-in at Rebel, Oslo</footer></>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
