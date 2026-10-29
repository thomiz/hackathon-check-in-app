# FHIR data model - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* **FHIR data model**

## FHIR data model

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/ImplementationGuide/hackathon-check-in-app | *Version*:0.6.1 |
| Draft as of 2026-10-29 | *Computable Name*:HackathonCheckInApp |

# Hackathon check-in app FHIR model

This page describes the FHIR R4 (4.0.1) data model for an event roster and attendee check-in. It documents the FHIR resources, profiles, extensions, terminology and examples used to represent those records. See [Business architecture](business-architecture.md) for the event use cases and the business-layer process view.

## Scope and terminology

The profiles distinguish people registered for the event from people who have arrived:

* `ExpectedParticipant` profiles `Person` and represents an attendee or organizer registered for the event.
* `CheckedInParticipant` profiles `Practitioner` and represents an attendee or organizer who has checked in. `Practitioner` is used here as an event-specific demonstration model; it does not imply healthcare employment or a professional credential.

## Participant and list profiles

### Registered participants

`ExpectedParticipant` uses `Person` for the event's advance roster. Each record has an event-specific identifier, a name, an email address and an affiliation. The primary track is optional. The `Affiliation` and `PrimaryTrack` extensions carry event details that are not part of the base `Person` resource.

### Checked-in participants

`CheckedInParticipant` uses `Practitioner` for a registered person who has arrived. It carries the same identifying and event details as the expected participant and requires an event role in `Practitioner.qualification`. The role codes distinguish attendees from track leads; they are event roles, not professional qualifications.

When a person checks in, `Person.link.target` can reference the corresponding `CheckedInParticipant`. The shared event-specific participant identifier supports identification across the two resources.

### Lists

`EventList` is the base profile for event lists. It requires a current, working list with an identifier, purpose and date.

* `RosterList` represents registered people. Each entry references an `ExpectedParticipant`, and `List.entry.flag` records the person's event role.
* `CheckinList` represents arrivals. Each entry references a `CheckedInParticipant`, and `List.entry.date` records the check-in time. `ManualRegistration` can mark an entry that was registered manually.

The relationships between the profiles are:

```
RosterList.entry.item  ------> ExpectedParticipant (Person)
RosterList.entry.flag  ------> ParticipationRole
ExpectedParticipant.link ----> CheckedInParticipant (Practitioner)
CheckinList.entry.item ------> CheckedInParticipant (Practitioner)
CheckinList.entry.date ------> Check-in time

```

## Terminology and examples

The guide defines code systems and value sets for list purposes, participation roles and event tracks. The examples illustrate roster entries, checked-in participants and the links between them. Published examples use synthetic information only; real participant details and event records must remain private.

The [Demo application](demo.md) page links to a browser-only version of the check-in app that uses these examples as its data.



## Resource Content

