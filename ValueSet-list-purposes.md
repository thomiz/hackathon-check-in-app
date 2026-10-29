# ListPurposes - hackathon-check-in-app v0.6.0

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **ListPurposes**

## ValueSet: ListPurposes 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/ValueSet/list-purposes | *Version*:0.6.0 |
| Draft as of 2026-10-29 | *Computable Name*:ListPurposes |

 **References** 

* [Hackathon event list](StructureDefinition-event-list.md)

### Logical Definition (CLD)

 

### Expansion

-------

 Explanation of the columns that may appear on this page: 

| | |
| :--- | :--- |
| Level | A few code lists that FHIR defines are hierarchical - each code is assigned a level. In this scheme, some codes are under other codes, and imply that the code they are under also applies |
| System | The source of the definition of the code (when the value set draws in codes defined elsewhere) |
| Code | The code (used as the code in the resource instance) |
| Display | The display (used in the*display*element of a[Coding](http://hl7.org/fhir/R4/datatypes.html#Coding)). If there is no display, implementers should not simply display the code, but map the concept into their application |
| Definition | An explanation of the meaning of the concept |
| Comments | Additional notes about how to use the code |



## Resource Content

```json
{
  "resourceType" : "ValueSet",
  "id" : "list-purposes",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/ValueSet/list-purposes",
  "version" : "0.6.0",
  "name" : "ListPurposes",
  "status" : "draft",
  "date" : "2026-10-29T07:06:30+00:00",
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
  "compose" : {
    "include" : [{
      "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/list-purpose"
    }]
  }
}

```
