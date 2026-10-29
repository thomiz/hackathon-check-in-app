# ManualRegistration - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **ManualRegistration**

## Extension: ManualRegistration 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/manual-registration | *Version*:0.6.1 |
| Draft as of 2026-10-29 | *Computable Name*:ManualRegistration |

**Context of Use**

**Usage info**

**Usages:**

* Use this Extension: [Hackathon check-in list](StructureDefinition-checkin-list.md)

You can also check for [usages in the FHIR IG Statistics](https://packages2.fhir.org/xig/resource/hackathon-check-in-app|current/StructureDefinition/StructureDefinition-manual-registration.json)

### Formal Views of Extension Content

 [Description of Profiles, Differentials, Snapshots, and how the XML and JSON presentations work](http://build.fhir.org/ig/FHIR/ig-guidance/readingIgs.html#structure-definitions). 

 

Other representations of profile: [CSV](StructureDefinition-manual-registration.csv), [Excel](StructureDefinition-manual-registration.xlsx), [Schematron](StructureDefinition-manual-registration.sch) 

#### Constraints



## Resource Content

```json
{
  "resourceType" : "StructureDefinition",
  "id" : "manual-registration",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/manual-registration",
  "version" : "0.6.1",
  "name" : "ManualRegistration",
  "status" : "draft",
  "date" : "2026-10-29T13:05:39+00:00",
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
    "expression" : "List.entry"
  }],
  "type" : "Extension",
  "baseDefinition" : "http://hl7.org/fhir/StructureDefinition/Extension",
  "derivation" : "constraint",
  "differential" : {
    "element" : [{
      "id" : "Extension.extension",
      "path" : "Extension.extension",
      "max" : "0"
    },
    {
      "id" : "Extension.url",
      "path" : "Extension.url",
      "fixedUri" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/manual-registration"
    },
    {
      "id" : "Extension.value[x]",
      "path" : "Extension.value[x]",
      "min" : 1,
      "type" : [{
        "code" : "boolean"
      }]
    }]
  }
}

```
