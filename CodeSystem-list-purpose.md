# ListPurpose - hackathon-check-in-app v0.6.0

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **ListPurpose**

## CodeSystem: ListPurpose 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/list-purpose | *Version*:0.6.0 |
| Draft as of 2026-10-29 | *Computable Name*:ListPurpose |

 This Code system is referenced in the content logical definition of the following value sets: 

* [ListPurposes](ValueSet-list-purposes.md)



## Resource Content

```json
{
  "resourceType" : "CodeSystem",
  "id" : "list-purpose",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/list-purpose",
  "version" : "0.6.0",
  "name" : "ListPurpose",
  "status" : "draft",
  "date" : "2026-10-29T07:06:30+00:00",
  "publisher" : "HL7 Norway",
  "contact" : [{
    "name" : "HL7 Norway",
    "telecom" : [{
      "system" : "url",
      "value" : "https://www.hl7.no"
    }]
  }],
  "jurisdiction" : [{
    "coding" : [{
      "system" : "urn:iso:std:iso:3166",
      "code" : "NO"
    }]
  }],
  "caseSensitive" : true,
  "content" : "complete",
  "count" : 3,
  "concept" : [{
    "code" : "roster",
    "display" : "Advance sign-ups"
  },
  {
    "code" : "staff",
    "display" : "Staff roster"
  },
  {
    "code" : "checkins",
    "display" : "Actual arrivals"
  }]
}

```
