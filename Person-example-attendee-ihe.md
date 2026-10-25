# example-attendee-ihe - hackathon-attendance-registration-app v0.1.0

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-attendee-ihe**

## Example Person: example-attendee-ihe

Profile: [Expected Hackathon participant](StructureDefinition-expected-participant.md)

**Participant affiliation**: Synthetic integration team

**Confirmed or expected primary track**: [2026 Hackathon tracks: ihe-mhd](CodeSystem-track.md#track-ihe-mhd) (Document sharing for IHE MHD)

**identifier**: `https://hl7.no/fhir/ig/hackathon-attendance-registration-app/identifier/participant-2026`/synthetic-103

**name**: Taylor Test

**telecom**: [taylor@example.invalid](mailto:taylor@example.invalid)



## Resource Content

```json
{
  "resourceType" : "Person",
  "id" : "example-attendee-ihe",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/expected-participant"]
  },
  "extension" : [{
    "url" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/affiliation",
    "valueString" : "Synthetic integration team"
  },
  {
    "url" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/StructureDefinition/primary-track",
    "valueCoding" : {
      "system" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/CodeSystem/track",
      "code" : "ihe-mhd"
    }
  }],
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-attendance-registration-app/identifier/participant-2026",
    "value" : "synthetic-103"
  }],
  "name" : [{
    "text" : "Taylor Test"
  }],
  "telecom" : [{
    "system" : "email",
    "value" : "taylor@example.invalid"
  }]
}

```
