# Norwegian FHIR Hackathon 2026 registration

Responsive attendee check-in and authenticated registration-desk tools for
November 9, 2026 at Rebel, Oslo. React/TypeScript frontend, Fastify backend,
Medplum FHIR R4 persistence, and a Brevo email worker.

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
  audited email retry and CSV export.
* Durable email Tasks with bounded backoff on explicit transient rejection.
  Uncertain sends require staff review, not blind automatic resending.
* FSH profiles, terminology, synthetic examples and a generated validation package.

The public agenda staff roster is bundled in `seed`, as requested, separately
from synthetic examples. No private Google Sheet attendee data is bundled.
There is no fake persistence or automatic success fallback when Medplum is unavailable.

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
`.env` interactively if absent, validates Compose and pulls pinned images.
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

## Start and configure Medplum

```powershell
docker compose up -d
docker compose ps
Invoke-RestMethod 'http://localhost:8103/healthcheck'
```

Initial migrations can take several minutes. Compose runs Medplum server and its
administration app, PostgreSQL and Redis. Named volumes preserve database,
binary and Redis data. Postgres and Redis have no host ports; Medplum and its
administration UI bind only to loopback.

Open `http://localhost:3000` on the PC and complete local Medplum account/project
setup. This is an operator step, not attendee access. Create a backend
ClientApplication in a dedicated 2026 project, obtain its client ID/secret and set
`MEDPLUM_CLIENT_ID` / `MEDPLUM_CLIENT_SECRET` in `.env`. Grant that client access
to Person, Practitioner, List and Task reads/searches/creates/updates and AuditEvent
creation. Do not use a super-admin token. Follow Medplum's own account setup
instructions if your local account requires email verification.

The backend authenticates with client credentials. Ordinary Medplum clients
cannot choose resource IDs, so new resources use conditional POSTs and
transaction-local `urn:uuid` references. Stable identifiers provide idempotency.
Existing Lists are updated with `If-Match`; the entire check-in transaction is
retried after version conflicts. List names in the planning specification are
logical identifiers, not literal Medplum resource IDs.

Implementation is based on the pinned Medplum 5.2.6
[official full-stack deployment](https://github.com/medplum/medplum/blob/v5.2.6/docker-compose.full-stack.yml).
Verify live transaction/conditional-create behavior, version conflicts, backup
restore and resource use on the event PC before admitting real attendees.

## Run the application

```powershell
npm.cmd run start
```

Open `http://localhost:8080`. Startup checks Medplum, initializes the three
event Lists if needed, and preloads the bundled agenda staff roster if the staff
List is empty. Preloading creates Persons only, never check-ins, Practitioners
or emails. Existing staff Lists are not automatically overwritten.
A failed startup is an error, never an offline mock mode.

```powershell
Invoke-RestMethod 'http://localhost:8080/api/health'
```

Health checks include a Medplum List query and report whether email is configured.
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
* `MEDPLUM_BASE_URL`: local API root, without `/fhir/R4`.
* `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`: configure both or neither.
  The sender must be verified with Brevo. No credentials means emails remain
  queued, with a startup warning; attendance still works.
* `PRIVACY_NOTICE_URL`: link to the event privacy notice.

The 2026 event privacy notice must be updated before real use to cover check-in
timestamps, email processing, retention and the deliberately accepted matching
disclosure: suggestions reveal names/affiliations and selection reveals email and
track. Matching is convenient self-selection, not identity verification.

Phones cannot use the PC's `localhost`. Configure a reachable venue hostname,
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
representation, not a transaction to POST directly to Medplum.

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
data-maintenance step in Medplum as well. The snapshot is not fetched from GitHub
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
Medplum ID. Use the same ID and event role for anyone in both rosters.
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

Synthetic samples are in `examples`. Do not send mail to these reserved
`example.invalid` addresses or import samples into the real event project.
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
* Email Tasks focus on Practitioners; `completed` means provider acceptance,
  not delivery. Delivery/bounce webhook integration is not implemented.

All dashboard data comes from FHIR. Search pagination is followed; List entries
are read as a whole. Corrections update linked resources and roster roles
transactionally, and create AuditEvents. Manual registration creates a Person,
Practitioner, marked check-in entry, Task and audit atomically without adding to
either expected roster.

## Email reliability

The backend checks persisted Tasks every five seconds. Without internet, an
uncertain attempted send becomes failed for staff review; unsent ready Tasks stay
durable. Explicit HTTP 429/503 rejections use bounded exponential backoff
(five attempts maximum). Other rejections fail visibly. Interrupted in-progress
jobs older than two minutes are marked uncertain rather than automatically resent.

Check Brevo history before using the audited staff retry action. A provider
acceptance followed by a local write failure cannot guarantee exactly-once email.
The retry UI explicitly warns about duplicate messages. Run one backend instance
for this event; do not horizontally scale this worker.

## Verification and event operation

```powershell
npm.cmd test
npm.cmd run build
```

Tests use a test-only versioned in-memory FHIR adapter; production has no memory
fallback. They cover imports, matching thresholds, role handling, linked resources,
duplicate/concurrent arrivals, manual audit, API authorization, track changes,
transaction failure, email rejection/uncertainty, and Medplum request shapes.

Before event day, also rehearse against the actual local Medplum stack:

1. Two simultaneous check-ins and a duplicate resubmission.
2. A staff-only track lead and someone in both rosters.
3. Manual registration, corrections, CSV export and email retry.
4. Medplum outage, internet outage, backend restart and PC reboot.
5. A real Brevo test to an organizer-controlled address.
6. Trusted HTTPS on a phone and the kiosk.
7. Private backup and restore to a separate test instance.

For consistent backups, stop the registration backend before taking a PostgreSQL
dump and backing up binary storage. For example, run `docker compose exec -T
postgres pg_dump -U medplum -d medplum -Fc -f /tmp/event.dump`, then `docker compose
cp postgres:/tmp/event.dump D:\private\event.dump`. This avoids corrupting binary
dumps through Windows PowerShell redirection. Protect backups as personal data.
Restore only into a separately provisioned test database first, using `pg_restore`;
never overwrite the live event database without an approved recovery procedure.
Retain `.env` securely for recovery and document the retention/deletion date.

`docker compose stop` preserves volumes. Do not run `docker compose down -v`
unless deliberately deleting the event's data after approved retention.
