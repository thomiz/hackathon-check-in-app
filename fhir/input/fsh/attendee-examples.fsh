Instance: example-attendee-care-plans
InstanceOf: ExpectedParticipant
Usage: #example
* identifier[eventId].value = "synthetic-101"
* name.text = "Robin Sample"
* telecom[email].value = "robin@example.invalid"
* extension[affiliation].valueString = "Synthetic municipality"
* extension[primaryTrack].valueCoding = Track#care-plans

Instance: example-attendee-medication
InstanceOf: ExpectedParticipant
Usage: #example
* identifier[eventId].value = "synthetic-102"
* name.text = "Morgan Demo"
* telecom[email].value = "morgan@example.invalid"
* extension[affiliation].valueString = "Synthetic medicines agency"
* extension[primaryTrack].valueCoding = Track#medication-definition

Instance: example-attendee-ihe
InstanceOf: ExpectedParticipant
Usage: #example
* identifier[eventId].value = "synthetic-103"
* name.text = "Taylor Test"
* telecom[email].value = "taylor@example.invalid"
* extension[affiliation].valueString = "Synthetic integration team"
* extension[primaryTrack].valueCoding = Track#ihe-mhd

Instance: example-attendee-ehds
InstanceOf: ExpectedParticipant
Usage: #example
* identifier[eventId].value = "synthetic-104"
* name.text = "Casey Example"
* telecom[email].value = "casey@example.invalid"
* extension[affiliation].valueString = "Synthetic interoperability group"
* extension[primaryTrack].valueCoding = Track#ehds-summary

Instance: example-attendee-101
InstanceOf: ExpectedParticipant
Usage: #example
* identifier[eventId].value = "synthetic-105"
* name.text = "Jamie Learner"
* telecom[email].value = "jamie@example.invalid"
* extension[affiliation].valueString = "Synthetic university"
* extension[primaryTrack].valueCoding = Track#fhir-101
* link.target = Reference(example-attendee-practitioner)

Instance: example-attendee-undecided
InstanceOf: ExpectedParticipant
Usage: #example
* identifier[eventId].value = "synthetic-106"
* name.text = "Jordan Visitor"
* telecom[email].value = "jordan@example.invalid"
* extension[affiliation].valueString = "Synthetic independent developer"

Instance: example-attendee-practitioner
InstanceOf: CheckedInParticipant
Usage: #example
* identifier[eventId].value = "synthetic-105"
* name.text = "Jamie Learner"
* telecom[email].value = "jamie@example.invalid"
* extension[affiliation].valueString = "Synthetic university"
* extension[primaryTrack].valueCoding = Track#fhir-101
* qualification[eventRole].code = ParticipationRole#attendee

Instance: example-attendee-list
InstanceOf: RosterList
Usage: #example
* identifier.system = "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/list"
* identifier.value = "synthetic-attendee-roster"
* code = ListPurpose#roster
* date = "2026-11-09T08:00:00+01:00"
* entry[0].item = Reference(example-attendee-care-plans)
* entry[=].flag = ParticipationRole#attendee
* entry[+].item = Reference(example-attendee-medication)
* entry[=].flag = ParticipationRole#attendee
* entry[+].item = Reference(example-attendee-ihe)
* entry[=].flag = ParticipationRole#attendee
* entry[+].item = Reference(example-attendee-ehds)
* entry[=].flag = ParticipationRole#attendee
* entry[+].item = Reference(example-attendee-101)
* entry[=].flag = ParticipationRole#attendee
* entry[+].item = Reference(example-attendee-undecided)
* entry[=].flag = ParticipationRole#attendee
