# Hackathon participant roster - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **Hackathon participant roster**

## Resource Profile: Hackathon participant roster 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/roster-list | *Version*:0.6.1 |
| Draft as of 2026-10-30 | *Computable Name*:RosterList |

 
Lists attendees and organizers registered for the event, with each person's participation role. 

**Usages:**

* Examples for this Profile: [List/example-attendee-list](List-example-attendee-list.md) and [List/example-roster](List-example-roster.md)

You can also check for [usages in the FHIR IG Statistics](https://packages2.fhir.org/xig/resource/hackathon-check-in-app|current/StructureDefinition/StructureDefinition-roster-list.json)

### Formal Views of Profile Content

 [Description of Profiles, Differentials, Snapshots and how the different presentations work](http://build.fhir.org/ig/FHIR/ig-guidance/readingIgs.html#structure-definitions). 

 

Other representations of profile: [CSV](StructureDefinition-roster-list.csv), [Excel](StructureDefinition-roster-list.xlsx), [Schematron](StructureDefinition-roster-list.sch) 



## Resource Content

```json
{
  "resourceType" : "StructureDefinition",
  "id" : "roster-list",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/roster-list",
  "version" : "0.6.1",
  "name" : "RosterList",
  "title" : "Hackathon participant roster",
  "status" : "draft",
  "date" : "2026-10-30T09:20:03+00:00",
  "publisher" : "HL7 Norway",
  "contact" : [{
    "name" : "HL7 Norway",
    "telecom" : [{
      "system" : "url",
      "value" : "https://www.hl7.no"
    }]
  }],
  "description" : "Lists attendees and organizers registered for the event, with each person's participation role.",
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
  "baseDefinition" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/event-list",
  "derivation" : "constraint",
  "differential" : {
    "element" : [{
      "id" : "List",
      "path" : "List"
    },
    {
      "id" : "List.entry.flag",
      "path" : "List.entry.flag",
      "min" : 1,
      "binding" : {
        "strength" : "required",
        "valueSet" : "https://hl7.no/fhir/ig/hackathon-check-in-app/ValueSet/participation-roles"
      }
    },
    {
      "id" : "List.entry.item",
      "path" : "List.entry.item",
      "type" : [{
        "code" : "Reference",
        "targetProfile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"]
      }]
    }]
  }
}

```
