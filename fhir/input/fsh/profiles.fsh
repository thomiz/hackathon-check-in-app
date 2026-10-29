Extension: Affiliation
Id: affiliation
Title: "Participant affiliation"
Context: Person, Practitioner
* value[x] only string
* valueString 1..1

Extension: PrimaryTrack
Id: primary-track
Title: "Confirmed or expected primary track"
Context: Person, Practitioner
* value[x] only Coding
* valueCoding 1..1
* valueCoding from Tracks (required)

Extension: ManualRegistration
Id: manual-registration
Context: List.entry
* value[x] only boolean
* valueBoolean 1..1

RuleSet: ParticipantDetails
* identifier 1..*
* identifier ^slicing.discriminator.type = #value
* identifier ^slicing.discriminator.path = "system"
* identifier ^slicing.rules = #open
* identifier contains eventId 1..1
* identifier[eventId].system = "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026" (exactly)
* identifier[eventId].value 1..1
* name 1..*
* name.text 1..1
* telecom ^slicing.discriminator.type = #value
* telecom ^slicing.discriminator.path = "system"
* telecom ^slicing.rules = #open
* telecom contains email 1..1
* telecom[email].system = #email (exactly)
* telecom[email].value 1..1
* extension contains Affiliation named affiliation 1..1 and PrimaryTrack named primaryTrack 0..1

Profile: ExpectedParticipant
Parent: Person
Id: expected-participant
Title: "Expected Hackathon participant"
Description: "For attendees and organizers registered for the event."
* insert ParticipantDetails
* link.target only Reference(CheckedInParticipant)

Profile: CheckedInParticipant
Parent: Practitioner
Id: checked-in-participant
Title: "Checked-in Hackathon participant"
Description: "For attendees and organizers checked in to the event. Event-specific demonstration model. Does not imply healthcare employment or a professional credential."
* insert ParticipantDetails
* qualification ^slicing.discriminator.type = #value
* qualification ^slicing.discriminator.path = "code.coding.system"
* qualification ^slicing.rules = #open
* qualification contains eventRole 1..1
* qualification[eventRole].code.coding 1..1
* qualification[eventRole].code.coding.system = "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role" (exactly)
* qualification[eventRole].code.coding.code 1..1
* qualification[eventRole].code from ParticipationRoles (required)

Profile: EventList
Parent: List
Id: event-list
Title: "Hackathon event list"
Description: "Base profile for lists that track attendees and organizers for a hackathon event."
* identifier 1..*
* status = #current (exactly)
* mode = #working (exactly)
* code 1..1
* code from ListPurposes (required)
* date 1..1
* entry.item.reference 1..1

Profile: RosterList
Parent: EventList
Id: roster-list
Title: "Hackathon participant roster"
Description: "Lists attendees and organizers registered for the event, with each person's participation role."
* entry.item only Reference(ExpectedParticipant)
* entry.flag 1..1
* entry.flag from ParticipationRoles (required)

Profile: CheckinList
Parent: EventList
Id: checkin-list
Title: "Hackathon check-in list"
Description: "Lists attendees and organizers checked in to the event, with their check-in dates. Entries may be marked as manually registered."
* code = ListPurpose#checkins
* entry.item only Reference(CheckedInParticipant)
* entry.date 1..1
* entry.extension contains ManualRegistration named manualRegistration 0..1
