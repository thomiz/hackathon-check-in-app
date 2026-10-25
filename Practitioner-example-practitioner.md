# example-practitioner - hackathon-attendance-registration-app v0.1.0

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-practitioner**

## Example Practitioner: example-practitioner

Profile: [Checked-in Hackathon participant](StructureDefinition-checked-in-participant.md)

Alex Example (https://hl7.no/fhir/ig/hackathon-attendance-registration-app/identifier/participant-2026#synthetic-001)

-------

| | |
| :--- | :--- |
| Contact Detail | [alex@example.invalid](mailto:alex@example.invalid) |
| Qualification: | Track lead |
| [Confirmed or expected primary track](StructureDefinition-primary-track.md) | [2026 Hackathon tracks: smart](CodeSystem-track.md#track-smart)(SMART on FHIR) |
| [Participant affiliation](StructureDefinition-affiliation.md) | Example organization |



## Resource Content

```json
{
  "resourceType" : "Practitioner",
  "id" : "example-practitioner",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/checked-in-participant"]
  },
  "extension" : [{
    "url" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/affiliation",
    "valueString" : "Example organization"
  },
  {
    "url" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/primary-track",
    "valueCoding" : {
      "system" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/CodeSystem/track",
      "code" : "smart"
    }
  }],
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/identifier/participant-2026",
    "value" : "synthetic-001"
  }],
  "name" : [{
    "text" : "Alex Example"
  }],
  "telecom" : [{
    "system" : "email",
    "value" : "alex@example.invalid"
  }],
  "qualification" : [{
    "code" : {
      "coding" : [{
        "system" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/CodeSystem/participation-role",
        "code" : "track-lead"
      }]
    }
  }]
}

```
