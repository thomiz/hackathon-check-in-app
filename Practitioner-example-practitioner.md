# example-practitioner - hackathon-check-in-app v0.6.0

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-practitioner**

## Example Practitioner: example-practitioner

Profile: [Checked-in Hackathon participant](StructureDefinition-checked-in-participant.md)

Alex Example (https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026#synthetic-001)

-------

| | |
| :--- | :--- |
| Contact Detail | [alex@example.invalid](mailto:alex@example.invalid) |
| Qualification: | Track lead |
| [Participant affiliation](StructureDefinition-affiliation.md) | Example organization |
| [Confirmed or expected primary track](StructureDefinition-primary-track.md) | [2026 Hackathon tracks: smart](CodeSystem-track.md#track-smart)(SMART on FHIR) |



## Resource Content

```json
{
  "resourceType" : "Practitioner",
  "id" : "example-practitioner",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/checked-in-participant"]
  },
  "extension" : [{
    "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/affiliation",
    "valueString" : "Example organization"
  },
  {
    "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/primary-track",
    "valueCoding" : {
      "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/track",
      "code" : "smart"
    }
  }],
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026",
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
        "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role",
        "code" : "track-lead"
      }]
    }
  }]
}

```
