# example-attendee-practitioner - hackathon-attendance-registration-app v0.1.0

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-attendee-practitioner**

## Example Practitioner: example-attendee-practitioner

Profile: [Checked-in Hackathon participant](StructureDefinition-checked-in-participant.md)

Jamie Learner (https://hl7.no/fhir/ig/hackathon-attendance-registration-app/identifier/participant-2026#synthetic-105)

-------

| | |
| :--- | :--- |
| Contact Detail | [jamie@example.invalid](mailto:jamie@example.invalid) |
| Qualification: | Attendee |
| [Confirmed or expected primary track](StructureDefinition-primary-track.md) | [2026 Hackathon tracks: fhir-101](CodeSystem-track.md#track-fhir-101)(FHIR 101: Introduction to HL7 FHIR with practical assignments) |
| [Participant affiliation](StructureDefinition-affiliation.md) | Synthetic university |



## Resource Content

```json
{
  "resourceType" : "Practitioner",
  "id" : "example-attendee-practitioner",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/checked-in-participant"]
  },
  "extension" : [{
    "url" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/affiliation",
    "valueString" : "Synthetic university"
  },
  {
    "url" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/primary-track",
    "valueCoding" : {
      "system" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/CodeSystem/track",
      "code" : "fhir-101"
    }
  }],
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/identifier/participant-2026",
    "value" : "synthetic-105"
  }],
  "name" : [{
    "text" : "Jamie Learner"
  }],
  "telecom" : [{
    "system" : "email",
    "value" : "jamie@example.invalid"
  }],
  "qualification" : [{
    "code" : {
      "coding" : [{
        "system" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/CodeSystem/participation-role",
        "code" : "attendee"
      }]
    }
  }]
}

```
