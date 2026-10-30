# Participant affiliation - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **Participant affiliation**

## Extension: Participant affiliation 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/affiliation | *Version*:0.6.1 |
| Draft as of 2026-10-30 | *Computable Name*:Affiliation |

**Context of Use**

**Usage info**

**Usages:**

* Use this Extension: [Checked-in Hackathon participant](StructureDefinition-checked-in-participant.md) and [Expected Hackathon participant](StructureDefinition-expected-participant.md)
* Examples for this Extension: [Person/example-attendee-101](Person-example-attendee-101.md), [Person/example-attendee-care-plans](Person-example-attendee-care-plans.md), [Person/example-attendee-ehds](Person-example-attendee-ehds.md), [Person/example-attendee-ihe](Person-example-attendee-ihe.md)... Show 5 more, [Person/example-attendee-medication](Person-example-attendee-medication.md), [Person/example-attendee-undecided](Person-example-attendee-undecided.md), [Person/example-person](Person-example-person.md), [Practitioner/example-attendee-practitioner](Practitioner-example-attendee-practitioner.md) and [Practitioner/example-practitioner](Practitioner-example-practitioner.md)

You can also check for [usages in the FHIR IG Statistics](https://packages2.fhir.org/xig/resource/hackathon-check-in-app|current/StructureDefinition/StructureDefinition-affiliation.json)

### Formal Views of Extension Content

 [Description of Profiles, Differentials, Snapshots, and how the XML and JSON presentations work](http://build.fhir.org/ig/FHIR/ig-guidance/readingIgs.html#structure-definitions). 

 

Other representations of profile: [CSV](StructureDefinition-affiliation.csv), [Excel](StructureDefinition-affiliation.xlsx), [Schematron](StructureDefinition-affiliation.sch) 

#### Constraints



## Resource Content

```json
{
  "resourceType" : "StructureDefinition",
  "id" : "affiliation",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/affiliation",
  "version" : "0.6.1",
  "name" : "Affiliation",
  "title" : "Participant affiliation",
  "status" : "draft",
  "date" : "2026-10-30T09:20:03+00:00",
  "publisher" : "HL7 Norway",
  "contact" : [{
    "name" : "HL7 Norway",
    "telecom" : [{
      "system" : "url",
      "value" : "https://www.hl7.no"
    }]
  }],
  "jurisdiction" : [{
    "coding" : [{
      "system" : "urn:iso:std:iso:3166",
      "code" : "NO"
    }]
  }],
  "fhirVersion" : "4.0.1",
  "mapping" : [{
    "identity" : "rim",
    "uri" : "http://hl7.org/v3",
    "name" : "RIM Mapping"
  }],
  "kind" : "complex-type",
  "abstract" : false,
  "context" : [{
    "type" : "element",
    "expression" : "Person"
  },
  {
    "type" : "element",
    "expression" : "Practitioner"
  }],
  "type" : "Extension",
  "baseDefinition" : "http://hl7.org/fhir/StructureDefinition/Extension",
  "derivation" : "constraint",
  "differential" : {
    "element" : [{
      "id" : "Extension",
      "path" : "Extension",
      "short" : "Participant affiliation"
    },
    {
      "id" : "Extension.extension",
      "path" : "Extension.extension",
      "max" : "0"
    },
    {
      "id" : "Extension.url",
      "path" : "Extension.url",
      "fixedUri" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/affiliation"
    },
    {
      "id" : "Extension.value[x]",
      "path" : "Extension.value[x]",
      "min" : 1,
      "type" : [{
        "code" : "string"
      }]
    }]
  }
}

```
