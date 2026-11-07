import React, { useEffect, useState } from 'react';
import { ipv4Subnet, powershellLiteral, sshCommands, type SshReport } from '../shared/ssh';
import { api, DEMO } from './api';

function Command({ title, value }: { title: string; value: string }) {
  const [notice, setNotice] = useState('');
  return <div className="ssh-command"><h3>{title}</h3><pre tabIndex={0}>{value}</pre>
    <button className="secondary" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setNotice('Copied.'); }
      catch { setNotice('Clipboard unavailable. Select and copy the command above.'); }
    }}>Copy command</button>{notice && <p role="status" className="muted">{notice}</p>}
  </div>;
}

export function SshHelper({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const [report, setReport] = useState<SshReport>();
  const [selected, setSelected] = useState('');
  const [source, setSource] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true); setError(''); setReport(undefined);
    try { setReport(await api<SshReport>('/staff/ssh/status')); }
    catch (err) {
      setError(`Cannot read SSH status: ${err instanceof Error ? err.message : 'Discovery failed.'} Check Windows/OpenSSH permissions and run the local helper with -Action Status in PowerShell for diagnostics.`);
    }
    finally { setBusy(false); }
  }
  useEffect(() => { if (!DEMO) void refresh(); }, []);
  const status = report?.supported ? report : undefined;
  const network = status?.interfaces.find(item => `${item.index}:${item.address}` === selected);
  let commands: ReturnType<typeof sshCommands> | undefined;
  let validation = '';
  if (status && network && source && username) {
    try { commands = sshCommands(status, network, source, username); }
    catch { validation = 'Enter a valid IPv4 source address/subnet and Windows username (no control characters).'; }
  }
  const compatible = status?.loopback && status.publicUrl === `http://localhost:${status.port}`;
  return <main className="staff ssh-helper">
    <div className="staff-title"><div><p className="eyebrow">EVENT OPERATIONS</p><h1>Remote monitoring</h1></div>
      <div><a className="button secondary" href="#staff">Back to staff dashboard</a><button className="secondary" disabled={busy} onClick={() => {
        setBusy(true);
        void onSignOut().catch(err => setError(err instanceof Error ? err.message : 'Sign out failed.')).finally(() => setBusy(false));
      }}>Sign out</button></div>
    </div>
    <p>Keep the app on loopback. SSH encrypts access from a second PC; never open the app's HTTP port on Wi-Fi.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {DEMO ? <p className="notice">SSH monitoring is unavailable in the hosted demo. Use the installed Windows application.</p> : <>
      <button disabled={busy} onClick={() => void refresh()}>{busy ? 'Reading Windows status...' : 'Refresh SSH status'}</button>
      {report && !report.supported && <p className="notice">{report.reason}</p>}
      {status && <>
        <section className="card"><h2>Registration PC status</h2>
          <p>SSH service: <strong>{status.service}</strong><br />PasswordAuthentication: <strong>{status.passwordAuthentication}</strong></p>
          {status.warnings.length > 0 && <div className="notice" role="alert">
            <p>Some SSH details could not be read by the unelevated app. Available status is shown below.</p>
            <ul>{status.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
            <p>Run the local status helper in PowerShell as Administrator for diagnostics. Do not elevate the web server or loosen SSH key permissions.</p>
          </div>}
          <p className="notice">One-time preparation: install Windows OpenSSH Server, provision your monitoring PC's public key in the Windows operator account's authorized_keys, and set PasswordAuthentication no in sshd_config. App staff credentials are not Windows SSH credentials.</p>
          <h3>Inbound firewall rules that may allow port 22</h3>
          <p>The helper owns only Hackathon-SSH-Monitoring. Other enabled rules must be reviewed explicitly before enabling it. Disabled rules are shown too; an allow rule does not override broader allow rules.</p>
          {status.rules.length ? <div className="table-scroll"><table><thead><tr><th>Rule / status</th><th>Profile / interface</th><th>Local / remote addresses</th><th>Ports</th></tr></thead>
            <tbody>{status.rules.map(rule => <tr key={rule.name}><td>{rule.name}<br />{rule.enabled ? 'Enabled' : 'Disabled'}</td><td>{rule.profile}<br />{rule.interfaceAlias.join(', ')}</td><td>{rule.localAddress.join(', ')}<br />From: {rule.remoteAddress.join(', ')}</td><td>{rule.localPort.join(', ')}</td></tr>)}</tbody></table></div> : <p>No matching allow rules found.</p>}
          <p>Status does not prove reachability. Firewall block rules, policy or hotspot client isolation can still prevent connection.</p>
          <h3>Server host-key fingerprints</h3>
          {status.fingerprints.length ? <pre>{status.fingerprints.join('\n')}</pre> : <p>No host-key fingerprints available. Resolve any read warnings above, or prepare OpenSSH if no host public keys exist.</p>}
          {status.warnings.length > 0 && <Command title="Read host-key fingerprints as Administrator on the registration PC" value={'Get-ChildItem -LiteralPath "$env:ProgramData\\ssh" -Filter \'ssh_host_*_key.pub\' | ForEach-Object { & "$env:WINDIR\\System32\\OpenSSH\\ssh-keygen.exe" -lf $_.FullName }'} />}
        </section>
        <section className="card"><h2>1. Select the connection</h2>
          {!compatible && <p className="error" role="alert">This guided tunnel requires HOST=127.0.0.1 and PUBLIC_URL=http://localhost:{status.port}. Review the deployment configuration first; enable/connect commands are withheld.</p>}
          <label>Registration PC network / IP address<select value={selected} onChange={event => { setSelected(event.target.value); setSource(''); }}>
            <option value="">Select the hotspot or trusted network</option>
            {status.interfaces.map(item => <option key={`${item.index}:${item.address}`} value={`${item.index}:${item.address}`}>{item.alias} - {item.address}/{item.prefix} - {item.profile}{item.virtual ? ' (virtual/VPN)' : ''}</option>)}
          </select></label>
          {!status.interfaces.length && <p>No active usable IPv4 adapters found. Connect to the trusted network and refresh.</p>}
          {network && <><p>Registration PC: <strong>{network.address}</strong>; subnet: <strong>{ipv4Subnet(network.address, network.prefix)}</strong>. Use this PC's address, not the gateway unless this PC hosts the hotspot.</p>
            <p>To find the source address, run this on the <strong>monitoring PC</strong> and choose its address on the same trusted network:</p>
            <Command title="Find the monitoring PC's IPv4 address" value={"Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.AddressState -eq 'Preferred' -and $_.IPAddress -notmatch '^(127\\.|169\\.254\\.)' } | Select-Object InterfaceAlias,IPAddress,PrefixLength"} />
            <label>Allowed monitoring PC IPv4 address (preferred) or trusted subnet<input value={source} onChange={event => setSource(event.target.value)} placeholder="For example, 192.168.137.2" /></label>
            <button className="secondary" onClick={() => setSource(ipv4Subnet(network.address, network.prefix))}>Use selected subnet (allows all its devices)</button>
          </>}
          <label>Windows SSH username on the registration PC<input value={username} onChange={event => setUsername(event.target.value)} maxLength={128} autoComplete="off" /></label>
          {validation && <p className="error" role="alert">{validation}</p>}
        </section>
        <section className="card"><h2>2. Enable on the registration PC</h2>
          <p>Open <strong>PowerShell as Administrator on the registration PC</strong> and run the generated command. The website cannot elevate privileges or execute changes. Refresh status afterwards.</p>
          <p>The helper starts sshd and creates a restricted firewall rule. It does not install OpenSSH, change startup settings, enable password login or change the network profile. Any profile is supported, but only on the explicitly selected interface, address and source.</p>
          {commands && compatible ? <Command title="Prepare remote monitoring" value={commands.enable} /> : <p>Select a network and enter the source and Windows username above to generate commands.</p>}
        </section>
        <section className="card"><h2>3. Connect from the monitoring PC</h2>
          <p>Join the same trusted network. Run the port test, then the tunnel command in PowerShell. Verify the server fingerprint above on first connection and leave the tunnel window open.</p>
          {commands && compatible && <><Command title="Test reachability" value={commands.test} /><Command title="Open encrypted tunnel" value={commands.tunnel} /><p>Open <strong>http://localhost:{status.port}</strong> and sign in through Staff access. If the local port is occupied, close the conflicting app first.</p></>}
        </section>
        <section className="card"><h2>4. Stop remote monitoring</h2>
          <p>Press Ctrl+C in the monitoring PC's tunnel window. On the registration PC, run the following in administrator PowerShell.</p>
          <Command title="Disable this app's monitoring rule" value={`& ${powershellLiteral(status.helperPath)} -Action Disable`} />
          <p>Other firewall rules and sshd are unchanged. If no one else uses SSH, also stop the service. This disconnects all SSH users; a remote dashboard user should not run this through their tunnel.</p>
          <Command title="Disable rule and stop SSH service" value={`& ${powershellLiteral(status.helperPath)} -Action Disable -StopService`} />
          <p>Existing automatic SSH startup settings remain unchanged. Review them separately if SSH must stay stopped after reboot.</p>
        </section>
      </>}
    </>}
  </main>;
}
