# example-roster - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-roster**

## Example List: example-roster

Profile: [Hackathon participant roster](StructureDefinition-roster-list.md)

| | | | |
| :--- | :--- | :--- | :--- |
| Date: 2026-11-09 08:00:00+0100 | Mode: Working List | Status: Current | Code: Staff roster |

* **Items**: [Person Alex Example](Person-example-person.md)
  * Flag: Track lead



## Resource Content

```json
{
  "resourceType" : "List",
  "id" : "example-roster",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/roster-list"]
  },
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/list",
    "value" : "hackathon-2026-staff"
  }],
  "status" : "current",
  "mode" : "working",
  "code" : {
    "coding" : [{
      "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/list-purpose",
      "code" : "staff"
    }]
  },
  "date" : "2026-11-09T08:00:00+01:00",
  "entry" : [{
    "flag" : {
      "coding" : [{
        "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role",
        "code" : "track-lead"
      }]
    },
    "item" : {
      "reference" : "Person/example-person"
    }
  }]
}

```
