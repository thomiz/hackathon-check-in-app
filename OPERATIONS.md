# Operations guide

Use this guide after initial installation. For setup and configuration, see the
[README](README.md).

Run commands in PowerShell from the application folder, for example:

```powershell
Set-Location 'C:\GitRepo\hackathon-check-in-app'
```

**If a command fails, stop and resolve the error before continuing.** Never
delete `fhir-store.json` or the data directory to fix a startup or import error.

## Quick-start cheatsheet

1. Start Wi-fi hotspot on phone (for internet access)
2. Start Wi-fi hotspot on SURFACE (for ssh connection)
3. Connect monitoring computer to SURFACE hotspot  
4. Connect check-in computer to phone hotspot  
5. Set-Location to github repo
6. Start check-in server (check-in computer)  

```powershell
npm.cmd run ops -- start
```

6. Start sshd service  
7. Enable firewall rules for ssh connection  
8. Test localhost:8080 in browser
9. **Check-in computer:** login the kiosk user  
10. **Monitoring computer:** start ssh connection to check-in computer  

```powershell
ssh -N -L 8080:127.0.0.1:8080 192.168.137.1 -l "username" 
```

**Remember to connect the computers to mains power!**

## Operations CLI

```powershell
npm.cmd run ops -- help
```

| Command | Behavior |
|---|---|
| `npm.cmd run ops -- start` | Checks the built UI, then runs the app in this terminal. Ctrl+C stops it. |
| `npm.cmd run ops -- status` | Reports app health, the data file, lock holder, disk space, last backup, attendance and track totals. |
| `npm.cmd run --silent ops -- status --json` | The same as JSON, without names, emails or credentials. |
| `npm.cmd run ops -- backup` | Copies and verifies the data file into `DATA_DIR\backups` (or `--backup-dir`). Works while the app runs. |
| `npm.cmd run ops -- import --attendees '<csv>'` | **Read-only preview** of replacing the attendee roster (add `--keep-missing` to only add/update). |
| `npm.cmd run ops -- import --staff '<csv>'` | **Read-only preview** of replacing the staff/track-lead-and-partner roster. |
| `npm.cmd run ops -- reset` | **Read-only preview** of resetting all attendance. |

`status` returns a nonzero exit code when the app is not running; that is
expected while it is deliberately stopped.

### Preview, confirmation and apply

* `import` and `reset` default to previews, which can run while the app is
  running and never change anything. `--dry-run` makes that explicit.
* To apply, **stop the app with Ctrl+C**, then repeat the command with
  `--apply`. The tool refuses to apply while the app (or another command) has
  the data open. It shows the counts and an exact confirmation phrase; type it
  when prompted. Any other input cancels without a backup or change. For
  noninteractive use, pass `--confirm '<exact phrase>'`. The phrases are
  `IMPORT ROSTERS` for imports, `RESET IMPORT` for imports with a check-in
  reset, and `RESET CHECKINS` for a reset alone. Review the counts and warnings
  before confirming; the phrase does not encode the preview counts.
* Every apply takes a verified backup first (`DATA_DIR\backups`, or
  `--backup-dir 'D:\private\hackathon-backups'`), then writes **all changes in
  one atomic step**, including a combined reset and import. If validation or
  verification fails, the data file is left exactly as it was; correct the
  input and try again.
* By default an import replaces the selected roster(s), so use the complete
  latest CSV. With `--keep-missing`, people absent from the CSV are kept and
  the file may contain only new or changed people.

### Backups

Take a backup at agreed intervals (for example after the morning rush and at
the end of the day) and before maintenance:

```powershell
npm.cmd run ops -- backup --backup-dir 'D:\private\hackathon-backups'
```

