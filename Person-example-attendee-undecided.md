# example-attendee-undecided - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **example-attendee-undecided**

## Example Person: example-attendee-undecided

Profile: [Expected Hackathon participant](StructureDefinition-expected-participant.md)

**Participant affiliation**: Synthetic independent developer

**identifier**: `https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026`/synthetic-106

**name**: Jordan Visitor

**telecom**: [jordan@example.invalid](mailto:jordan@example.invalid)



## Resource Content

```json
{
  "resourceType" : "Person",
  "id" : "example-attendee-undecided",
  "meta" : {
    "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant"]
  },
  "extension" : [{
    "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/affiliation",
    "valueString" : "Synthetic independent developer"
  }],
  "identifier" : [{
    "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026",
    "value" : "synthetic-106"
  }],
  "name" : [{
    "text" : "Jordan Visitor"
  }],
  "telecom" : [{
    "system" : "email",
    "value" : "jordan@example.invalid"
  }]
}

```