```json
{
  "resourceType" : "ImplementationGuide",
  "id" : "hackathon-check-in-app",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/ImplementationGuide/hackathon-check-in-app",
  "version" : "0.6.1",
  "name" : "HackathonCheckInApp",
  "title" : "hackathon-check-in-app",
  "status" : "draft",
  "date" : "2026-10-29T15:50:41+00:00",
  "publisher" : "HL7 Norway",
  "contact" : [{
    "name" : "HL7 Norway",
    "telecom" : [{
      "system" : "url",
      "value" : "https://www.hl7.no"
    }]
  }],
  "description" : "Event-specific check-in demonstration; Practitioner event roles are not professional credentials.",
  "jurisdiction" : [{
    "coding" : [{
      "system" : "urn:iso:std:iso:3166",
      "code" : "NO"
    }]
  }],
  "packageId" : "hackathon-check-in-app",
  "license" : "CC0-1.0",
  "fhirVersion" : ["4.0.1"],
  "dependsOn" : [{
    "id" : "hl7tx",
    "extension" : [{
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/implementationguide-dependency-comment",
      "valueMarkdown" : "Automatically added as a dependency - all IGs depend on HL7 Terminology"
    }],
    "uri" : "http://terminology.hl7.org/ImplementationGuide/hl7.terminology",
    "packageId" : "hl7.terminology.r4",
    "version" : "7.5.0"
  },
  {
    "id" : "hl7ext",
    "extension" : [{
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/implementationguide-dependency-comment",
      "valueMarkdown" : "Automatically added as a dependency - all IGs depend on the HL7 Extension Pack"
    }],
    "uri" : "http://hl7.org/fhir/extensions/ImplementationGuide/hl7.fhir.uv.extensions",
    "packageId" : "hl7.fhir.uv.extensions.r4",
    "version" : "5.4.0"
  }],
  "definition" : {
    "extension" : [{
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-internal-dependency",
      "valueCode" : "hl7.fhir.uv.tools.r4#1.3.0"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "copyrightyear"
      },
      {
        "url" : "value",
        "valueString" : "2026+"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "releaselabel"
      },
      {
        "url" : "value",
        "valueString" : "ci-build"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "autoload-resources"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "path-liquid"
      },
      {
        "url" : "value",
        "valueString" : "template/liquid"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "path-liquid"
      },
      {
        "url" : "value",
        "valueString" : "input/liquid"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "path-qa"
      },
      {
        "url" : "value",
        "valueString" : "temp/qa"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "path-temp"
      },
      {
        "url" : "value",
        "valueString" : "temp/pages"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "path-output"
      },
      {
        "url" : "value",
        "valueString" : "output"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "path-suppressed-warnings"
      },
      {
        "url" : "value",
        "valueString" : "input/ignoreWarnings.txt"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "path-history"
      },
      {
        "url" : "value",
        "valueString" : "https://hl7.no/fhir/ig/hackathon-check-in-app/history.html"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "template-html"
      },
      {
        "url" : "value",
        "valueString" : "template-page.html"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "template-md"
      },
      {
        "url" : "value",
        "valueString" : "template-page-md.html"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "apply-contact"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "apply-context"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "apply-copyright"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "apply-jurisdiction"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "apply-license"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "apply-publisher"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "apply-version"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "apply-wg"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "active-tables"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "fmm-definition"
      },
      {
        "url" : "value",
        "valueString" : "http://hl7.org/fhir/versions.html#maturity"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "propagate-status"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "excludelogbinaryformat"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    },
    {
      "extension" : [{
        "url" : "code",
        "valueCode" : "tabbed-snapshots"
      },
      {
        "url" : "value",
        "valueString" : "true"
      }],
      "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-parameter"
    }],
    "resource" : [{
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "CodeSystem"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "CodeSystem-track.html"
      }],
      "reference" : {
        "reference" : "CodeSystem/track"
      },
      "name" : "2026 Hackathon tracks",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "StructureDefinition:resource"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "StructureDefinition-checked-in-participant.html"
      }],
      "reference" : {
        "reference" : "StructureDefinition/checked-in-participant"
      },
      "name" : "Checked-in Hackathon participant",
      "description" : "For attendees and organizers checked in to the event. Event-specific demonstration model. Does not imply healthcare employment or a professional credential.",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "StructureDefinition:extension"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "StructureDefinition-primary-track.html"
      }],
      "reference" : {
        "reference" : "StructureDefinition/primary-track"
      },
      "name" : "Confirmed or expected primary track",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "Person"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "Person-example-attendee-101.html"
      }],
      "reference" : {
        "reference" : "Person/example-attendee-101"
      },
      "name" : "example-attendee-101",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "Person"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "Person-example-attendee-care-plans.html"
      }],
      "reference" : {
        "reference" : "Person/example-attendee-care-plans"
      },
      "name" : "example-attendee-care-plans",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "Person"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "Person-example-attendee-ehds.html"
      }],
      "reference" : {
        "reference" : "Person/example-attendee-ehds"
      },
      "name" : "example-attendee-ehds",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "Person"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "Person-example-attendee-ihe.html"
      }],
      "reference" : {
        "reference" : "Person/example-attendee-ihe"
      },
      "name" : "example-attendee-ihe",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "List"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "List-example-attendee-list.html"
      }],
      "reference" : {
        "reference" : "List/example-attendee-list"
      },
      "name" : "example-attendee-list",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/roster-list"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "Person"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "Person-example-attendee-medication.html"
      }],
      "reference" : {
        "reference" : "Person/example-attendee-medication"
      },
      "name" : "example-attendee-medication",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "Practitioner"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "Practitioner-example-attendee-practitioner.html"
      }],
      "reference" : {
        "reference" : "Practitioner/example-attendee-practitioner"
      },
      "name" : "example-attendee-practitioner",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/checked-in-participant"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "Person"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "Person-example-attendee-undecided.html"
      }],
      "reference" : {
        "reference" : "Person/example-attendee-undecided"
      },
      "name" : "example-attendee-undecided",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "List"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "List-example-checkins.html"
      }],
      "reference" : {
        "reference" : "List/example-checkins"
      },
      "name" : "example-checkins",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/checkin-list"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "Person"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "Person-example-person.html"
      }],
      "reference" : {
        "reference" : "Person/example-person"
      },
      "name" : "example-person",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "Practitioner"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "Practitioner-example-practitioner.html"
      }],
      "reference" : {
        "reference" : "Practitioner/example-practitioner"
      },
      "name" : "example-practitioner",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/checked-in-participant"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "List"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "List-example-roster.html"
      }],
      "reference" : {
        "reference" : "List/example-roster"
      },
      "name" : "example-roster",
      "exampleCanonical" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/roster-list"
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "StructureDefinition:resource"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "StructureDefinition-expected-participant.html"
      }],
      "reference" : {
        "reference" : "StructureDefinition/expected-participant"
      },
      "name" : "Expected Hackathon participant",
      "description" : "For attendees and organizers registered for the event.",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "StructureDefinition:resource"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "StructureDefinition-checkin-list.html"
      }],
      "reference" : {
        "reference" : "StructureDefinition/checkin-list"
      },
      "name" : "Hackathon check-in list",
      "description" : "Lists attendees and organizers checked in to the event, with their check-in dates. Entries may be marked as manually registered.",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "StructureDefinition:resource"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "StructureDefinition-event-list.html"
      }],
      "reference" : {
        "reference" : "StructureDefinition/event-list"
      },
      "name" : "Hackathon event list",
      "description" : "Base profile for lists that track attendees and organizers for a hackathon event.",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "StructureDefinition:resource"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "StructureDefinition-roster-list.html"
      }],
      "reference" : {
        "reference" : "StructureDefinition/roster-list"
      },
      "name" : "Hackathon participant roster",
      "description" : "Lists attendees and organizers registered for the event, with each person's participation role.",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "CodeSystem"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "CodeSystem-participation-role.html"
      }],
      "reference" : {
        "reference" : "CodeSystem/participation-role"
      },
      "name" : "Hackathon participation role",
      "description" : "Event roles only, not professional qualifications.",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "CodeSystem"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "CodeSystem-list-purpose.html"
      }],
      "reference" : {
        "reference" : "CodeSystem/list-purpose"
      },
      "name" : "ListPurpose",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "ValueSet"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "ValueSet-list-purposes.html"
      }],
      "reference" : {
        "reference" : "ValueSet/list-purposes"
      },
      "name" : "ListPurposes",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "StructureDefinition:extension"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "StructureDefinition-manual-registration.html"
      }],
      "reference" : {
        "reference" : "StructureDefinition/manual-registration"
      },
      "name" : "ManualRegistration",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "StructureDefinition:extension"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "StructureDefinition-affiliation.html"
      }],
      "reference" : {
        "reference" : "StructureDefinition/affiliation"
      },
      "name" : "Participant affiliation",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "ValueSet"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "ValueSet-participation-roles.html"
      }],
      "reference" : {
        "reference" : "ValueSet/participation-roles"
      },
      "name" : "ParticipationRoles",
      "exampleBoolean" : false
    },
    {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/resource-information",
        "valueString" : "ValueSet"
      },
      {
        "url" : "http://hl7.org/fhir/StructureDefinition/implementationguide-page",
        "valueUri" : "ValueSet-tracks.html"
      }],
      "reference" : {
        "reference" : "ValueSet/tracks"
      },
      "name" : "Tracks",
      "exampleBoolean" : false
    }],
    "page" : {
      "extension" : [{
        "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-page-name",
        "valueUrl" : "toc.html"
      }],
      "nameUrl" : "toc.html",
      "title" : "Table of Contents",
      "generation" : "html",
      "page" : [{
        "extension" : [{
          "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-page-name",
          "valueUrl" : "index.html"
        }],
        "nameUrl" : "index.html",
        "title" : "FHIR data model",
        "generation" : "markdown"
      },
      {
        "extension" : [{
          "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-page-name",
          "valueUrl" : "business-architecture.html"
        }],
        "nameUrl" : "business-architecture.html",
        "title" : "Business architecture",
        "generation" : "markdown"
      },
      {
        "extension" : [{
          "url" : "http://hl7.org/fhir/tools/StructureDefinition/ig-page-name",
          "valueUrl" : "demo.html"
        }],
        "nameUrl" : "demo.html",
        "title" : "Demo application",
        "generation" : "markdown"
      }]
    },
    "parameter" : [{
      "code" : "path-resource",
      "value" : "input/capabilities"
    },
    {
      "code" : "path-resource",
      "value" : "input/examples"
    },
    {
      "code" : "path-resource",
      "value" : "input/extensions"
    },
    {
      "code" : "path-resource",
      "value" : "input/models"
    },
    {
      "code" : "path-resource",
      "value" : "input/operations"
    },
    {
      "code" : "path-resource",
      "value" : "input/profiles"
    },
    {
      "code" : "path-resource",
      "value" : "input/resources"
    },
    {
      "code" : "path-resource",
      "value" : "input/vocabulary"
    },
    {
      "code" : "path-resource",
      "value" : "input/maps"
    },
    {
      "code" : "path-resource",
      "value" : "input/testing"
    },
    {
      "code" : "path-resource",
      "value" : "input/history"
    },
    {
      "code" : "path-resource",
      "value" : "fsh-generated/resources"
    },
    {
      "code" : "path-pages",
      "value" : "template/config"
    },
    {
      "code" : "path-pages",
      "value" : "input/images"
    },
    {
      "code" : "path-tx-cache",
      "value" : "input-cache/txcache"
    }]
  }
}

```
