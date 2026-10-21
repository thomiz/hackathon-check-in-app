CodeSystem: ParticipationRole
Id: participation-role
Title: "Hackathon participation role"
Description: "Event roles only, not professional qualifications."
* ^caseSensitive = true
* #attendee "Attendee"
* #track-lead "Track lead"

ValueSet: ParticipationRoles
Id: participation-roles
* include codes from system ParticipationRole

CodeSystem: Track
Id: track
Title: "2026 Hackathon tracks"
* ^caseSensitive = true
* #care-plans "Modeling Patient care plans as FHIR"
* #smart "SMART on FHIR"
* #medication-definition "Medication Definition on FHIR - Exploration of FHIR services from EMA and NoMA"
* #ihe-mhd "Document sharing for IHE MHD"
* #ehds-summary "EHDS patient summary"
* #fhir-101 "FHIR 101: Introduction to HL7 FHIR with practical assignments"

ValueSet: Tracks
Id: tracks
* include codes from system Track

CodeSystem: ListPurpose
Id: list-purpose
* ^caseSensitive = true
* #roster "Advance sign-ups"
* #staff "Staff roster"
* #checkins "Actual arrivals"

ValueSet: ListPurposes
Id: list-purposes
* include codes from system ListPurpose