Use an access-restricted, preferably encrypted disk other than the data disk,
and restrict its NTFS permissions to event operators. The tool does not encrypt
or delete old backups. Backups do not contain `.env`; keep that separately and
securely. See [Backup and restore](README.md#backup-and-restore) for restoring.

## 1. Start and stop the app

### What must already be done

Before first real use, confirm:

* Git and Node.js 22+/npm are installed, `npm.cmd test` and `npm.cmd run build`
  passed, and `.env` is configured (staff login, application URL and, if not
  the default, `DATA_DIR`). Keep `.env` private.
* The latest reviewed attendee CSV has been imported, and the staff roster has
  been checked. Staff are preloaded only when the staff List is empty.
* Check-in, receipts, staff access, and backup/restore have been rehearsed.
  The privacy notice and workstation/network settings are ready for event use.

These are preparation tasks, **not tasks to repeat on every startup**.
See the [event checklist](README.md#verification-and-event-operation).

### Normal startup

1. Open PowerShell in the application folder and run:

   ```powershell
   npm.cmd run ops -- start
   ```

   Expect `Check-in app ready`. Startup does not change rosters or attendance.
2. **Leave this window open.** It runs the app; it is not a background service.
3. Optionally check readiness from a second window with
   `npm.cmd run ops -- status` (expect `Overall: READY`), then open
   `http://localhost:8080`, sign in through **Staff access**, and check the
   roster counts.

**No rebuild or CSV reimport is needed for an ordinary restart.** Rosters and
check-ins are in the data file. Do not use the development servers for event
operation.

### Normal shutdown

Finish the current registration, then press **Ctrl+C** in the app window.
In-flight requests complete before the app exits. Stopping does not erase data.
If the PC crashes or loses power, simply start the app again: the data file is
never left half-written, and the leftover lock is replaced automatically.

## 2. When the attendee list or staff roster changes

**Editing a source file does not update the data. You must import it.**
Previews can run while the app is open; applying requires stopping the app
briefly, so schedule it when nobody is checking in.

### Single last-minute changes from the dashboard

For one person at a time (a late sign-up, a cancellation, or a staff member who
also signed up as an attendee), use the staff dashboard instead of a reimport.
The app can stay running and nobody else is affected.

* **Add someone:** open **Staff access**, fill in the *Manual registration or
  late sign-up* form (name, email, affiliation, track, verified role, reason),
  choose the list under **Add to list without check-in** and press **Add to
  attendee list** (or **staff list**). This does **not** check the person in;
  they check in from the attendee page like everyone else. If the person
  already exists in the other list, the existing record is reused and the roles
  must agree.
* **Remove someone:** search for the person in the staff search (or press
  **Correct details** in the arrivals table), enter a reason and press
  **Remove from attendee list** or **Remove from staff list** under *Roster
  membership*. Only that list entry is removed: the person, any recorded
  check-in, receipt and export rows are kept, exactly as if the latest CSV no
  longer contained the row. Someone removed from both lists can no longer use
  roster-based check-in.

Both actions are recorded as AuditEvents with the staff username and reason,
and the roster totals update immediately. **Afterwards, update the reviewed
CSV sources to match**: the next replacing import of a list keeps exactly the
CSV rows, so a dashboard-only addition disappears again unless the CSV includes
that person (matched by email), and a dashboard-only removal is undone if the
CSV still lists them. An add-only import never removes anyone.

### Attendee list changes

1. Export the latest Google Forms attendee CSV. Save it in a private location,
   for example `D:\private\reviewed-attendees.csv`. Use the **complete latest
   list** for a normal (replacing) import. For a file with only new or changed
   people, use the add-only option instead (see below).
2. Review changed people before importing:
   * People are matched by email; names, affiliations and tracks can change.
     An email correction is recognized when name and affiliation are unchanged;
     otherwise supply the person's existing `id`.
   * A person also in the staff roster is matched automatically, but must have
     the same event `role` (add a `role` column for a track lead). The import
     rejects ambiguous overlaps.
3. Preview the reviewed file and check additions, removals and updates:

   ```powershell
   npm.cmd run ops -- import --attendees 'D:\private\reviewed-attendees.csv'
   ```

4. Stop the app (Ctrl+C), then apply and type the displayed confirmation phrase:

   ```powershell
   npm.cmd run ops -- import --attendees 'D:\private\reviewed-attendees.csv' --apply
   ```

   Expect `Maintenance verified (import)`. Only the selected list changes;
   attendance is preserved. Add `--keep-missing` (to both the preview and the
   apply) to only add and update people.
5. Start the app again, sign in to the staff dashboard and check the expected
   roster count and changes. The reported import count is the number of input
   rows, not the number of newly added people. An import never checks anyone in.

**Alternatively, import from the staff page without stopping the app.** Paste
the CSV into **Import reviewed roster CSV**, select **Google Sheet attendees**,
leave **Remove people who are not in this CSV** ticked for the complete list
(or untick it to only add and update), and press **Preview import**. Check the
added, updated and removed names, then press **Apply import**. The app saves a
backup to `DATA_DIR\backups` first and applies exactly the previewed changes;
if the list changed in between, it asks you to preview again.
See [CSV format and ID rules](README.md#google-sheet-attendees-and-optional-staff-updates).

### Staff roster changes

1. Update or obtain the latest event agenda Markdown file. Its **Track leads**
   table (also accepted as **Track leads and partners**) is the master source,
   including Partner rows there. People listed only in the separate **Partners**
   chapter are excluded.
2. Generate the local staff files, substituting your actual agenda path:

   ```powershell
   npm.cmd run staff:generate -- 'D:\path\to\hack-agenda.md'
   ```

3. Review the generation warnings and `seed\staff.csv`. If someone was renamed,
   reconcile their existing participant ID before importing. Track-associated
   people are `track-lead`; Partner rows are `attendee`.
4. Preview, stop the app, then apply:

   ```powershell
   npm.cmd run ops -- import --staff '.\seed\staff.csv'
   npm.cmd run ops -- import --staff '.\seed\staff.csv' --apply
   ```

5. Start the app again, then check dashboard counts and changes.

**Restarting the app does not refresh an existing staff roster.** Generation
and import are separate steps. `--agenda 'D:\path\to\hack-agenda.md'` can be
used instead of `--staff` to parse the agenda in memory; review warnings block
applying directly from the agenda. Never commit private attendee exports.

### Update both rosters together

Supply both complete CSVs to one command; both Lists and their Person updates
are committed together:

```powershell
npm.cmd run ops -- import --attendees 'D:\private\reviewed-attendees.csv' --staff 'D:\private\reviewed-staff.csv' --apply
```

Someone in both input files is matched by `id` or email; their details and role
must be identical in both files.
This permits a coordinated roster-role change for a person who has not checked
in. Already confirmed roles still require an audited correction, or an explicit
reset when starting a new attendance run.

### Removals, role changes and already checked-in people

* **Each import changes only the selected list.** Removing a CSV row and
  importing the complete updated file (replacing mode, the default) removes
  that person from that list; an add-only import keeps them.
  The active roster/search combines the attendee and staff lists: someone
  present in either remains eligible. Empty/header-only CSVs are rejected.
* Removal from both lists prevents further roster-based selection/check-in,
  including with an earlier selection token. Existing Person resources,
  confirmed attendance, receipts and exports are preserved.
* Imports preserve already confirmed check-in details. Use the staff correction
  workflow for a checked-in person's details or event role, then align source
  files with that correction.
* A conflicting role across rosters must be reconciled before importing.
  Do not bypass the error by giving the same person a different ID.

## 3. When the application is updated

1. Finish active check-ins and stop the app with **Ctrl+C**.
2. Take a backup (`npm.cmd run ops -- backup`). Keep `.env` securely too.
3. Obtain the reviewed update with your normal Git or release-copy process.
   Preserve `.env`, private CSVs and the data directory.
4. If `package.json` or `package-lock.json` changed, run `npm.cmd ci`.
5. Run `npm.cmd test`, then `npm.cmd run build`. **Restarting alone does not
   rebuild anything:** the app and the `ops` commands run the compiled output
   from the last build.
6. Apply any additional steps relevant to the update:

   | What else changed? | Required action |
   |---|---|
   | FHIR definitions or packaging/validation scripts | Follow the [FHIR build and validation instructions](README.md#fhir-data-and-validation). |
   | Agenda source or bundled staff files | Generate if needed, then explicitly import staff as described above. |
   | `.env.example` or configuration requirements | Review new settings and update the private `.env`; do not replace it with the example. |

7. Start the app, reload the browser (**Ctrl+F5** if it shows the old UI), and
   check health, staff login, dashboard counts and the changed functionality.
   Rehearse check-in changes with a separate test `DATA_DIR`, not by creating
   fictitious attendance in the live data.

If tests, builds or startup fail, keep registration closed and investigate.
Restore only through the [restore procedure](README.md#backup-and-restore).

## 4. Start check-ins again (reset all attendance)

Use this after a rehearsal or when an authorized organizer decides to restart
attendance collection. **This resets every check-in, not just a selected
person.** It does not reset roster counts or restore original CSV details.

The reset:

* Empties the check-in List and removes event Practitioner check-in records.
* Removes links from Persons to those records, so roster members can check in
  again with a new arrival time and receipt.
* Preserves attendee and staff Lists, participant IDs, and the latest saved
  names, emails, affiliations and tracks, including check-in corrections.
* Preserves Persons created through manual registration and all AuditEvents.

**This is an operational reset, not secure erasure.** Audit records, backups
and previously saved receipt copies can still contain earlier attendance
information. Old receipts cannot be reopened in the app after reset.

### Reset procedure

1. Confirm approval. Export the arrivals CSV from the staff dashboard if you
   need a readable record of the previous run.
2. Preview while the app is still running:

   ```powershell
   npm.cmd run ops -- reset
   ```

3. Stop the app (Ctrl+C), then apply and type the exact phrase shown:

   ```powershell
   npm.cmd run ops -- reset --apply
   ```

   This takes a backup, resets in one atomic step and verifies zero active
   check-ins and zero event Practitioners. Expect `Maintenance verified (reset)`.
4. Start the app, reload the browser to discard old selections and receipts,
   sign in and verify: zero arrivals, unchanged roster counts, and roster
   members shown as not yet checked in.

To reset and import updated rosters together, add `--reset-checkins` to an
import, for example:

```powershell
npm.cmd run ops -- import --reset-checkins --attendees 'D:\private\reviewed-attendees.csv' --staff 'D:\private\reviewed-staff.csv' --apply
```

The imports are validated against the post-reset state before anything is
changed, so reviewed details/roles are applied for the new run.

Manual-only people remain outside both rosters; they are not automatically
eligible for public roster check-in in the next run. Add them to a list from
the dashboard or a reviewed import if needed. Do not create duplicate manual
registrations to bypass duplicate checks. A check-in on the live data after
reset is a real new attendance record.

## 5. Monitor check-ins remotely over Wi-Fi

Use this to follow check-in status from a second computer, for example when
both computers are connected to the organizer's phone hotspot. **Never expose
the app directly on the Wi-Fi:** plain HTTP would send staff passwords and
personal data unencrypted. Keep the app bound to `127.0.0.1` and use an
encrypted SSH tunnel with key authentication instead:

```text
Monitoring PC ──(SSH, port 22, key login, encrypted)──> Registration PC
  localhost:8080  →  check-in app (staff dashboard)
```

No change to `.env` or the application is needed. The tunneled browser is just
another client of the same app; it never touches the data file directly, so it
cannot conflict with the kiosk.

### Dashboard SSH helper

Sign in through **Staff access**, then select **SSH remote monitoring** to open
the separate helper page (`#staff/ssh`). It reads Windows status without making
changes: active IPv4 interfaces, network profiles, SSH service/configuration,
host public-key fingerprints and inbound allow rules that may apply to SSH.
The hosted demo and non-Windows deployments cannot operate this helper.

Windows may restrict host public-key or `sshd_config` reads by the unelevated
web-server account. These failures appear as warnings rather than hiding the
available network, service and firewall status; unreadable authentication
configuration is shown as **Unknown**, not as validated. Enable still requires
successful configuration validation in an administrator shell.
Do not elevate the web server or loosen SSH key ACLs to remove these warnings.
Run the status helper in **PowerShell as Administrator on the registration PC**
for diagnostics. To read the trusted host fingerprints there directly:

```powershell
Get-ChildItem -LiteralPath "$env:ProgramData\ssh" -Filter 'ssh_host_*_key.pub' | ForEach-Object { & "$env:WINDIR\System32\OpenSSH\ssh-keygen.exe" -lf $_.FullName }
```

Compare the matching fingerprint with the monitoring PC's SSH prompt before
accepting the host key. Missing fingerprints are not evidence that no keys exist
when a read warning is present.

1. Complete the one-time OpenSSH/key preparation below. The Windows SSH account
   is separate from the app's staff account. The helper requires
   `PasswordAuthentication no`; also review any account-specific `Match`
   overrides in `sshd_config` to ensure password login is disabled for that account.
2. Refresh status and explicitly select the trusted hotspot/network interface.
   Use the registration PC's displayed IP address, not the hotspot gateway
   unless the registration PC itself hosts that hotspot. Subnets are calculated
   from the address/prefix, not hardcoded to Surface or iPhone defaults.
3. Enter the monitoring PC's IPv4 address (preferred), or explicitly choose the
   trusted subnet, and enter the Windows SSH username. The page includes a
   `Get-NetIPAddress` command to run on the monitoring PC to find its source IP.
4. Copy **Prepare remote monitoring** and run it in **PowerShell as Administrator
   on the registration PC**. Refresh status afterwards.
5. On the monitoring PC, run the generated port test and tunnel command, verify
   the server fingerprint, then open the displayed localhost URL.
6. Close the tunnel with Ctrl+C. Run the generated disable command locally.
   The optional disable-and-stop command stops all SSH sessions; do not use it
   if others depend on SSH.

The fixed helper is `scripts\Ssh-Monitoring.ps1`:

```powershell
& .\scripts\Ssh-Monitoring.ps1 -Action Status
& .\scripts\Ssh-Monitoring.ps1 -Action Enable -InterfaceIndex 12 -LocalAddress '192.168.137.1' -RemoteAddress '192.168.137.2'
& .\scripts\Ssh-Monitoring.ps1 -Action Disable
& .\scripts\Ssh-Monitoring.ps1 -Action Disable -StopService
```

Replace the example interface index/addresses with those shown in the helper.
Enable rechecks the active interface/address and creates or replaces only the
`Hackathon-SSH-Monitoring` firewall rule, scoped to TCP 22, that interface,
local address and remote source. It supports Public/Private profiles without
changing the Windows network category. If another enabled inbound allow rule
may apply to sshd on port 22, it stops before changing anything; review that
rule explicitly in Windows Firewall. Adding a narrower allow rule does not
cancel a broader one. Disabled rules are also shown in the status table.

Enable starts `sshd` and checks service/listener/rule status. If verification
fails after creating the rule, it disables that rule and reports the error;
the service may remain running. Disable affects only the app-owned rule unless
`-StopService` is supplied. Installation, authorized keys, other firewall rules
and service startup settings are never changed. An existing automatic startup
setting can restart SSH after reboot; review it separately.

The guided tunnel requires `HOST=127.0.0.1` and
`PUBLIC_URL=http://localhost:<PORT>`. The web server remains unelevated and
exposes only an authenticated, rate-limited read-only status endpoint. It never
executes enable/disable commands from the browser. A remote tunneled browser
also looks local to the server, so localhost alone is not a privilege boundary.
Local status cannot prove remote connectivity: test from the monitoring PC,
and check firewall block/policy rules or hotspot client isolation if needed.

### Prepare the registration PC manually (once)

Run in an administrator PowerShell window:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Set-Service sshd -StartupType Automatic
Disable-NetFirewallRule -Name "SSH-Hotspot-Subnet"
```

* On the monitoring PC, create a key with `ssh-keygen -t ed25519` and copy the
  public key (`id_ed25519.pub`) into the event operator account's
  `%USERPROFILE%\.ssh\authorized_keys` on the registration PC. For an account in
  the Administrators group, use `C:\ProgramData\ssh\administrators_authorized_keys`
  instead (only Administrators and SYSTEM may have access to that file).
* Disable password logins: set `PasswordAuthentication no` in
  `C:\ProgramData\ssh\sshd_config`, then run `Restart-Service sshd`.
* Allow SSH only from the hotspot subnet. Find the PC's address with `ipconfig`;
  iPhone hotspots typically use `172.20.10.0/28`:

  ```powershell
  Set-NetFirewallRule -Name OpenSSH-Server-In-TCP -RemoteAddress 172.20.10.0/28
  ```

### Specific rules for surface hotspot

  **Optional: allow SSH on a trusted hotspot.** Use the actual trusted subnet.
  This manual rule applies on any network profile; the dashboard helper
  additionally restricts its rule to the selected interface and local address:

  ```powershell
  New-NetFirewallRule -Name "SSH-Hotspot-Subnet" -DisplayName "SSH from hotspot subnet" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 22 -Profile Any -RemoteAddress "192.168.137.0/24"
 ```

#### Optional

  The `-Profile Any` rule above also applies when Windows classifies the
  hotspot as **Public**. A different rule restricted to Private will not apply
  there, even when both PCs are on the same subnet and ping works. On the
  registration PC, check the active network profiles:

  ```powershell
  Get-NetConnectionProfile |
      Select-Object InterfaceIndex, InterfaceAlias, NetworkCategory
  ```

#### Precautions

  Changing the network to **Private** is not needed for the dashboard helper
  or the `-Profile Any` rule above. If separately needed for your own trusted,
  password-protected hotspot or network, replace `<index>` with the hotspot's
  `InterfaceIndex`; run in administrator PowerShell:

  ```powershell
  Set-NetConnectionProfile -InterfaceIndex <index> -NetworkCategory Private
  ```

  Changing the profile also enables other applicable Private-profile firewall
  rules. Do not do this on an untrusted or public network, and do not disable
  the firewall. Retry the port test below from the monitoring PC.

### Connect from the monitoring PC

Check the connection, then open the tunnel and leave the window open while
monitoring (replace the user and address):

For surface hotspot wifi:

```powershell
Test-NetConnection 192.168.137.1 -Port 22
ssh -N -L 8080:127.0.0.1:8080 192.168.137.1 -l "username"
```

If the connection test fails, first check that `sshd` is running and the SSH
firewall rule is enabled for the registration PC's active network profile.
Some Android hotspots also isolate clients from each other; check the hotspot
settings if the service and firewall configuration are correct.

Open `http://localhost:8080` on the monitoring PC and sign in via **Staff
access** to see check-in counts, track totals, arrivals, receipts and CSV
export. `PUBLIC_URL` remains `http://localhost:8080`, matching the tunneled
browser origin, so same-origin checks and cookies work unchanged. Both browsers
share the app's login rate limit (5 attempts per minute), because both connect
from the registration PC.

### Stop the SSH server after monitoring

1. On the monitoring PC, press `Ctrl+C` in the SSH tunnel terminal.
2. On the registration PC, in **PowerShell as Administrator**:

   ```powershell
   Stop-Service sshd
   Disable-NetFirewallRule -Name SSH-Hotspot-Subnet
   ```

   Closing the tunnel alone does not stop the server. To prevent SSH from
   starting after a reboot, also run `Set-Service sshd -StartupType Disabled`.
   Before the next session, run `Set-Service sshd -StartupType Automatic`,
   `Start-Service sshd` and `Enable-NetFirewallRule -Name OpenSSH-Server-In-TCP`
   (the subnet restriction is preserved).

### Security notes

* Use a private hotspot with WPA2/WPA3 and a strong password; do not share it.
* The monitoring PC displays personal data: lock its screen, avoid local
  exports unless needed and close the SSH window after monitoring.
* Without SSH, the only acceptable alternative is the trusted HTTPS reverse
  proxy described under [Configuration](README.md#configuration), never
  `HOST=0.0.0.0` over plain HTTP.
