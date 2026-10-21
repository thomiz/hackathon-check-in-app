# hackathon-attendance-registration-app

This event-specific demonstration uses FHIR R4 (4.0.1).

* Persons represent expected participants from the advance attendee and staff rosters.
* Practitioners represent checked-in participants. **This use does not establish
  healthcare employment or professional credentials.** The event-role
  qualification distinguishes `attendee` from `track-lead` only.
* Two roster Lists reference Persons; the actual-arrival List references
  Practitioners and records check-in timestamps.
* Person links point to the corresponding checked-in Practitioner.
* Attendance receipts are derived from the saved Practitioner and its check-in
  List entry. A locally generated QR code contains the receipt as plain text,
  including registered contact details, event role, primary track, the original
  arrival timestamp and the Practitioner ID as receipt reference.

Stable event identifiers are independent of the FHIR server's (Blaze's) generated resource
IDs. Clients resolve Lists by their identifier, then read their references.
Creating a participant, Practitioner and check-in entry uses an atomic
transaction. Conditional creates and version-aware List updates prevent duplicate
or lost arrivals. Clients must follow pagination for FHIR search results.

The application backend enforces roster membership, signed selection tokens,
staff-only overrides and corrections, and validated track/role values. The IG
package supplies profiles for full HL7 validator checks; no claim is made that
the Blaze FHIR server alone enforces every profile constraint.

Near-match suggestions intentionally expose names and affiliations after five
typed letters. Explicit selection reveals email and track. This event-specific
convenience mechanism is not authentication.

Only synthetic examples may be published in this guide. Real rosters, check-ins,
audit records, receipt QR codes and credentials must remain private.

Receipts are not separate FHIR resources and do not replace FHIR persistence.
Staff can reopen them after corrections; the original check-in time is preserved.
The QR contains data rather than a URL, so scanning requires neither internet nor
access to the local server. It confirms check-in, not duration of participation,
and is not digitally signed or identity-verified. No email Tasks are created.

The synthetic attendee examples cover care plans, medication definition, IHE MHD,
EHDS, FHIR 101 and an undecided attendee, alongside the SMART example. They include
an attendee-roster List and a linked checked-in Practitioner with the `attendee`
qualification code, in addition to the track-lead example.

The app separately distributes an agenda-derived staff snapshot as CSV and Person
resources. It is not included in this IG or its package and does not record attendance.
