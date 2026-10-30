# 2026 Hackathon tracks - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **2026 Hackathon tracks**

## CodeSystem: 2026 Hackathon tracks 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/track | *Version*:0.6.1 |
| Draft as of 2026-10-30 | *Computable Name*:Track |

 This Code system is referenced in the content logical definition of the following value sets: 

* [Tracks](ValueSet-tracks.md)



## Resource Content

```json
{
  "resourceType" : "CodeSystem",
  "id" : "track",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/track",
  "version" : "0.6.1",
  "name" : "Track",
  "title" : "2026 Hackathon tracks",
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
  "jurisdiction" : [{
    "coding" : [{
      "system" : "urn:iso:std:iso:3166",
      "code" : "NO"
    }]
  }],
  "caseSensitive" : true,
  "content" : "complete",
  "count" : 6,
  "concept" : [{
    "code" : "care-plans",
    "display" : "Modeling Patient care plans as FHIR"
  },
  {
    "code" : "smart",
    "display" : "SMART on FHIR"
  },
  {
    "code" : "medication-definition",
    "display" : "Medication Definition on FHIR - Exploration of FHIR services from EMA and NoMA"
  },
  {
    "code" : "ihe-mhd",
    "display" : "Document sharing for IHE MHD"
  },
  {
    "code" : "ehds-summary",
    "display" : "EHDS patient summary"
  },
  {
    "code" : "fhir-101",
    "display" : "FHIR 101: Introduction to HL7 FHIR with practical assignments"
  }]
}

```
