# Implementation Plan: Worktime of Another User

**Branch**: `002-other-user-worktime` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-other-user-worktime/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

The worktime panel of [001](../001-worktime-panel/plan.md) shows the signed-in user's logged
time. This feature lets the user show a colleague's time instead: the settings get a choice
"Obecny użytkownik" / "Inny użytkownik" with a name field; "Zapisz" first checks the name in
Jira; the header names the person above the title, and the launcher carries the name while
it is not the user's own. The choice lasts until the close button or a page load; one last
person is remembered to fill the field in advance.

Technical approach (from [research.md](research.md)): the person in effect is plain state of
the running content script and is passed to the existing worklog loader as the author. Names
are looked up through two documented `GET` requests of the Jira REST API on "Zapisz" only
(a search by name, and a read by account ID for the remembered person). The remembered person is one
additive field in the settings already stored in the browser. No new dependency, no new
permission, no new host.

## Technical Context

**Language/Version**: TypeScript in `strict` mode; SCSS (Dart Sass). No hand-written
JavaScript or CSS sources (constitution).

**Primary Dependencies**: runtime: none, and none added. Development only, unchanged:
`vite-plus`, `sass`, `typescript`, `happy-dom`, `@playwright/test`, `@types/node`, pinned in
`package.json` and the lock file.

**Toolchain (mandatory)**: Vite+, the `vp` command, configured in `vite.config.ts`.
Playwright stays for browser tests.

**Storage**: the existing `localStorage` key `worktime.settings.v1` of the Jira site gains
one field, `lastPerson` ([contracts/settings-storage.md](contracts/settings-storage.md)).
The person in effect is held in memory only. No Jira data is cached.

**Testing**: `vp test` (Vitest with `happy-dom`) for domain, Jira access, and UI logic;
Playwright (Chromium) on the stand-in Jira page at 320 px and 1280 px in both themes, and
with the real built extension against a faked Jira Cloud address. No test needs a live Jira.

**Target Platform**: unchanged: browser extension, Manifest V3, one content script on
`https://*.atlassian.net/*` (not `/wiki/*`); Chrome and Edge; Jira Cloud only. The manifest
does not change.

**Project Type**: single front-end project packaged as a browser extension.

**Performance Goals**: a colleague's data on screen within 5 s of "Zapisz" (SC-001); the
"not found" alert within 3 s (SC-004); no extra request
on page load.

**Constraints**: `GET` requests to the page's own origin only; at most 5 concurrent Jira
requests (existing request pool); one user search per check, only on "Zapisz", abandoned after 15 s, because Jira's user search
has one rate limit for the whole site; the
shipped script at most 100 kB gzipped (Principle I); layout from 320 px to 1920 px with
44 px touch targets (Principle III); nothing on the Jira page outside the add-on's element
is changed or blocked.

**Scale/Scope**: one selected person at a time; one user search per check. Changed: header, launcher, settings pop-over, controller, app,
loader, settings storage. New: person rules, people look-up, alert window. 49 functional
requirements.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v3.0.0, before research and again after the design.

| Principle | How this plan satisfies it | Result |
|-----------|----------------------------|--------|
| I. Minimal Footprint | Measured after implementation (2026-11-13): the content script is 24.0 kB gzipped, 3.9 kB more than the 20.1 kB before this feature, of a budget of 100 kB. No library and no asset added: two small modules, one small UI component, about 12 short Polish texts, two tokens. No pictures are downloaded or shipped. `vp run build` still fails above 100 kB. | Pass |
| II. Minimal Dependencies | No dependency added. Name matching uses string methods and `Intl.Collator`; the alert uses the `inert` attribute of the platform instead of a focus-trap library. | Pass |
| III. Responsive on Mobile and Desktop | The same pop-over at every width; the options, the list entries, and "OK" are 44 px targets on touch; the list scrolls inside the pop-over; the name is cut with an ellipsis in the header and on the launcher. Browser tests at 320 px and 1280 px. | Pass |
| IV. Modern, Consistent User Interface | Two new tokens (`--wt-person`, `--wt-scrim`) defined for both themes; no one-off values in components. The name colour reaches 4.5:1, asserted by a test. The check has a busy state, an empty-field message, a failed-check message, and the alert; nothing fails silently. All new controls work by keyboard with a visible focus. | Pass |
| V. Tested Behavior | Every new rule has unit tests; the settings flow, header, launcher, and the life of the choice have UI tests; the stand-in page gains a user directory for browser tests. Jira is faked in all of them. | Pass |
| VI. Install-Only Setup | The feature is optional and off by default: without touching it the add-on behaves as before. No setup, no permission, no migration: the stored format stays `v1`. | Pass |

