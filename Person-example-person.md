# example-person - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-person**

## Example Person: example-person

Profile: [Expected Hackathon participant](StructureDefinition-expected-participant.md)

**Participant affiliation**: Example organization

**Confirmed or expected primary track**: [2026 Hackathon tracks: smart](CodeSystem-track.md#track-smart) (SMART on FHIR)

**identifier**: `https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026`/synthetic-001

**name**: Alex Example

**telecom**: [alex@example.invalid](mailto:alex@example.invalid)

### Links

| | |
| :--- | :--- |
| - | **Target** |
| * | [Alex Example (https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026#synthetic-001)](Practitioner-example-practitioner.md) |



## Resource Content

```json
{
  "resourceType" : "Person",
  "id" : "example-person",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"]
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
  "link" : [{
    "target" : {
      "reference" : "Practitioner/example-practitioner"
    }
  }]
}

```
