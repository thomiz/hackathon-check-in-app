# example-attendee-list - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-attendee-list**

## Example List: example-attendee-list

Profile: [Hackathon participant roster](StructureDefinition-roster-list.md)

| | | | |
| :--- | :--- | :--- | :--- |
| Date: 2026-11-09 08:00:00+0100 | Mode: Working List | Status: Current | Code: Advance sign-ups |

* **Items**: [Person Robin Sample](Person-example-attendee-care-plans.md)
  * Flag: Attendee
* **Items**: [Person Morgan Demo](Person-example-attendee-medication.md)
  * Flag: Attendee
* **Items**: [Person Taylor Test](Person-example-attendee-ihe.md)
  * Flag: Attendee
* **Items**: [Person Casey Example](Person-example-attendee-ehds.md)
  * Flag: Attendee
* **Items**: [Person Jamie Learner](Person-example-attendee-101.md)
  * Flag: Attendee
* **Items**: [Person Jordan Visitor](Person-example-attendee-undecided.md)
  * Flag: Attendee



## Resource Content

```json
{
  "resourceType" : "List",
  "id" : "example-attendee-list",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/roster-list"]
  },
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/list",
    "value" : "synthetic-attendee-roster"
  }],
  "status" : "current",
  "mode" : "working",
  "code" : {
    "coding" : [{
      "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/list-purpose",
      "code" : "roster"
    }]
  },
  "date" : "2026-11-09T08:00:00+01:00",
  "entry" : [{
    "flag" : {
      "coding" : [{
        "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role",
        "code" : "attendee"
      }]
    },
    "item" : {
      "reference" : "Person/example-attendee-care-plans"
    }
  },
  {
    "flag" : {
      "coding" : [{
        "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role",
        "code" : "attendee"
      }]
    },
    "item" : {
      "reference" : "Person/example-attendee-medication"
    }
  },
  {
    "flag" : {
      "coding" : [{
        "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role",
        "code" : "attendee"
      }]
    },
    "item" : {
      "reference" : "Person/example-attendee-ihe"
    }
  },
  {
    "flag" : {
      "coding" : [{
        "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role",
        "code" : "attendee"
      }]
    },
    "item" : {
      "reference" : "Person/example-attendee-ehds"
    }
  },
  {
    "flag" : {
      "coding" : [{
        "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role",
        "code" : "attendee"
      }]
    },
    "item" : {
      "reference" : "Person/example-attendee-101"
    }
  },
  {
    "flag" : {
      "coding" : [{
        "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role",
        "code" : "attendee"
      }]
    },
    "item" : {
      "reference" : "Person/example-attendee-undecided"
    }
  }]
}

```
