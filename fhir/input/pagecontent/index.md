# hackathon-attendance-registration-app

This event-specific demonstration uses FHIR R4 (4.0.1).

* Persons represent expected participants from the advance attendee and staff rosters.
* Practitioners represent checked-in participants. **This use does not establish
  healthcare employment or professional credentials.** The event-role
  qualification distinguishes `attendee` from `track-lead` only.
* Two roster Lists reference Persons; the actual-arrival List references
  Practitioners and records check-in timestamps.
* Person links point to the corresponding checked-in Practitioner.
* Tasks record confirmation-email progress. `completed` means accepted by Brevo,
  not verified delivery.

Stable event identifiers are independent of Medplum's server-generated resource
IDs. Clients resolve Lists by their identifier, then read their references.
Creating a participant, Practitioner, email Task and check-in entry uses an atomic
transaction. Conditional creates and version-aware List updates prevent duplicate
or lost arrivals. Clients must follow pagination for FHIR search results.

The application backend enforces roster membership, signed selection tokens,
staff-only overrides and corrections, and validated track/role values. The IG
package supplies profiles for full HL7 validator checks; no claim is made that
Medplum alone enforces every profile constraint.

Near-match suggestions intentionally expose names and affiliations after five
typed letters. Explicit selection reveals email and track. This event-specific
convenience mechanism is not authentication.

Only synthetic examples may be published in this guide. Real rosters, check-ins,
audit records, email statuses and credentials must remain private.

The synthetic attendee examples cover care plans, medication definition, IHE MHD,
EHDS, FHIR 101 and an undecided attendee, alongside the SMART example. They include
an attendee-roster List and a linked checked-in Practitioner with the `attendee`
qualification code, in addition to the track-lead example.

The app separately distributes an agenda-derived staff snapshot as CSV and Person
resources. It is not included in this IG or its package and does not record attendance.
