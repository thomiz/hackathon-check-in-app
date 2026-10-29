# Hackathon check-in list - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **Hackathon check-in list**

## Resource Profile: Hackathon check-in list 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/checkin-list | *Version*:0.6.1 |
| Draft as of 2026-10-29 | *Computable Name*:CheckinList |

 
Lists attendees and organizers checked in to the event, with their check-in dates. Entries may be marked as manually registered. 

**Usages:**

* Examples for this Profile: [List/example-checkins](List-example-checkins.md)

You can also check for [usages in the FHIR IG Statistics](https://packages2.fhir.org/xig/resource/hackathon-check-in-app|current/StructureDefinition/StructureDefinition-checkin-list.json)

### Formal Views of Profile Content

 [Description of Profiles, Differentials, Snapshots and how the different presentations work](http://build.fhir.org/ig/FHIR/ig-guidance/readingIgs.html#structure-definitions). 

 

Other representations of profile: [CSV](StructureDefinition-checkin-list.csv), [Excel](StructureDefinition-checkin-list.xlsx), [Schematron](StructureDefinition-checkin-list.sch) 



## Resource Content

```json
{
  "resourceType" : "StructureDefinition",
  "id" : "checkin-list",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/checkin-list",
  "version" : "0.6.1",
  "name" : "CheckinList",
  "title" : "Hackathon check-in list",
  "status" : "draft",
  "date" : "2026-10-29T09:23:29+00:00",
  "publisher" : "HL7 Norway",
  "contact" : [{
    "name" : "HL7 Norway",
    "telecom" : [{
      "system" : "url",
      "value" : "https://www.hl7.no"
    }]
  }],
  "description" : "Lists attendees and organizers checked in to the event, with their check-in dates. Entries may be marked as manually registered.",
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
      "id" : "List.code",
      "path" : "List.code",
      "patternCodeableConcept" : {
        "coding" : [{
          "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/list-purpose",
          "code" : "checkins"
        }]
      }
    },
    {
      "id" : "List.entry.extension",
      "path" : "List.entry.extension",
      "slicing" : {
        "discriminator" : [{
          "type" : "value",
          "path" : "url"
        }],
        "ordered" : false,
        "rules" : "open"
      }
    },
    {
      "id" : "List.entry.extension:manualRegistration",
      "path" : "List.entry.extension",
      "sliceName" : "manualRegistration",
      "min" : 0,
      "max" : "1",
      "type" : [{
        "code" : "Extension",
        "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/manual-registration"]
      }]
    },
    {
      "id" : "List.entry.date",
      "path" : "List.entry.date",
      "min" : 1
    },
    {
      "id" : "List.entry.item",
      "path" : "List.entry.item",
      "type" : [{
        "code" : "Reference",
        "targetProfile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/checked-in-participant"]
      }]
    }]
  }
}

```
