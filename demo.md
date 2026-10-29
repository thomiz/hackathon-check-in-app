# Demo application - hackathon-check-in-app v0.6.1

* [**Table of Contents**](toc.md)
* **Demo application**

## Demo application

# Demo application

A browser-only demo of the hackathon check-in app is published with this Implementation Guide. It uses the synthetic examples in this guide as its data, so you can see how the FHIR resources support attendee check-in and the organizer desk. You do not need a FHIR server or an account.

* [Open the attendee check-in screen](demo/index.md)
* [Open the organizer screen](demo/index.md#staff)

The banner at the top of the demo switches between the two screens.

## How the demo works

The production app keeps the roster and check-ins on a FHIR R4 server. The demo runs the same registration logic directly in the browser instead. It uses an in-memory store loaded with the example resources of this guide as they were built from the FHIR Shorthand sources:

| | |
| :--- | :--- |
| [example-attendee-list](List-example-attendee-list.md) | Attendee roster (`RosterList`) |
| [example-roster](List-example-roster.md) | Staff and track lead roster (`RosterList`) |
| [example-checkins](List-example-checkins.md) | Check-in list (`CheckinList`) |
| `ExpectedParticipant`examples (`Person`) | Registered people you can search for |
| `CheckedInParticipant`examples (`Practitioner`) | People who have already checked in |

The example attendee roster has its own identifier (`synthetic-attendee-roster`). The demo treats it as the event's attendee roster (`hackathon-2026-roster`) in memory. Jamie Learner's `ExpectedParticipant` example links to a `CheckedInParticipant`, so the demo also adds that participant to the check-in list. The published examples are not changed.

Everything you do in the demo, such as checking in, registering someone manually or correcting details, changes only the data in that browser tab. Nothing is sent to a server. Reloading the page, or choosing **Reset demo**, restores the original examples.

## Trying it out

### Attendee check-in

1. Type at least five letters of a name from the attendee roster, for example**Robin Sample**,**Morgan Demo**,**Taylor Test**,**Casey Example**or**Jordan Visitor**.
1. Select the matching registration, review the details and optionally change the primary track.
1. Confirm attendance. The app creates a`CheckedInParticipant`, links it from the`ExpectedParticipant`and adds it to the check-in list. It then shows the attendance receipt with a QR code.

**Alex Example** (a track lead on the staff roster) and **Jamie Learner** are already checked in, so the app shows their existing receipts instead of creating duplicates.

### Organizer screen

Sign in with any username and password. The organizer screen shows:

* attendance totals and track counts calculated from the lists;
* arrivals, with corrections and receipt lookup;
* search across both rosters and manual registration of walk-ins.

You can export check-ins as CSV. Roster CSV import is not available in the demo.

## Limitations

The demo is for illustration only. It has no authentication, persistence or audit storage, and it must not be used with real participant data. Only the synthetic examples published in this guide are included.

