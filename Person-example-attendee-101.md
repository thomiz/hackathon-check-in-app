# example-attendee-101 - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-attendee-101**

## Example Person: example-attendee-101

Profile: [Expected Hackathon participant](StructureDefinition-expected-participant.md)

**Participant affiliation**: Synthetic university

**Confirmed or expected primary track**: [2026 Hackathon tracks: fhir-101](CodeSystem-track.md#track-fhir-101) (FHIR 101: Introduction to HL7 FHIR with practical assignments)

**identifier**: `https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026`/synthetic-105

**name**: Jamie Learner

**telecom**: [jamie@example.invalid](mailto:jamie@example.invalid)

### Links

| | |
| :--- | :--- |
| - | **Target** |
| * | [Jamie Learner (https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026#synthetic-105)](Practitioner-example-attendee-practitioner.md) |



## Resource Content

```json
{
  "resourceType" : "Person",
  "id" : "example-attendee-101",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"]
  },
  "extension" : [{
    "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/affiliation",
    "valueString" : "Synthetic university"
  },
  {
    "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/primary-track",
    "valueCoding" : {
      "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/track",
      "code" : "fhir-101"
    }
  }],
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026",
    "value" : "synthetic-105"
  }],
  "name" : [{
    "text" : "Jamie Learner"
  }],
  "telecom" : [{
    "system" : "email",
    "value" : "jamie@example.invalid"
  }],
  "link" : [{
    "target" : {
      "reference" : "Practitioner/example-attendee-practitioner"
    }
  }]
}

```
