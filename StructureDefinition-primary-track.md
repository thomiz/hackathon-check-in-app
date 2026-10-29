# Confirmed or expected primary track - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **Confirmed or expected primary track**

## Extension: Confirmed or expected primary track 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/primary-track | *Version*:0.6.1 |
| Draft as of 2026-10-29 | *Computable Name*:PrimaryTrack |

**Context of Use**

**Usage info**

**Usages:**

* Use this Extension: [Checked-in Hackathon participant](StructureDefinition-checked-in-participant.md) and [Expected Hackathon participant](StructureDefinition-expected-participant.md)
* Examples for this Extension: [Person/example-attendee-101](Person-example-attendee-101.md), [Person/example-attendee-care-plans](Person-example-attendee-care-plans.md), [Person/example-attendee-ehds](Person-example-attendee-ehds.md), [Person/example-attendee-ihe](Person-example-attendee-ihe.md)... Show 4 more, [Person/example-attendee-medication](Person-example-attendee-medication.md), [Person/example-person](Person-example-person.md), [Practitioner/example-attendee-practitioner](Practitioner-example-attendee-practitioner.md) and [Practitioner/example-practitioner](Practitioner-example-practitioner.md)

You can also check for [usages in the FHIR IG Statistics](https://packages2.fhir.org/xig/resource/hackathon-check-in-app|current/StructureDefinition/StructureDefinition-primary-track.json)

### Formal Views of Extension Content

 [Description of Profiles, Differentials, Snapshots, and how the XML and JSON presentations work](http://build.fhir.org/ig/FHIR/ig-guidance/readingIgs.html#structure-definitions). 

 

Other representations of profile: [CSV](StructureDefinition-primary-track.csv), [Excel](StructureDefinition-primary-track.xlsx), [Schematron](StructureDefinition-primary-track.sch) 

#### Terminology Bindings

#### Constraints



## Resource Content

```json
{
  "resourceType" : "StructureDefinition",
  "id" : "primary-track",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/primary-track",
  "version" : "0.6.1",
  "name" : "PrimaryTrack",
  "title" : "Confirmed or expected primary track",
  "status" : "draft",
  "date" : "2026-10-29T16:44:10+00:00",
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
      "short" : "Confirmed or expected primary track"
    },
    {
      "id" : "Extension.extension",
      "path" : "Extension.extension",
      "max" : "0"
    },
    {
      "id" : "Extension.url",
      "path" : "Extension.url",
      "fixedUri" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/primary-track"
    },
    {
      "id" : "Extension.value[x]",
      "path" : "Extension.value[x]",
      "min" : 1,
      "type" : [{
        "code" : "Coding"
      }],
      "binding" : {
        "strength" : "required",
        "valueSet" : "https://hl7.no/fhir/ig/hackathon-check-in-app/ValueSet/tracks"
      }
    }]
  }
}

```
