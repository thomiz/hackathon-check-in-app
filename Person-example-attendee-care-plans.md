# example-attendee-care-plans - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-attendee-care-plans**

## Example Person: example-attendee-care-plans

Profile: [Expected Hackathon participant](StructureDefinition-expected-participant.md)

**Participant affiliation**: Synthetic municipality

**Confirmed or expected primary track**: [2026 Hackathon tracks: care-plans](CodeSystem-track.md#track-care-plans) (Modeling Patient care plans as FHIR)

**identifier**: `https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026`/synthetic-101

**name**: Robin Sample

**telecom**: [robin@example.invalid](mailto:robin@example.invalid)



## Resource Content

```json
{
  "resourceType" : "Person",
  "id" : "example-attendee-care-plans",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"]
  },
  "extension" : [{
    "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/affiliation",
    "valueString" : "Synthetic municipality"
  },
  {
    "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/primary-track",
    "valueCoding" : {
      "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/track",
      "code" : "care-plans"
    }
  }],
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026",
    "value" : "synthetic-101"
  }],
  "name" : [{
    "text" : "Robin Sample"
  }],
  "telecom" : [{
    "system" : "email",
    "value" : "robin@example.invalid"
  }]
}

```
