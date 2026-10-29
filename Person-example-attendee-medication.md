# example-attendee-medication - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-attendee-medication**

## Example Person: example-attendee-medication

Profile: [Expected Hackathon participant](StructureDefinition-expected-participant.md)

**Participant affiliation**: Synthetic medicines agency

**Confirmed or expected primary track**: [2026 Hackathon tracks: medication-definition](CodeSystem-track.md#track-medication-definition) (Medication Definition on FHIR - Exploration of FHIR services from EMA and NoMA)

**identifier**: `https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026`/synthetic-102

**name**: Morgan Demo

**telecom**: [morgan@example.invalid](mailto:morgan@example.invalid)



## Resource Content

```json
{
  "resourceType" : "Person",
  "id" : "example-attendee-medication",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"]
  },
  "extension" : [{
    "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/affiliation",
    "valueString" : "Synthetic medicines agency"
  },
  {
    "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/primary-track",
    "valueCoding" : {
      "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/track",
      "code" : "medication-definition"
    }
  }],
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026",
    "value" : "synthetic-102"
  }],
  "name" : [{
    "text" : "Morgan Demo"
  }],
  "telecom" : [{
    "system" : "email",
    "value" : "morgan@example.invalid"
  }]
}

```
