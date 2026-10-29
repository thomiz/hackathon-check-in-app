# Checked-in Hackathon participant - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **Checked-in Hackathon participant**

## Resource Profile: Checked-in Hackathon participant 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/checked-in-participant | *Version*:0.6.1 |
| Draft as of 2026-10-29 | *Computable Name*:CheckedInParticipant |

 
For attendees and organizers checked in to the event. Event-specific demonstration model. Does not imply healthcare employment or a professional credential. 

**Usages:**

* Refer to this Profile: [Hackathon check-in list](StructureDefinition-checkin-list.md) and [Expected Hackathon participant](StructureDefinition-expected-participant.md)
* Examples for this Profile: [Practitioner/example-attendee-practitioner](Practitioner-example-attendee-practitioner.md) and [Practitioner/example-practitioner](Practitioner-example-practitioner.md)

You can also check for [usages in the FHIR IG Statistics](https://packages2.fhir.org/xig/resource/hackathon-check-in-app|current/StructureDefinition/StructureDefinition-checked-in-participant.json)

### Formal Views of Profile Content

 [Description of Profiles, Differentials, Snapshots and how the different presentations work](http://build.fhir.org/ig/FHIR/ig-guidance/readingIgs.html#structure-definitions). 

 

Other representations of profile: [CSV](StructureDefinition-checked-in-participant.csv), [Excel](StructureDefinition-checked-in-participant.xlsx), [Schematron](StructureDefinition-checked-in-participant.sch) 



## Resource Content

```json
{
  "resourceType" : "StructureDefinition",
  "id" : "checked-in-participant",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/checked-in-participant",
  "version" : "0.6.1",
  "name" : "CheckedInParticipant",
  "title" : "Checked-in Hackathon participant",
  "status" : "draft",
  "date" : "2026-10-29T15:50:41+00:00",
  "publisher" : "HL7 Norway",
  "contact" : [{
    "name" : "HL7 Norway",
    "telecom" : [{
      "system" : "url",
      "value" : "https://www.hl7.no"
    }]
  }],
  "description" : "For attendees and organizers checked in to the event. Event-specific demonstration model. Does not imply healthcare employment or a professional credential.",
  "jurisdiction" : [{
    "coding" : [{
      "system" : "urn:iso:std:iso:3166",
      "code" : "NO"
    }]
  }],
  "fhirVersion" : "4.0.1",
  "mapping" : [{
    "identity" : "v2",
    "uri" : "http://hl7.org/v2",
    "name" : "HL7 v2 Mapping"
  },
  {
    "identity" : "rim",
    "uri" : "http://hl7.org/v3",
    "name" : "RIM Mapping"
  },
  {
    "identity" : "servd",
    "uri" : "http://www.omg.org/spec/ServD/1.0/",
    "name" : "ServD"
  },
  {
    "identity" : "w5",
    "uri" : "http://hl7.org/fhir/fivews",
    "name" : "FiveWs Pattern Mapping"
  }],
  "kind" : "resource",
  "abstract" : false,
  "type" : "Practitioner",
  "baseDefinition" : "http://hl7.org/fhir/StructureDefinition/Practitioner",
  "derivation" : "constraint",
  "differential" : {
    "element" : [{
      "id" : "Practitioner",
      "path" : "Practitioner"
    },
    {
      "id" : "Practitioner.extension",
      "path" : "Practitioner.extension",
      "slicing" : {
        "discriminator" : [{
          "type" : "value",
          "path" : "url"
        }],
        "ordered" : false,
        "rules" : "open"
      },
      "min" : 1
    },
    {
      "id" : "Practitioner.extension:affiliation",
      "path" : "Practitioner.extension",
      "sliceName" : "affiliation",
      "min" : 1,
      "max" : "1",
      "type" : [{
        "code" : "Extension",
        "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/affiliation"]
      }]
    },
    {
      "id" : "Practitioner.extension:primaryTrack",
      "path" : "Practitioner.extension",
      "sliceName" : "primaryTrack",
      "min" : 0,
      "max" : "1",
      "type" : [{
        "code" : "Extension",
        "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/primary-track"]
      }]
    },
    {
      "id" : "Practitioner.identifier",
      "path" : "Practitioner.identifier",
      "slicing" : {
        "discriminator" : [{
          "type" : "value",
          "path" : "system"
        }],
        "rules" : "open"
      },
      "min" : 1
    },
    {
      "id" : "Practitioner.identifier:eventId",
      "path" : "Practitioner.identifier",
      "sliceName" : "eventId",
      "min" : 1,
      "max" : "1"
    },
    {
      "id" : "Practitioner.identifier:eventId.system",
      "path" : "Practitioner.identifier.system",
      "min" : 1,
      "fixedUri" : "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026"
    },
    {
      "id" : "Practitioner.identifier:eventId.value",
      "path" : "Practitioner.identifier.value",
      "min" : 1
    },
    {
      "id" : "Practitioner.name",
      "path" : "Practitioner.name",
      "min" : 1
    },
    {
      "id" : "Practitioner.name.text",
      "path" : "Practitioner.name.text",
      "min" : 1
    },
    {
      "id" : "Practitioner.telecom",
      "path" : "Practitioner.telecom",
      "slicing" : {
        "discriminator" : [{
          "type" : "value",
          "path" : "system"
        }],
        "rules" : "open"
      },
      "min" : 1
    },
    {
      "id" : "Practitioner.telecom:email",
      "path" : "Practitioner.telecom",
      "sliceName" : "email",
      "min" : 1,
      "max" : "1"
    },
    {
      "id" : "Practitioner.telecom:email.system",
      "path" : "Practitioner.telecom.system",
      "min" : 1,
      "fixedCode" : "email"
    },
    {
      "id" : "Practitioner.telecom:email.value",
      "path" : "Practitioner.telecom.value",
      "min" : 1
    },
    {
      "id" : "Practitioner.qualification",
      "path" : "Practitioner.qualification",
      "slicing" : {
        "discriminator" : [{
          "type" : "value",
          "path" : "code.coding.system"
        }],
        "rules" : "open"
      },
      "min" : 1
    },
    {
      "id" : "Practitioner.qualification:eventRole",
      "path" : "Practitioner.qualification",
      "sliceName" : "eventRole",
      "min" : 1,
      "max" : "1"
    },
    {
      "id" : "Practitioner.qualification:eventRole.code",
      "path" : "Practitioner.qualification.code",
      "binding" : {
        "strength" : "required",
        "valueSet" : "https://hl7.no/fhir/ig/hackathon-check-in-app/ValueSet/participation-roles"
      }
    },
    {
      "id" : "Practitioner.qualification:eventRole.code.coding",
      "path" : "Practitioner.qualification.code.coding",
      "min" : 1,
      "max" : "1"
    },
    {
      "id" : "Practitioner.qualification:eventRole.code.coding.system",
      "path" : "Practitioner.qualification.code.coding.system",
      "min" : 1,
      "fixedUri" : "https://hl7.no/fhir/ig/hackathon-check-in-app/CodeSystem/participation-role"
    },
    {
      "id" : "Practitioner.qualification:eventRole.code.coding.code",
      "path" : "Practitioner.qualification.code.coding.code",
      "min" : 1
    }]
  }
}

```
