# Expected Hackathon participant - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* [**Artifacts Summary**](artifacts.md)
* **Expected Hackathon participant**

## Resource Profile: Expected Hackathon participant 

| | |
| :--- | :--- |
| *Official URL*:https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant | *Version*:0.6.1 |
| Draft as of 2026-10-29 | *Computable Name*:ExpectedParticipant |

 
For attendees and organizers registered for the event. 

**Usages:**

* Refer to this Profile: [Hackathon participant roster](StructureDefinition-roster-list.md)
* Examples for this Profile: [Person/example-attendee-101](Person-example-attendee-101.md), [Person/example-attendee-care-plans](Person-example-attendee-care-plans.md), [Person/example-attendee-ehds](Person-example-attendee-ehds.md), [Person/example-attendee-ihe](Person-example-attendee-ihe.md)... Show 3 more, [Person/example-attendee-medication](Person-example-attendee-medication.md), [Person/example-attendee-undecided](Person-example-attendee-undecided.md) and [Person/example-person](Person-example-person.md)

You can also check for [usages in the FHIR IG Statistics](https://packages2.fhir.org/xig/resource/hackathon-check-in-app|current/StructureDefinition/StructureDefinition-expected-participant.json)

### Formal Views of Profile Content

 [Description of Profiles, Differentials, Snapshots and how the different presentations work](http://build.fhir.org/ig/FHIR/ig-guidance/readingIgs.html#structure-definitions). 

 

Other representations of profile: [CSV](StructureDefinition-expected-participant.csv), [Excel](StructureDefinition-expected-participant.xlsx), [Schematron](StructureDefinition-expected-participant.sch) 



## Resource Content

```json
{
  "resourceType" : "StructureDefinition",
  "id" : "expected-participant",
  "url" : "https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/expected-participant",
  "version" : "0.6.1",
  "name" : "ExpectedParticipant",
  "title" : "Expected Hackathon participant",
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
  "description" : "For attendees and organizers registered for the event.",
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
  },
  {
    "identity" : "w5",
    "uri" : "http://hl7.org/fhir/fivews",
    "name" : "FiveWs Pattern Mapping"
  },
  {
    "identity" : "v2",
    "uri" : "http://hl7.org/v2",
    "name" : "HL7 v2 Mapping"
  }],
  "kind" : "resource",
  "abstract" : false,
  "type" : "Person",
  "baseDefinition" : "http://hl7.org/fhir/StructureDefinition/Person",
  "derivation" : "constraint",
  "differential" : {
    "element" : [{
      "id" : "Person",
      "path" : "Person"
    },
    {
      "id" : "Person.extension",
      "path" : "Person.extension",
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
      "id" : "Person.extension:affiliation",
      "path" : "Person.extension",
      "sliceName" : "affiliation",
      "min" : 1,
      "max" : "1",
      "type" : [{
        "code" : "Extension",
        "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/affiliation"]
      }]
    },
    {
      "id" : "Person.extension:primaryTrack",
      "path" : "Person.extension",
      "sliceName" : "primaryTrack",
      "min" : 0,
      "max" : "1",
      "type" : [{
        "code" : "Extension",
        "profile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/primary-track"]
      }]
    },
    {
      "id" : "Person.identifier",
      "path" : "Person.identifier",
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
      "id" : "Person.identifier:eventId",
      "path" : "Person.identifier",
      "sliceName" : "eventId",
      "min" : 1,
      "max" : "1"
    },
    {
      "id" : "Person.identifier:eventId.system",
      "path" : "Person.identifier.system",
      "min" : 1,
      "fixedUri" : "https://hl7.no/fhir/ig/hackathon-check-in-app/identifier/participant-2026"
    },
    {
      "id" : "Person.identifier:eventId.value",
      "path" : "Person.identifier.value",
      "min" : 1
    },
    {
      "id" : "Person.name",
      "path" : "Person.name",
      "min" : 1
    },
    {
      "id" : "Person.name.text",
      "path" : "Person.name.text",
      "min" : 1
    },
    {
      "id" : "Person.telecom",
      "path" : "Person.telecom",
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
      "id" : "Person.telecom:email",
      "path" : "Person.telecom",
      "sliceName" : "email",
      "min" : 1,
      "max" : "1"
    },
    {
      "id" : "Person.telecom:email.system",
      "path" : "Person.telecom.system",
      "min" : 1,
      "fixedCode" : "email"
    },
    {
      "id" : "Person.telecom:email.value",
      "path" : "Person.telecom.value",
      "min" : 1
    },
    {
      "id" : "Person.link.target",
      "path" : "Person.link.target",
      "type" : [{
        "code" : "Reference",
        "targetProfile" : ["https://hl7.no/fhir/ig/hackathon-check-in-app/StructureDefinition/checked-in-participant"]
      }]
    }]
  }
}

```
