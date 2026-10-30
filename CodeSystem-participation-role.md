# Hackathon participation role - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **Hackathon participation role**

## CodeSystem: Hackathon participation role 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role | *Version*:0.6.1 |
| Draft as of 2026-10-30 | *Computable Name*:ParticipationRole |

 
Event roles only, not professional qualifications. 

 This Code system is referenced in the content logical definition of the following value sets: 

* [ParticipationRoles](ValueSet-participation-roles.md)



## Resource Content

```json
{
  "resourceType" : "CodeSystem",
  "id" : "participation-role",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role",
  "version" : "0.6.1",
  "name" : "ParticipationRole",
  "title" : "Hackathon participation role",
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
  "description" : "Event roles only, not professional qualifications.",
  "jurisdiction" : [{
    "coding" : [{
      "system" : "urn:iso:std:iso:3166",
      "code" : "NO"
    }]
  }],
  "caseSensitive" : true,
  "content" : "complete",
  "count" : 2,
  "concept" : [{
    "code" : "attendee",
    "display" : "Attendee"
  },
  {
    "code" : "track-lead",
    "display" : "Track lead"
  }]
}

```
