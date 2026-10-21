# Norwegian FHIR Hackathon 2026 registration

Responsive attendee check-in and authenticated registration-desk tools for
November 9, 2026 at Rebel, Oslo. React/TypeScript frontend, Fastify backend,
Blaze FHIR R4 server persistence, and locally generated QR attendance receipts.

The planning specification remains in the event repository at
`Norwegian-FHIR-hackathon-2026/planlegging/registreringsapp.md`.
All application and application-specific FHIR sources live here.

The IG title and package ID are `hackathon-attendance-registration-app`, with
canonical URL `https://hl7.no/fhir/ig/hackathon-attendance-registration-app`.
Its FHIR machine-readable name is `HackathonAttendanceRegistrationApp`.
The repository directory remains `hackaton-registration-app`.

## What is implemented

* Live fuzzy name matching after five letters, optional affiliation refinement,
  all near matches ranked by relevance, explicit selection and email/track prefill.
* Editable confirmed primary track and transactional check-in.
* Google Sheet and organizer-reviewed agenda CSV imports into Person rosters.
* Linked Practitioners for actual arrivals, with attendee/track-lead qualification.
* Staff login, FHIR-backed counts, track totals, corrections, manual registration,
  receipt retrieval and CSV export.
* A readable attendance receipt and locally generated plain-text QR code after
  check-in, including original arrival time and registered details.
* FSH profiles, terminology, synthetic examples and a generated validation package.

The public agenda staff roster is bundled in `seed`, as requested, separately
from synthetic examples. No private Google Sheet attendee data is bundled.
There is no fake persistence or automatic success fallback when Blaze is unavailable.

## Windows setup

Use a supported Windows version, hardware virtualization and Docker Desktop with
the WSL 2 backend and Linux containers. Confirm Docker Desktop licensing for your
organization. Use a maintained Node.js LTS release; the application currently
supports Node.js 18.17+ for compatibility with the development PC.

```powershell
Set-Location 'D:\Programdisk-2\GitRepo\hackaton-registration-app'
.\scripts\Install-Prerequisites.ps1
```

This installs missing Git, Node.js LTS/npm and Docker Desktop using WinGet.
Existing installations are not upgraded automatically. WinGet needs Microsoft
App Installer. Installers may prompt for approval, licenses and restarts.
The script does not change execution policy or accept licenses automatically.

If needed, run `wsl --install` in administrator PowerShell, restart when requested,
then complete Docker Desktop setup. For existing WSL installations, diagnose with
`wsl --status` and update with `wsl --update` if required. Start Docker Desktop and
wait for the engine before proceeding.

```powershell
.\scripts\Install-Prerequisites.ps1 -CheckOnly
.\scripts\Install-App.ps1
```

The application installer runs `npm ci`, builds the app and FHIR package, creates
`.env` interactively if absent, validates Compose and pulls the pinned Blaze image.
It never overwrites existing configuration or starts services. The initial staff
password prompt is visible: run it privately and use a unique event password.
Only its salted scrypt hash is saved. Restrict `.env` permissions to event operators.
For dependency installation without image downloads, pass `-SkipImages`.

Equivalent manual steps:

```powershell
npm.cmd ci
npm.cmd run configure
npm.cmd run build
npm.cmd run fhir:build
npm.cmd run fhir:package
npm.cmd run fhir:fixtures
docker compose pull
```

## Start the Blaze FHIR server