Technical Constraints: reads Jira only through three more documented REST operations
(pass); `GET` only, asserted by the extension test (pass); only the Jira site is contacted,
which is why no pictures are loaded (pass); one isolated element, and the
alert is drawn inside it, never as a browser dialog (pass); no browser permission and no new
address (pass); settings in the browser, one set per browser, defaults without stored
settings (pass); no data sent to a third party (pass); TypeScript and SCSS only, Vite+ only
(pass).

**Gate result**: Pass, before research and after design. No violations to justify.

## Open points

| # | Point | Planned | Reason |
|---|-------|---------|--------|
| D1 | Pictures in the list of matching people. Jira's picture addresses are on other hosts (an Atlassian avatar service, and Gravatar for people without an uploaded picture). | **Decided by the requester on 2026-11-13: no pictures.** The list shows the name and the e-mail address when Jira returns it. Spec FR-030 amended. | The constitution allows contact with the open Jira site only and no data to third parties ([research.md](research.md) R8). |
| D2 | Deactivated accounts. Jira's name search returns active users only. | **Decided by the requester on 2026-11-13: not supported.** A deactivated person is not found; a remembered person who was deactivated gives the "not found" alert. Spec Edge Cases and FR-036 amended. | Finding them needs a read of the whole user directory on every name that is not found ([research.md](research.md) R2). |
| D3 | Jira's name search matches the *beginning* of a name, not any part of it. | The list holds what Jira's search returns, narrowed in the client to names that contain the text. A text from the middle of a word finds nobody. Spec FR-017 amended. | Matching any part of a name would mean reading the whole directory for every check. |
| D4 | Spec FR-026, stated there with this example since 2026-11-13: typing a full name exactly still gives the list when another person's longer name contains it ("Anna Nowak" and "Anna Nowakowska"). | Built as the spec says. | One more click in a rare case; taking the exact match at once would hide the second person without a word. |
| D5 | In the spec since 2026-11-13 (FR-046): the person already in effect, left unchanged in the field, is not checked again on "Zapisz". | Built as described. | Nothing changes for that person; a check would only cost a request. |
| D6 | Two Jira tabs each hold the settings they read on load. The tab that saves last writes its whole settings object, `lastPerson` included. | Unchanged behaviour of 001. | The remembered person is a convenience; the last save winning is acceptable. |

## Risks

