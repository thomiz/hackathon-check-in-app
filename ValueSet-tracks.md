# Tracks - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **Tracks**

## ValueSet: Tracks 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/ValueSet/tracks | *Version*:0.6.1 |
| Draft as of 2026-10-29 | *Computable Name*:Tracks |

 **References** 

* [Confirmed or expected primary track](StructureDefinition-primary-track.md)

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
  "id" : "tracks",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/ValueSet/tracks",
  "version" : "0.6.1",
  "name" : "Tracks",
  "status" : "draft",
  "date" : "2026-10-29T09:23:29+00:00",
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
      "system" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/track"
    }]
  }
}

```