The FHIR backend is [Blaze](https://github.com/samply/blaze) `samply/blaze:1.11.0`
(standalone RocksDB storage, FHIR R4), defined in `compose.yaml`. It is the only
container: no separate database, cache or administration app is needed.

### Store the database on the host disk

Blaze keeps all data in `/app/data` inside the container. `compose.yaml` maps that
path with a **bind mount** to a directory on the PC's own disk, so the database
files are never stored inside the Docker image, the container layer or a Docker
named volume. They survive `docker compose down`, image upgrades and Docker
Desktop resets, and can be backed up with ordinary file tools.

The host directory is set by `BLAZE_DATA_DIR` in `.env` (default
`./data/blaze`, relative to the repository; `data/` is ignored by Git). Compose
uses `create_host_path: false`, so you must create the directory before the first
start; a typo then fails loudly instead of silently starting an empty database.
Blaze creates its `index`, `transaction`, `resource` and admin sub-directories on
the first start; the directory must otherwise be empty.

```powershell
# Default location inside the repository:
New-Item -ItemType Directory -Force '.\data\blaze'

# Or a dedicated, access-restricted data disk (recommended for the event):
New-Item -ItemType Directory -Force 'D:\hackathon-data\blaze'
# then in .env:  BLAZE_DATA_DIR=D:/hackathon-data/blaze
```

Use forward slashes or a quoted absolute path for `BLAZE_DATA_DIR` on Windows.
Restrict the directory's NTFS permissions to event operators: it contains
personal data in readable form (Blaze does not encrypt data at rest); use
BitLocker on the event PC.

Notes:

* The container runs as UID 1001. With Docker Desktop on Windows, bind-mounted
  Windows folders are writable without further steps. On a Linux host run
  `sudo chown -R 1001:1001 <dir>` once.
* Docker Desktop shares Windows paths into the WSL 2 VM, which is slower than a
  Docker volume for RocksDB. Expected event load (a few hundred attendees) is
  small, but rehearse startup and check-in speed on the event PC. For better I/O
  while still keeping the files outside Docker, point `BLAZE_DATA_DIR` at a WSL
  ext4 path such as `\\wsl$\Ubuntu\home\<user>\blaze-data` (create it inside WSL
  and `chown 1001:1001` it), and include it in backups.
* Never point two Blaze containers at the same directory at once.
* Do not put the directory in a OneDrive/Dropbox-synchronized folder; sync tools
  can corrupt open RocksDB files.

### Start and check

```powershell
docker compose up -d
docker compose ps
Invoke-RestMethod 'http://localhost:8090/health'
Invoke-RestMethod 'http://localhost:8090/fhir/metadata' | Select-Object -ExpandProperty software
```

Startup takes 10–60 seconds; `docker compose ps` shows `healthy` when ready.
Check that files appeared in the host directory (for example
`Get-ChildItem .\data\blaze`).

Blaze listens on container port 8080; Compose publishes it **only on loopback**
as `127.0.0.1:8090`, because the registration app already uses 8080. Blaze runs
**without authentication**: never change the port mapping to `0.0.0.0`, never
forward it through a firewall or reverse proxy, and never expose it to the venue
Wi-Fi. Phones and browsers only talk to the registration backend, which is the
only Blaze client. Set `FHIR_BASE_URL=http://localhost:8090/fhir` in `.env`.
`BASE_URL` in `compose.yaml` must match the host side (`http://localhost:8090`)
because Blaze uses it for absolute search paging links; the backend rejects
paging links outside `FHIR_BASE_URL`.

Compose sets a 2 GB JVM heap (`JAVA_TOOL_OPTIONS=-Xmx2g`) plus a 256 MiB RocksDB
block cache; allow about 3 GB RAM for Docker Desktop's WSL VM. Referential
integrity is enforced, so references must point to existing resources or to
entries in the same transaction.

The backend creates new resources with conditional POSTs (`ifNoneExist` on the
stable identifier) and transaction-local `urn:uuid` references; Blaze assigns
resource IDs. Stable identifiers provide idempotency. Existing resources are
updated with `If-Match`; the entire check-in transaction is retried after version
conflicts (HTTP 409/412). Blaze executes transactions atomically and serially.
List names in the planning specification are logical identifiers, not literal
Blaze resource IDs.

Verify transaction/conditional-create behavior, version conflicts, backup
restore and resource use on the event PC before admitting real attendees.
See the [Blaze documentation](https://samply.github.io/blaze/) for configuration
options.

## Run the application

```powershell
npm.cmd run start
```

Open `http://localhost:8080`. Startup checks Blaze, initializes the three
event Lists if needed, and preloads the bundled agenda staff roster if the staff
List is empty. Preloading creates Persons only, never check-ins, Practitioners
or receipts. Existing staff Lists are not automatically overwritten.
A failed startup is an error, never an offline mock mode.

```powershell
Invoke-RestMethod 'http://localhost:8080/api/health'
```

Health checks include a Blaze List query.
The UI exposes the separate **Staff access** page; the staff roster does not grant
login rights. Staff sessions last 30 minutes and require re-login after expiry.

For development, run `npm run dev` and `npm run dev:ui` in separate terminals;
set `PUBLIC_URL=http://localhost:5173` for Vite's same-origin API proxy. Production
serves the built UI and API from the same backend origin.

## Configuration

See `.env.example`. Generated passwords and secrets belong only in `.env`.

* `PUBLIC_URL`: exact browser origin, used for same-origin checks and secure
  cookies. Set the final HTTPS origin for venue deployment.
* `HOST`: defaults to loopback. For LAN access, configure binding/firewall and
  a trusted HTTPS reverse proxy; expose only the HTTPS application endpoint.
* `FHIR_BASE_URL`: Blaze FHIR base including `/fhir`
  (default `http://localhost:8090/fhir`). Must stay a loopback address.
* `BLAZE_DATA_DIR`: host directory for the Blaze database files, used by
  `compose.yaml` (default `./data/blaze`). Must exist before `docker compose up`.
* `PRIVACY_NOTICE_URL`: link to the event privacy notice.

The 2026 event privacy notice must be updated before real use to cover check-in
timestamps, receipt contact details/QR codes, retention and the deliberately accepted matching
disclosure: suggestions reveal names/affiliations and selection reveals email and
track. Matching is convenient self-selection, not identity verification.

For workstation-only operation, open `http://localhost:8080` on the registration
PC. Attendees scan the displayed receipt, not a website URL; their phones need
neither Wi-Fi nor access to the local FHIR server.

If attendees instead open the app on their phones, they cannot use the PC's
`localhost`. Configure a reachable venue hostname,
trusted HTTPS certificate, Wi-Fi client connectivity and Windows Firewall first.
Distribute that URL as a QR code. Keep the staffed kiosk as fallback.

## Roster imports

### Bundled agenda staff roster

The event agenda's **Track leads and partners** table is the master staff source.
Generate the distributable snapshot from that Markdown file:

```powershell
npm.cmd run staff:generate -- 'D:\Programdisk-2\GitRepo\Norwegian-FHIR-Hackathon-2026\Norwegian-FHIR-hackathon-2026\input\pagecontent\hack-agenda.md'
```

This generates `seed\staff.csv`, a matching collection Bundle of preloaded
Persons in `seed\staff-persons.json`, and source metadata/review warnings in
`seed\staff-source.json`. Startup imports the CSV through the same transactional
importer used by staff tools; the Person Bundle is the portable distributable
representation, not a transaction to POST directly to Blaze.

The snapshot contains 16 named people: track-associated rows use `track-lead`,
while Partner rows use `attendee` with no primary track. It preserves the master
agenda's spelling, accents and affiliations. Stable IDs are derived from normalized
names and are independent of email; reconcile IDs manually if someone is renamed.
For a Google Sheet participant who is also in the staff roster, use the same
bundled ID and role when preparing that attendee CSV.

Review warnings emitted by generation:

* The grouped Michal Cermak row produces only Michal's Person, not four invented
  team members. Add named members to the master table or use staff manual
  registration on arrival.
* Nino Lo Cascio's displayed email differs from the mailto target. The generator
  consistently uses the mailto target and flags the discrepancy for organizer
  review. Correct the master agenda and regenerate if needed.

After updating the master, regenerate and explicitly refresh an existing project:

```powershell
npm.cmd run import -- staff '.\seed\staff.csv'
```

Imports are additive, so removal from the master requires an explicit staff
data-maintenance step in Blaze as well. The snapshot is not fetched from GitHub
at runtime and has no dependency on the planning repository during deployment.
It is intentionally distributed personal contact data from the public master:
protect it in the deployed app, never serve `seed` as static files, and include
this distribution in the event's privacy review. It is excluded from the IG
package and validation examples, which contain synthetic people only.

### Google Sheet attendees and optional staff updates

Export only the needed Google Sheet fields, then map columns to:

```csv
id,name,email,affiliation,track,role
reviewed-stable-id,Example Person,example@example.invalid,Example Org,smart,attendee
```

`id` is an organizer-assigned stable participant key, not an email address or
Blaze resource ID. Use the same ID and event role for anyone in both rosters.
Allowed roles: `attendee`, `track-lead`. Other partners/staff are attendees unless
confirmed as track leads. Allowed track codes appear in the UI and FHIR ValueSet;
an empty track is allowed. Imports validate every row, reject ambiguous duplicates
and conflicting roles, and import atomically (maximum 500 rows per import).
Existing confirmed details are not overwritten by reimports. Imports are additive;
absent CSV rows do not delete existing roster members.

```powershell
npm.cmd run import -- roster 'D:\private\reviewed-attendees.csv'
npm.cmd run import -- staff 'D:\private\reviewed-staff.csv'
```

Alternatively paste CSV in the authenticated staff page. The event index is the
track source. No 2025 data is used.

Synthetic samples are in `examples`, with reserved `example.invalid` addresses.
Do not import samples into the real event project.
Import does not create Practitioners or check anyone in.

## FHIR data and validation

Sources are under `fhir`; generated content is ignored by Git.

```powershell
npm.cmd run fhir:build
npm.cmd run fhir:package
```

This produces `fhir\output\package.tgz`, consumed by the full validation command:

```powershell
$env:FHIR_VALIDATOR_JAR = 'D:\tools\validator_cli.jar'
npm.cmd run fhir:fixtures
npm.cmd run fhir:validate
```

Use the official [HL7 validator](https://github.com/hapifhir/org.hl7.fhir.core/releases)
and a compatible Java runtime. Validation runs locally with external terminology
lookups disabled; inspect `fhir\output\validation.json`. The fixture command also
exports synthetic resources from the actual check-in service, including manual
registration and audit, so validation covers runtime output as well as FSH examples.
The app uses typed
resource builders and input validation at runtime; full profile conformance is
checked against the generated package, not assumed from `meta.profile`.
For an HTML IG, run IG Publisher using `fhir\ig.ini`.

* Person identifiers use the event participant identifier system.
* Additional synthetic attendee examples cover care plans, medication, IHE,
  EHDS, FHIR 101 and no selected track, with a linked checked-in attendee and
  a sample attendee-roster List. These are IG examples, not live attendee seeds.
* Practitioners share that identifier and are linked from their Person.
* Roster/staff Lists reference Persons and carry expected event-role flags.
* The check-in List references Practitioners and records arrival dates.
* Event-role `qualification.code` is **not a professional credential**.
* Receipts read registered details/role from the saved Practitioner and the
  original check-in timestamp from its check-in List entry.

All dashboard data comes from FHIR. Search pagination is followed; List entries
are read as a whole. Corrections update linked resources and roster roles
transactionally, and create AuditEvents. Manual registration creates a Person,
Practitioner, marked check-in entry and audit atomically without adding to
either expected roster.

## QR attendance receipts

After a successful FHIR transaction, the app reads back the saved check-in and
shows a receipt with name, email, affiliation, event role, primary track, event
date/location, original arrival time in Europe/Oslo and a stable receipt reference
(the server-assigned Practitioner ID). The readable details and QR represent the
same data. Duplicate submissions return the existing saved details and timestamp,
not the newly submitted draft or current time.

QR generation uses **`qrcode.react` 4.2.0** (ISC license, bundled TypeScript
definitions) as a runtime dependency. Run `npm.cmd ci` after updating; no separate
QR service, API key, font, CDN or internet request is used. The library renders a
black-on-white SVG with a four-module quiet zone and at least medium error
correction. Receipt text is embedded directly, not a URL or FHIR JSON.
The development-only dependency **`jsqr` 1.4.0** (Apache-2.0, bundled types)
decodes rendered receipt QR codes in tests to check exact text round trips,
including maximum-length and Unicode registration fields. It is not bundled
into the application.

Ask the attendee to scan the code using their phone's camera/QR reader and copy
the text or take a screenshot. Some phones need a dedicated QR reader or Lens
for plain-text codes. They can also photograph the readable receipt. Scanning
does not automatically save a file. Long names/affiliations produce denser codes;
rehearse scanning at the workstation's actual screen size.

The receipt clears after 120 seconds for shared-workstation privacy. **Keep
receipt open** restarts that period; **Done / clear receipt** clears it immediately.
Manual registrations show the same receipt. Staff can use **Show receipt** in
the arrivals table to reopen a receipt, including after correcting details,
without registering again. Only the selected receipt is displayed, not the
dashboard containing other attendees.

If QR rendering fails, the saved check-in remains valid; an explicit error,
retry button and readable details remain available. If FHIR persistence or
receipt retrieval fails, an error is shown rather than fabricated confirmation.
Retrying check-in is idempotent.

Receipts confirm check-in, not full-event attendance, identity or professional
credentials. They are not digitally signed. They include personal contact
details: keep screenshots/private copies secure and clear the screen between
attendees. Existing name matching is not identity verification.

### Updating an existing deployment

Stop the old application before starting this version. Email sending, provider
configuration, retry routes, status columns and email Task creation are removed.
Remove obsolete `BREVO_*` settings from your private `.env` and revoke unused
provider credentials. The attendee email field remains registered contact data.
Existing FHIR email Tasks are left untouched for retention/audit review; this
version neither reads nor processes them. Existing check-ins need no Tasks to
reopen a receipt. No attendance data or local FHIR storage is migrated or deleted.

Rebuild the FHIR definitions/package in a clean generated-output directory so
obsolete email profiles, extensions, terminology and examples are not retained.

### Migrating from the previous Medplum backend

Earlier versions stored data in Medplum (PostgreSQL/Redis Docker volumes). This
version talks only to Blaze; data is **not** migrated automatically and the new
Blaze database starts empty.

1. Stop the old application and run `docker compose stop` with the *old*
   `compose.yaml` before pulling this version. Do not run `docker compose down -v`;
   keep the old volumes until retention/deletion is approved.
2. Remove `MEDPLUM_BASE_URL`, `MEDPLUM_CLIENT_ID`, `MEDPLUM_CLIENT_SECRET`,
   `POSTGRES_PASSWORD` and `REDIS_PASSWORD` from your private `.env`, and add
   `FHIR_BASE_URL` and `BLAZE_DATA_DIR` as in `.env.example`.
3. Create the Blaze data directory, start Blaze and the app as described above.
   The staff roster is preloaded on first start; reimport reviewed attendee CSVs.
4. If check-ins already recorded in Medplum must be carried over, export Person,
   Practitioner, List and AuditEvent resources from Medplum as a FHIR transaction
   Bundle (with references rewritten to `urn:uuid` entries) and POST it to
   `http://localhost:8090/fhir` before admitting attendees. Rehearse this on a
   test Blaze directory first.

Because no event has run yet, the normal path is a clean start plus reimport.

## Verification and event operation

```powershell
npm.cmd test
npm.cmd run build
```

Tests use a test-only versioned in-memory FHIR adapter; production has no memory
fallback. They cover imports, matching thresholds, role handling, linked resources,
duplicate/concurrent arrivals, manual audit, API authorization, track changes,
transaction failure, persisted receipts, QR encoding/decoding, and Blaze request shapes.

Before event day, also rehearse against the actual local Blaze server:

1. Two simultaneous check-ins and a duplicate resubmission.
2. A staff-only track lead and someone in both rosters.
3. Manual registration, corrections, CSV export and reopening receipts.
4. Blaze outage, internet outage, backend restart and PC reboot.
5. Scan a real receipt using iPhone/Android, including long details; verify
   saved text, offline scanning, original timestamp, and workstation clearing.
6. Local workstation access; trusted HTTPS if offering phone-based registration.
7. Private backup and restore to a separate test instance.

### Backup and restore of the host data directory

Because the Blaze database is an ordinary directory on the host disk, a
consistent backup is a copy of that directory taken while Blaze is stopped
(RocksDB files are not consistent while being written):

```powershell
# Stop the registration backend first (Ctrl+C in its window), then:
docker compose stop blaze
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
robocopy '.\data\blaze' "D:\private\blaze-backup-$stamp" /MIR /COPY:DAT /R:1 /W:1
docker compose start blaze
```

Use your `BLAZE_DATA_DIR` path instead of `.\data\blaze` if changed. `robocopy`
exit codes below 8 mean success. Stopping takes a few seconds and interrupts
check-in briefly, so take backups at quiet moments (e.g. after the morning rush
and at the end of the day). Protect backups as personal data (encrypted disk or
archive), and retain `.env` securely for recovery.

To restore, stop Blaze, point `BLAZE_DATA_DIR` at an empty test directory, copy
the backup into it, start Blaze and verify the dashboard. Only restore over the
live directory with an approved recovery procedure: stop Blaze, move the damaged
directory aside (do not delete it), copy the backup into the original path and
start Blaze again.

For a portable, human-readable export in addition to file backups, you can
download resources over the FHIR API while Blaze is running, for example
`Invoke-RestMethod 'http://localhost:8090/fhir/Person?_count=500' | ConvertTo-Json -Depth 50 | Set-Content -Encoding utf8 D:\private\persons.json`
(repeat for Practitioner, List and AuditEvent and follow `next` links if present).

`docker compose stop` and `docker compose down` both keep the host directory.
Data is deleted only by removing the `BLAZE_DATA_DIR` directory itself; do so
only after the approved retention date, and also delete backups. Document the
retention/deletion date.
