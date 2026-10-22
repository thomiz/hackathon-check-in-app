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
   for example `D:\private\reviewed-attendees.csv`.
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

4. Expect `Imported ... roster entries. No attendance was recorded.`
   If validation fails, correct the CSV and retry; the import is atomic.
5. Refresh the staff dashboard and check the expected roster count and changes.
   The reported import count is the number of input rows, not the number of
   newly added people. An import does not check anyone in.

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
4. Explicitly import the generated roster:

   ```powershell
   npm.cmd run import -- staff '.\seed\staff.csv'
   ```

5. Refresh the staff dashboard and check counts and changes.

**Restarting the app does not refresh an existing staff roster.** Generation
and import are separate steps. If you receive an already reviewed staff CSV
instead, import that file with `npm.cmd run import -- staff 'D:\private\reviewed-staff.csv'`.

### Removals, role changes and already checked-in people

* **Removing a CSV row does not remove that person from the database.** Imports
  are additive. There is no roster-removal button or CLI command; arrange an
  approved FHIR data-maintenance change with the maintainer. Do not delete the
  database or attendance history to remove one person.
* Imports preserve already confirmed check-in details. Use the staff correction
  workflow for a checked-in person's details or event role, then align source
  files with that correction.
* A conflicting role across rosters must be reconciled before importing.
  Do not bypass the error by giving the same person a different ID.

## 3. When server, client, scripts or dependencies are updated

Plan a maintenance window: check-in will be unavailable during this procedure.
Keep the previous known-working application version and a database backup.

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
   | `compose.yaml` or the pinned Blaze image | Review release-specific upgrade requirements, run `docker compose pull`, then `docker compose up -d` and verify Blaze health. Preserve `BLAZE_DATA_DIR`. |

8. Follow [Normal startup](#normal-startup), then reload the browser so it loads
   the new client. If it still shows the old UI, use **Ctrl+F5**.
9. Check application health, staff login, dashboard counts and the changed
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
