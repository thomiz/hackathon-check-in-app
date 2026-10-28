# Operations guide

Use this guide after initial installation. For full setup and configuration,
see the [README](README.md).

Run commands in PowerShell from the application folder. For this PC:

```powershell
Set-Location 'C:\GitRepo\hackaton-registration-app'
```

Use your actual installation path if different. Run each numbered step
separately. **If a command fails, stop and resolve the error before continuing.**
Never delete the Blaze data directory to fix a startup or import error.

## 1. Start the program after installation and testing

### What must already be done

Before first real use, confirm:

* Git, Node.js/npm and Docker Desktop are installed; Docker uses Linux containers.
* Dependencies are installed and `npm.cmd test` and `npm.cmd run build` passed.
* `.env` is configured, including the staff login, application URL, FHIR URL
  and Blaze data location. Keep this file private.
* The Blaze data directory exists and is accessible. Keep the same directory
  when restarting; do not substitute a new empty one.
* The latest reviewed attendee CSV has been imported, and the staff roster
  has been checked. Staff are preloaded only when the staff List is empty.
* Check-in, receipts, staff access, and backup/restore have been rehearsed.
  The privacy notice and workstation/network settings are ready for event use.

These are preparation tasks, **not tasks to repeat on every startup**.
See the [event checklist](README.md#verification-and-event-operation).

### Normal startup

1. Open **Docker Desktop** and wait until its engine is running.
2. Open PowerShell, go to the application folder, and start Blaze:

   ```powershell
   docker compose up -d
   ```

3. Check readiness:

   ```powershell
   docker compose ps
   Invoke-RestMethod 'http://localhost:8090/health'
   ```

   Blaze normally takes 10-60 seconds to start. Wait for `healthy` in the
   Compose output and a successful health request before continuing.

4. Start the registration app:

   ```powershell
   npm.cmd run start
   ```

   **Leave this PowerShell window open.** It runs the app; closing it stops
   registration access. Docker Desktop alone does not start the registration app.

5. In a **second PowerShell window**, check application health:

   ```powershell
   Invoke-RestMethod 'http://localhost:8080/api/health'
   ```

   Expect `status: ok`. Open `http://localhost:8080` in the browser, sign in
   through **Staff access**, and check the roster counts.

The addresses above are the default workstation configuration. If you configured
a different application address, use it for the browser and application health
check. Keep Blaze accessible only on loopback.

**No rebuild or CSV reimport is needed for an ordinary restart.** Rosters and
check-ins remain in the existing Blaze database. Use `npm.cmd run start`, not
the development servers, for event operation.

### Normal shutdown

1. Finish the current registration.
2. Press **Ctrl+C** in the PowerShell window running the app.
3. If shutting down the PC or stopping the database, run:

   ```powershell
   docker compose stop
   ```

Stopping does not erase the database. Follow the
[backup procedure](README.md#backup-and-restore-of-the-host-data-directory)
at agreed intervals and before maintenance.

## 2. When the attendee list or staff roster changes

**Editing a source file does not update the database. You must import it.**
Keep Blaze running. You can leave the app running and use a second PowerShell
window for imports, but schedule changes when nobody is checking in.
Take a [backup](README.md#backup-and-restore-of-the-host-data-directory) first;
if you stopped the app or Blaze for the backup, restart them afterwards.

### Attendee list changes

1. Export the latest Google Forms attendee CSV. Save it in a private location,
   for example `D:\private\reviewed-attendees.csv`. Use the **complete latest
   list**, not only new or changed rows: each import replaces the attendee list.
2. Review changed people before importing:
   * Missing IDs are generated from name and affiliation. Repeat imports retain
     identity if those fields are unchanged.
   * If correcting a name or affiliation, supply the person's previous `id`
     rather than generating a new one.
   * For a person also in the staff roster, supply the same `id` and event
     `role` as the staff CSV. The import rejects ambiguous overlaps.
3. Import the reviewed file:

   ```powershell
   npm.cmd run import -- roster 'D:\private\reviewed-attendees.csv'
   ```

4. Expect `Imported ... roster entries.` followed by confirmation that the selected
   list was replaced and attendance history was preserved.
   If validation fails, correct the CSV and retry; the import is atomic.
5. Refresh the staff dashboard and check the expected roster count and changes.
   The reported import count is the number of input rows, not the number of
   newly added people. People absent from the CSV are removed from the attendee
   list. An import does not check anyone in.

You can also paste the CSV into **Import reviewed roster CSV** on the staff
page with **Google Sheet attendees** selected.
See [CSV format and ID rules](README.md#google-sheet-attendees-and-optional-staff-updates).

### Staff roster changes

1. Update or obtain the latest event agenda Markdown file. Its **Track leads
   and partners** table is the master source.
2. Generate the local staff files, substituting your actual agenda path:

   ```powershell
   npm.cmd run staff:generate -- 'D:\path\to\hack-agenda.md'
   ```

3. Review the generation warnings and `seed\staff.csv`. If someone was renamed,
   reconcile their existing participant ID before importing. Track-associated
   people are `track-lead`; Partner rows are `attendee`.
4. Explicitly import the complete generated roster (this replaces the staff list):

   ```powershell
   npm.cmd run import -- staff '.\seed\staff.csv'
   ```

5. Refresh the staff dashboard and check counts and changes.

**Restarting the app does not refresh an existing staff roster.** Generation
and import are separate steps. If you receive an already reviewed staff CSV
instead, import that file with `npm.cmd run import -- staff 'D:\private\reviewed-staff.csv'`.

### Removals, role changes and already checked-in people

* **Each import replaces only the selected list.** Removing a CSV row and
  importing the complete updated file removes that person from that list.
  The active roster/search combines the attendee and staff lists: someone
  present in either remains eligible. Import both latest CSVs when both change.
  Empty/header-only CSVs are rejected; failed imports leave the old list intact.
* Removal from both lists prevents further roster-based selection/check-in,
  including with an earlier selection token. Existing Person resources,
  confirmed attendance, receipts and exports are preserved. A removed person
  who already checked in still appears in attendance history. Do not delete the
  database or attendance history to remove someone from the active roster.
* Imports preserve already confirmed check-in details. Use the staff correction
  workflow for a checked-in person's details or event role, then align source
  files with that correction.
* A conflicting role across rosters must be reconciled before importing.
  Do not bypass the error by giving the same person a different ID.

## 3. When server, client, scripts or dependencies are updated

Plan a maintenance window: check-in will be unavailable during this procedure.
Keep the previous known-working application version and a database backup.

The registration app runs directly on Windows; Docker runs only the Blaze FHIR
server. Changes in `server/`, `src/`, `shared/` or `scripts/` do **not** require
building or recreating a Docker image. Follow the app test, build and restart
steps below. The separate Blaze/Docker step applies only when its configuration
or pinned image changes.

1. Finish active check-ins and stop the app with **Ctrl+C**.
2. Take a [database backup](README.md#backup-and-restore-of-the-host-data-directory).
   Keep `.env` securely for recovery too.
3. Obtain the reviewed application update using your normal Git or release-copy
   process. Preserve `.env`, private CSVs and the Blaze data directory.
   Do not overwrite uncommitted local work.
4. If `package.json` or `package-lock.json` changed, restore the locked dependencies:

   ```powershell
   npm.cmd ci
   ```

5. Run the tests:

   ```powershell
   npm.cmd test
   ```

6. Build the application:

   ```powershell
   npm.cmd run build
   ```

   This checks TypeScript and rebuilds the browser files. **Restarting alone
   does not rebuild the client.** Server code and CLI scripts run from source;
   restart the server and use the updated scripts for subsequent commands.

7. Apply any additional steps relevant to the update:

   | What else changed? | Required action |
   |---|---|
   | FHIR definitions or packaging/validation scripts | Follow the [FHIR build and validation instructions](README.md#fhir-data-and-validation) before reopening registration. |
   | Agenda source or bundled staff files | Generate if needed, then explicitly import staff as described above. |
   | Attendee CSV | Import the reviewed attendee file as described above. |
   | `.env.example` or configuration requirements | Review new settings and update the private `.env`; do not replace it with the example. |

8. **If the Blaze configuration or pinned image changed, update Blaze before
   restarting the app.** This includes changes to `compose.yaml` or Blaze-related
   `.env` settings. Otherwise, leave the existing Blaze container running and
   continue to the next step.

   Review release-specific upgrade requirements and preserve `BLAZE_DATA_DIR`;
   do not point Blaze at a new or empty database directory. Apply the update:

   ```powershell
   docker compose pull
   docker compose up -d
   docker compose ps
   Invoke-RestMethod 'http://localhost:8090/health'
   ```

   Wait for Blaze to be healthy before continuing. Compose downloads the pinned
   image and recreates the container if needed; there is no local Docker image
   to build with `docker compose build`.

9. Follow [Normal startup](#normal-startup), then reload the browser so it loads
   the new client. If it still shows the old UI, use **Ctrl+F5**.
10. Check application health, staff login, dashboard counts and the changed
   functionality. Rehearse actual check-in changes on a separate test database,
   not by creating fictitious attendance in the live event database.

If tests, builds or startup fail, keep registration closed and investigate.
Do not switch to an empty database or assume an older app can safely read a
database changed by an upgrade. Restore only through the approved recovery
procedure. Legacy Medplum and email-receipt upgrades have
[separate migration guidance](DESIGN.md#legacy-deployment-upgrades).

## 4. Start check-ins again (reset all attendance)

Use this after a rehearsal or when an authorized organizer decides to restart
attendance collection. **This resets every check-in for this app's event,
not just a selected person.** It does not reset roster counts or restore
original CSV details.

The reset command:

* Empties the check-in List and removes event Practitioner check-in records.
* Removes links from Persons to those deleted check-in records, allowing
  roster members to check in again with a new arrival time and receipt.
* Preserves attendee and staff Lists, participant IDs, and the latest saved
  names, emails, affiliations and tracks, including check-in corrections.
* Preserves Persons created through manual registration and existing AuditEvents.
  Unrelated Practitioner records are not deleted.

**This is an operational reset, not secure erasure of personal data.** FHIR
resource history, audit records, backups, and previously saved receipt copies
can still contain earlier attendance information. Old receipts cannot be
reopened in the app after reset.

### Reset procedure

1. Confirm approval and stop all check-in activity. Export the arrivals CSV
   from the staff dashboard if you need a readable record of the previous run.
2. Stop the registration app with **Ctrl+C** in its PowerShell window.
   Stop any other app instance, development server, or import process using
   this database. **Keep the app stopped until verification is complete.**
   The reset command cannot enforce exclusive access by itself.
3. Take a [database backup](README.md#backup-and-restore-of-the-host-data-directory).
   That procedure stops Blaze while copying its data and starts it afterwards.
   Confirm the backup succeeded before proceeding.
4. With Blaze running, check its health:

   ```powershell
   Invoke-RestMethod 'http://localhost:8090/health'
   ```

5. From the application folder, run:

   ```powershell
   npm.cmd run checkins:reset -- --confirm-reset-checkins
   ```

   The explicit confirmation flag is required. The command uses the FHIR server
   configured in `.env`; check that it is the intended database before running.
   It uses two FHIR transactions: first remove Person links and clear the check-in
   List, then delete event Practitioners. Blaze checks delete references against
   the database before each transaction, so these steps cannot be combined.
   It then verifies zero active check-ins and no remaining event Practitioners.
   Expect a message starting with `Reset verified:`.

   If it reports an error, **do not reopen registration** until resolved. A
   transport error can mean the write outcome is uncertain. Inspect the database
   or rerun the command with the app still stopped; a completed reset can safely
   be repeated. If the first stage succeeded but deletion failed, the dashboard
   may show zero arrivals while old Practitioners still remain: **this is not
   a completed reset**. Keep the app stopped and rerun the command to finish.
   Inconsistent references must be repaired before resetting. A conflict with
   diagnostics saying `Referential integrity violated` is not a version conflict;
   if it persists with the two-stage reset, have the maintainer inspect additional
   references rather than disabling referential-integrity checks.

6. Follow [Normal startup](#normal-startup). Reload the browser to discard old
   selections and receipts, sign in, and refresh the dashboard.
7. Verify:
   * Checked-in, attendee-arrival, track-lead-arrival and manual-arrival totals
     are zero; the arrivals table is empty.
   * Attendee and staff roster counts are unchanged.
   * Expected roster members appear as not yet checked in.

No roster reimport is needed for existing roster members. Manual-only people
remain outside both rosters, as before; they are not automatically eligible for
public roster check-in. If they should participate in the next run, arrange a
reviewed roster import using their existing participant IDs before reopening.
Do not create duplicate manual registrations with new IDs to bypass duplicate
checks.

Do any trial check-in on a separate test database. A check-in on the live
database after reset is a real new attendance record.

## 5. Monitor check-ins remotely over Wi-Fi

Use this to follow check-in status from a second computer, for example when
both computers are connected to the organizer's phone hotspot. **Never expose
Blaze or the app directly on the Wi-Fi.** Blaze has no authentication, so anyone
who can reach port 8090 can read, change or delete every record. Plain HTTP would
also send staff passwords and personal data unencrypted. Keep both services
bound to `127.0.0.1` as configured and use an encrypted SSH tunnel with key
authentication instead:

```text
Monitoring PC ──(SSH, port 22, key login, encrypted)──> Registration PC
  localhost:8080  →  registration app (staff dashboard)
  localhost:8090  →  Blaze FHIR API (optional, full access)
```

No change to `.env`, `compose.yaml` or the application is needed.

### Prepare the registration PC (once)

Run in an administrator PowerShell window:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Set-Service sshd -StartupType Automatic
Start-Service sshd
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

### Disable rule

 ```powershell
Disable-NetFirewallRule -Name OpenSSH-Server-In-TCP
```

### Slacker rules

```powershell
Set-NetFirewallRule -Name OpenSSH-Server-In-TCP -Enabled True -Profile Private -RemoteAddress LocalSubnet
```

### Connect from the monitoring PC

Check the connection, then open the tunnel and leave the window open while
monitoring (replace the user and address):

```powershell
Test-NetConnection 172.20.10.2 -Port 22
ssh -N -L 8080:127.0.0.1:8080 eventops@172.20.10.2
```

Add `-L 8090:127.0.0.1:8090` only if raw FHIR access to Blaze is needed.
Some Android hotspots isolate clients from each other; if the connection test
fails, check the hotspot settings.

### What to view

**Recommended: the staff dashboard.** Open `http://localhost:8080` on the
monitoring PC and sign in via **Staff access** to see check-in counts, track
totals, arrivals, receipts and CSV export. `PUBLIC_URL` remains
`http://localhost:8080`, matching the tunneled browser origin, so same-origin
checks and cookies work unchanged.

**Optional: raw FHIR queries to Blaze** (requires the 8090 tunnel). A Practitioner
is created only at check-in, so their count equals the number of arrivals:

* Count of checked-in participants:
  `http://localhost:8090/fhir/Practitioner?_summary=count`
* Check-in List with arrival times plus the referenced Practitioners:
  `http://localhost:8090/fhir/List?identifier=https://hl7.no/fhir/ig/hackathon-attendance-registration-app/identifier/list%7Chackathon-2026-checkins&_include=List:item`
* All checked-in Practitioners:
  `http://localhost:8090/fhir/Practitioner?_count=500`

### Stop the SSH server after monitoring

1. On the monitoring PC, press `Ctrl+C` in the SSH tunnel terminal.
2. On the registration PC, open **PowerShell as Administrator** and run:

   ```powershell
   Stop-Service sshd
   Get-Service sshd
   ```

   Confirm that the status is `Stopped`. Stopping the server interrupts SSH
   access; closing the tunnel alone does not stop the server.
3. To also prevent SSH from starting automatically after a reboot, run:

   ```powershell
   Set-Service sshd -StartupType Disabled
   ```

   Before the next monitoring session, restore automatic startup and start SSH:

   ```powershell
   Set-Service sshd -StartupType Automatic
   Start-Service sshd
   ```

   If you also disabled the firewall rule, re-enable it with
   `Enable-NetFirewallRule -Name OpenSSH-Server-In-TCP`. This preserves its
   configured subnet restriction.

### Security notes

* The 8090 tunnel gives **full read/write/delete** access to Blaze. For
  read-only monitoring, forward only 8080 and use the authenticated dashboard.
* Use a private hotspot with WPA2/WPA3 and a strong password; do not share it.
* The monitoring PC displays personal data: lock its screen, avoid local
  exports unless needed and close the SSH window after monitoring.
* Without SSH, the only acceptable alternative is the trusted HTTPS reverse
  proxy described under [Configuration](README.md#configuration), never
  `HOST=0.0.0.0` over plain HTTP or publishing Blaze on `0.0.0.0:8090`.
