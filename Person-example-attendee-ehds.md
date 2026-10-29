# example-attendee-ehds - hackathon-check-in-app v0.6.0

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-attendee-ehds**

## Example Person: example-attendee-ehds

Profile: [Expected Hackathon participant](StructureDefinition-expected-participant.md)

**Participant affiliation**: Synthetic interoperability group

**Confirmed or expected primary track**: [2026 Hackathon tracks: ehds-summary](CodeSystem-track.md#track-ehds-summary) (EHDS patient summary)

**identifier**: `https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026`/synthetic-104

**name**: Casey Example

**telecom**: [casey@example.invalid](mailto:casey@example.invalid)



## Resource Content

```json
{
  "resourceType" : "Person",
  "id" : "example-attendee-ehds",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"]
  },
  "extension" : [{
    "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/affiliation",
    "valueString" : "Synthetic interoperability group"
  },
  {
    "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/primary-track",
    "valueCoding" : {
      "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/track",
      "code" : "ehds-summary"
    }
  }],
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026",
    "value" : "synthetic-104"
  }],
  "name" : [{
    "text" : "Casey Example"
  }],
  "telecom" : [{
    "system" : "email",
    "value" : "casey@example.invalid"
  }]
}

```
