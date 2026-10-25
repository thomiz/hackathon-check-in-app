# Artifacts Summary - hackathon-attendance-registration-app v0.1.0

* [**Table of Contents**](toc.md)
* **Artifacts Summary**

## Artifacts Summary

This page provides a list of the FHIR artifacts defined as part of this implementation guide.

### Structures: Resource Profiles 

These define constraints on FHIR resources for systems conforming to this implementation guide.

| | |
| :--- | :--- |
| [Checked-in Hackathon participant](StructureDefinition-checked-in-participant.md) | For attendees and organizers checked in to the event. Event-specific demonstration model. Does not imply healthcare employment or a professional credential. |
| [Expected Hackathon participant](StructureDefinition-expected-participant.md) | For attendees and organizers registered for the event. |
| [Hackathon check-in list](StructureDefinition-checkin-list.md) | Lists attendees and organizers checked in to the event, with their check-in dates. Entries may be marked as manually registered. |
| [Hackathon event list](StructureDefinition-event-list.md) | Base profile for lists that track attendees and organizers for a hackathon event. |
| [Hackathon participant roster](StructureDefinition-roster-list.md) | Lists attendees and organizers registered for the event, with each person's participation role. |

### Structures: Extension Definitions 

These define constraints on FHIR data types for systems conforming to this implementation guide.

| |
| :--- |
| [Confirmed or expected primary track](StructureDefinition-primary-track.md) |
| [ManualRegistration](StructureDefinition-manual-registration.md) |
| [Participant affiliation](StructureDefinition-affiliation.md) |

### Terminology: Value Sets 

These define sets of codes used by systems conforming to this implementation guide.

| |
| :--- |
| [ListPurposes](ValueSet-list-purposes.md) |
| [ParticipationRoles](ValueSet-participation-roles.md) |
| [Tracks](ValueSet-tracks.md) |

### Terminology: Code Systems 

These define new code systems used by systems conforming to this implementation guide.

| | |
| :--- | :--- |
| [2026 Hackathon tracks](CodeSystem-track.md) |  |
| [Hackathon participation role](CodeSystem-participation-role.md) | Event roles only, not professional qualifications. |
| [ListPurpose](CodeSystem-list-purpose.md) |  |

### Example: Example Instances 

These are example instances that show what data produced and consumed by systems conforming with this implementation guide might look like.

| |
| :--- |
| [example-attendee-101](Person-example-attendee-101.md) |
| [example-attendee-care-plans](Person-example-attendee-care-plans.md) |
| [example-attendee-ehds](Person-example-attendee-ehds.md) |
| [example-attendee-ihe](Person-example-attendee-ihe.md) |
| [example-attendee-list](List-example-attendee-list.md) |
| [example-attendee-medication](Person-example-attendee-medication.md) |
| [example-attendee-practitioner](Practitioner-example-attendee-practitioner.md) |
| [example-attendee-undecided](Person-example-attendee-undecided.md) |
| [example-checkins](List-example-checkins.md) |
| [example-person](Person-example-person.md) |
| [example-practitioner](Practitioner-example-practitioner.md) |
| [example-roster](List-example-roster.md) |

