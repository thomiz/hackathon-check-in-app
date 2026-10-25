# example-checkins - hackathon-attendance-registration-app v0.1.0

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-checkins**

## Example List: example-checkins

Profile: [Hackathon check-in list](StructureDefinition-checkin-list.md)

| | | | |
| :--- | :--- | :--- | :--- |
| Date: 2026-11-09 09:00:00+0100 | Mode: Working List | Status: Current | Code: Actual arrivals |

* **Items**: [Alex Example (https://hl7.no/fhir/ig/hackathon-attendance-registration-app/identifier/participant-2026#synthetic-001)](Practitioner-example-practitioner.md)
  * Date: 2026-11-09 09:00:00+0100



## Resource Content

```json
{
  "resourceType" : "List",
  "id" : "example-checkins",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/checkin-list"]
  },
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/identifier/list",
    "value" : "hackathon-2026-checkins"
  }],
  "status" : "current",
  "mode" : "working",
  "code" : {
    "coding" : [{
      "system" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/CodeSystem/list-purpose",
      "code" : "checkins"
    }]
  },
  "date" : "2026-11-09T09:00:00+01:00",
  "entry" : [{
    "date" : "2026-11-09T09:00:00+01:00",
    "item" : {
      "reference" : "Practitioner/example-practitioner"
    }
  }]
}

```
