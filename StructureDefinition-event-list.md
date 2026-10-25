# Hackathon event list - hackathon-attendance-registration-app v0.1.0

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **Hackathon event list**

## Resource Profile: Hackathon event list 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/event-list | *Version*:0.1.0 |
| Draft as of 2026-10-25 | *Computable Name*:EventList |

 
Base profile for lists that track attendees and organizers for a hackathon event. 

**Usages:**

* Derived from this Profile: [Hackathon check-in list](StructureDefinition-checkin-list.md) and [Hackathon participant roster](StructureDefinition-roster-list.md)

You can also check for [usages in the FHIR IG Statistics](https://packages2.fhir.org/xig/resource/hackathon-attendance-registration-app|current/StructureDefinition/StructureDefinition-event-list.json)

### Formal Views of Profile Content

 [Description of Profiles, Differentials, Snapshots and how the different presentations work](http://build.fhir.org/ig/FHIR/ig-guidance/readingIgs.html#structure-definitions). 

 

Other representations of profile: [CSV](StructureDefinition-event-list.csv), [Excel](StructureDefinition-event-list.xlsx), [Schematron](StructureDefinition-event-list.sch) 



## Resource Content

```json
{
  "resourceType" : "StructureDefinition",
  "id" : "event-list",
  "url" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/event-list",
  "version" : "0.1.0",
  "name" : "EventList",
  "title" : "Hackathon event list",
  "status" : "draft",
  "date" : "2026-10-25T13:18:28+00:00",
  "publisher" : "HL7 Norway",
  "contact" : [{
    "name" : "HL7 Norway",
    "telecom" : [{
      "system" : "url",
      "value" : "https://www.hl7.no"
    }]
  }],
  "description" : "Base profile for lists that track attendees and organizers for a hackathon event.",
  "jurisdiction" : [{
    "coding" : [{
      "system" : "urn:iso:std:iso:3166",
      "code" : "NO"
    }]
  }],
  "fhirVersion" : "4.0.1",
  "mapping" : [{
    "identity" : "rim",
    "uri" : "http://hl7.org/v3",
    "name" : "RIM Mapping"
  },
  {
    "identity" : "w5",
    "uri" : "http://hl7.org/fhir/fivews",
    "name" : "FiveWs Pattern Mapping"
  }],
  "kind" : "resource",
  "abstract" : false,
  "type" : "List",
  "baseDefinition" : "http://hl7.org/fhir/StructureDefinition/List",
  "derivation" : "constraint",
  "differential" : {
    "element" : [{
      "id" : "List",
      "path" : "List"
    },
    {
      "id" : "List.identifier",
      "path" : "List.identifier",
      "min" : 1
    },
    {
      "id" : "List.status",
      "path" : "List.status",
      "fixedCode" : "current"
    },
    {
      "id" : "List.mode",
      "path" : "List.mode",
      "fixedCode" : "working"
    },
    {
      "id" : "List.code",
      "path" : "List.code",
      "min" : 1,
      "binding" : {
        "strength" : "required",
        "valueSet" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/ValueSet/list-purposes"
      }
    },
    {
      "id" : "List.date",
      "path" : "List.date",
      "min" : 1
    },
    {
      "id" : "List.entry.item.reference",
      "path" : "List.entry.item.reference",
      "min" : 1
    }]
  }
}

```