| Risk | Effect | Handling |
|------|--------|----------|
| Jira rejects `worklogAuthor = "{accountId}"` | The search fails with HTTP 400 | The fallback of 001 repeats the query without the author; the client filter keeps the result correct. Check X7: confirmed on 2026-11-13, Jira accepts it; the fallback stays as a safety net |
| Without the author clause a long period scans every issue with a worklog in it | Slow load for another person on a busy site | Existing limitation of the fallback; stated in the README; only when X7 fails |
| Jira's user search does not find a surname typed alone | A colleague is reported as not found | Check X8: confirmed on 2026-11-13; surname alone and full name are found, also typed without Polish letters, so the client filter folds diacritics too |
| The user lacks "Browse users and groups" | Nobody can be chosen | The "not found" alert, as the spec's edge case says. Check X11 |
| E-mail addresses are hidden on the site (seen on 2026-11-13 for the colleague checked) | Two people of the same name look the same in the list | Accepted limit of D1; the header shows the chosen name, and the totals tell which one it was |
| The user search rate limit of the site is hit by other tools | The check answers HTTP 429 | Existing back-off of the request pool; then the "could not be checked" message |
| The wider launcher no longer fits where the user dragged it | The launcher leaves the window | The stored place is clamped again whenever the name appears or disappears (001 FR-075) |
| A colleague's name stays in the browser's storage | Somebody using the same browser profile sees it in the settings field | By design (requester's decision); one name only, no worklog data; stated in the storage contract |

## Project Structure

### Documentation (this feature)

```text
specs/002-other-user-worktime/
├── plan.md                      # This file
├── spec.md                      # Feature specification
├── research.md                  # Decisions R1 to R11, checks X7 to X11 on a real Jira site
├── data-model.md                # Person, PersonChoice, name matching, state transitions
├── quickstart.md                # Commands, test data, validation scenarios V1 to V13
├── contracts/
│   ├── jira-rest.md             # The three new requests and the changed ones
│   ├── settings-storage.md      # The added field lastPerson
│   └── ui.md                    # Header line, launcher, settings, list, alert, texts, tokens
├── checklists/
│   └── requirements.md          # Spec quality checklist
└── tasks.md                     # Created by /speckit-tasks, not by this command
```

### Source Code (repository root)

Only files that are new or change. The layout of 001 stays.

```text
src/
├── domain/
│   ├── person.ts            # NEW  Person, PersonCandidate, normalise, match (one / many / none), account-ID check
│   ├── settings.ts          # CHG  lastPerson: read with validation, write
│   └── worklog.ts           # CHG  buildRows takes the author's account ID instead of the session's
├── jira/
│   ├── gateway.ts           # CHG  Session.displayName
│   ├── session-gateway.ts   # CHG  reads displayName from /myself
│   ├── worklog-loader.ts    # CHG  buildJql and loadPeriod take the author; currentUser() or a quoted account ID
│   └── people-finder.ts     # NEW  findPeople (name search, narrowed in the client), getPerson by account ID
├── ui/
│   ├── header.ts            # CHG  the name line above the title; setPerson
│   ├── launcher.ts          # CHG  the name before the label for another person; setPerson
│   ├── settings-popover.ts  # CHG  divider, two options, name field, busy state, messages, candidate list, the save flow
│   ├── alert-dialog.ts      # NEW  the small alert window with "OK"; makes the settings inert while shown
│   ├── controller.ts        # CHG  the person in effect; setPerson empties rows, last load, and history, then loads
│   ├── app.ts               # CHG  PersonChoice state; wires settings, header, launcher, controller; the close button resets it
│   ├── table.ts             # CHG  "no rows, loading" without the empty-state message (change of person)
│   ├── progress.ts          # CHG  an emptied bar or chart that keeps the zoom (change of person)
│   └── dom.ts               # CHG  only if a helper for radio inputs is needed
├── i18n/pl.ts               # CHG  the new Polish texts (contracts/ui.md)
└── styles/
    ├── _tokens.scss         # CHG  --wt-person, --wt-scrim in both themes; the sizes --wt-launcher-name-max, --wt-alert-width, --wt-list-max-height
    └── app.scss             # CHG  name line, launcher name, options, name row, list, alert window

tests/
├── fixtures/                # NEW  users-search-*.json, user-*.json, worklogs of a second person
├── fake-gateway.ts          # CHG  session with displayName; routes for the three new requests
├── unit/
│   ├── person.test.ts           # NEW
│   ├── people-finder.test.ts    # NEW
│   ├── settings.test.ts         # CHG  lastPerson
│   ├── worklog.test.ts          # CHG  author parameter
│   ├── worklog-loader.test.ts   # CHG  query for another person, fallback
│   └── session-gateway.test.ts  # CHG  displayName
├── ui/
│   ├── settings-popover.test.ts # CHG  the whole person flow
│   ├── alert-dialog.test.ts     # NEW
│   ├── header.test.ts           # CHG  name line
│   ├── launcher.test.ts         # NEW  name on the launcher
│   └── app.test.ts              # CHG  change of person, minimise, close, new mount, remembered person
└── e2e/
    ├── browser-gateway.ts       # CHG  user directory and a second person's worklogs; scenario people-offline
    ├── person.spec.ts           # NEW  V1 to V11 at 320 px and 1280 px, both themes; name contrast
    ├── layout.spec.ts           # CHG  no horizontal scroll at 320 px with the list and with the alert; launcher inside the window
    ├── a11y.spec.ts             # CHG  keyboard path through the options, the list, and the alert; touch targets
    └── extension.spec.ts        # CHG  GET only and same origin, including the new requests

README.md                    # CHG  the feature, its limits (D1 to D3), the permission it relies on
package.json                 # CHG  version 0.3.0 (also package-lock.json)
extension/manifest.json      # CHG  version 0.3.0
docs/screenshots/            # CHG  retaken: the header has the name line
specs/001-worktime-panel/    # CHG  spec.md and the two contracts say what 002 replaces
```

**Structure Decision**: the single front-end project of 001, unchanged in shape.
`src/domain/person.ts` holds every rule about names with no browser or Jira dependency;
`src/jira/people-finder.ts` is the only new place that knows the REST contract of the user
look-ups, and it goes through the existing gateway and request pool, so `session-gateway.ts`
stays the only file that calls `fetch`. The settings pop-over receives the look-up as
functions from `app.ts`, as it receives `getSettings` and `onSave` today, so it stays
testable without Jira. The person in effect lives in `app.ts` next to `startOnToday` and is
handed to the controller; nothing else needs to know whose data is shown.

## Complexity Tracking

No constitution violations. Nothing to justify.
