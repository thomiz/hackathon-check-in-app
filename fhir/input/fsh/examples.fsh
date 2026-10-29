Instance: example-person
InstanceOf: ExpectedParticipant
Usage: #example
* identifier[eventId].value = "synthetic-001"
* name.text = "Alex Example"
* telecom[email].value = "alex@example.invalid"
* extension[affiliation].valueString = "Example organization"
* extension[primaryTrack].valueCoding = Track#smart
* link.target = Reference(example-practitioner)

Instance: example-practitioner
InstanceOf: CheckedInParticipant
Usage: #example
* identifier[eventId].value = "synthetic-001"
* name.text = "Alex Example"
* telecom[email].value = "alex@example.invalid"
* extension[affiliation].valueString = "Example organization"
* extension[primaryTrack].valueCoding = Track#smart
* qualification[eventRole].code = ParticipationRole#track-lead

Instance: example-roster
InstanceOf: RosterList
Usage: #example
* identifier.system = "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/list"
* identifier.value = "hackathon-2026-staff"
* code = ListPurpose#staff
* date = "2026-11-09T08:00:00+01:00"
* entry.item = Reference(example-person)
* entry.flag = ParticipationRole#track-lead

Instance: example-checkins
InstanceOf: CheckinList
Usage: #example
* identifier.system = "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/list"
* identifier.value = "hackathon-2026-checkins"
* date = "2026-11-09T09:00:00+01:00"
* entry.item = Reference(example-practitioner)
* entry.date = "2026-11-09T09:00:00+01:00"
