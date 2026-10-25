# Hackathon attendance registration FHIR model

This Implementation Guide describes a FHIR R4 (4.0.1) data model for an event
roster and attendee check-in. It documents the FHIR resources, profiles,
extensions, terminology and examples used to represent those records. It does
not describe the internal operation or architecture of any application.

## Scope and terminology

The profiles distinguish people registered for the event from people who have
arrived:

* `ExpectedParticipant` profiles `Person` and represents an attendee or
  organizer registered for the event.
* `CheckedInParticipant` profiles `Practitioner` and represents an attendee or
  organizer who has checked in. `Practitioner` is used here as an
  event-specific demonstration model; it does not imply healthcare employment
  or a professional credential.

## Participant and list profiles

### Registered participants

`ExpectedParticipant` uses `Person` for the event's advance roster. Each record
has an event-specific identifier, a name, an email address and an affiliation.
The primary track is optional. The `Affiliation` and `PrimaryTrack` extensions
carry event details that are not part of the base `Person` resource.

### Checked-in participants

`CheckedInParticipant` uses `Practitioner` for a registered person who has
arrived. It carries the same identifying and event details as the expected
participant and requires an event role in `Practitioner.qualification`. The
role codes distinguish attendees from track leads; they are event roles, not
professional qualifications.

When a person checks in, `Person.link.target` can reference the corresponding
`CheckedInParticipant`. The shared event-specific participant identifier
supports identification across the two resources.

### Lists

`EventList` is the base profile for event lists. It requires a current,
working list with an identifier, purpose and date.

* `RosterList` represents registered people. Each entry references an
  `ExpectedParticipant`, and `List.entry.flag` records the person's event
  role.
* `CheckinList` represents arrivals. Each entry references a
  `CheckedInParticipant`, and `List.entry.date` records the check-in time.
  `ManualRegistration` can mark an entry that was registered manually.

The relationships between the profiles are:

```text
RosterList.entry.item  ------> ExpectedParticipant (Person)
RosterList.entry.flag  ------> ParticipationRole
ExpectedParticipant.link ----> CheckedInParticipant (Practitioner)
CheckinList.entry.item ------> CheckedInParticipant (Practitioner)
CheckinList.entry.date ------> Check-in time
```

## Event use cases

The following overview shows the actors' basic interactions with the event
process. It describes the use cases, not a particular user interface or
application workflow.

```text
Attendee  ------> (Register for the event)
Attendee  ------> (Check in on arrival)
Organizer ------> (Maintain participant roster)
Organizer ------> (Record attendee check-in)
```

Registration is represented by a `Person` referenced from a roster list.
Check-in is represented by a linked `Practitioner` referenced from a check-in
list, with the arrival time recorded on the list entry.

## Terminology and examples

The guide defines code systems and value sets for list purposes, participation
roles and event tracks. The examples illustrate roster entries, checked-in
participants and the links between them. Published examples use synthetic
information only; real participant details and event records must remain
private.
