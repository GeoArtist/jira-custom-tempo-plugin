# Data Model: Worktime of Another User

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

Extends the [data model of 001](../001-worktime-panel/data-model.md). Only what is new or
changed is described; everything else (Period, TimeEntry, TicketRow, PeriodSummary, chart
buckets, view state) is unchanged.

The spec is the source of every rule here (spec, Clarifications 2026-11-13); this file
gives them the shape the code needs. Where the two differ, the spec wins.

## Entities

### Person (new)

A person of the Jira site whose logged time can be shown. Spec: "Selected person",
"Signed-in user", "Remembered person".

| Field | Type | Rule |
|-------|------|------|
| `accountId` | string | Jira's account ID; identity. Must match `^[A-Za-z0-9:_-]{1,128}$` |
| `displayName` | string | The full name exactly as Jira has it (FR-008); 1 to 255 characters |

Two people are the same when their `accountId` is the same; names are not identities.

### PersonCandidate (new)

A person offered in the list of the settings (FR-026, FR-030). Lives only while the list is
open.

| Field | Type | Source |
|-------|------|--------|
| `accountId`, `displayName` | as Person | user look-up |
| `email` | string or none | `emailAddress`, when Jira returns it and it is not empty (Jira sends an empty string for a hidden address) |

Only active accounts of type `atlassian` become candidates (spec, Assumptions).

### Name matching (new, FR-017, FR-018, FR-026)

`normalise(text)`: trim, replace every run of white space by one space, lower-case, and
remove Polish diacritical marks (`ż` → `z`, `ó` → `o`, `ł` → `l`, and so on), because Jira's
own search ignores them (confirmed on a real site, research X8).

| Input | Result |
|-------|--------|
| The normalised text is empty | `empty`: ask for a name; no request (FR-018) |
| No candidate's normalised name contains the text | `notFound`: the "not found" alert (FR-020) |
| Exactly one candidate, and its normalised name equals the text | `found`: that person (FR-026) |
| Anything else with at least one candidate | `several`: the list; at most 10 shown, `more` = there were more than 10 (FR-030) |

Candidates in the list are ordered by display name with Polish collation, then by account
ID, so the order is the same every time.

### NameCheck result (new)

What "Zapisz" gets back for "Inny użytkownik". Spec: "Name check".

The names are those of spec FR-026 and are used in the code and in the tasks as written
here: `found` ("found"), `several` ("several"), `notFound` ("not found"), `failed`
("could not be checked"). `empty` in "Name matching" is not a result of a check: it is
the empty field of FR-018, caught before any check is made.

| Result | Meaning | What the settings do |
|--------|---------|----------------------|
| `found(person)` | one person is certain | save everything, close (FR-024) |
| `several(candidates, more)` | several, or a partial name | show the list; save nothing (FR-026) |
| `notFound` | nobody, or the remembered person no longer exists or was deactivated | alert window; save nothing (FR-020 to FR-022) |
| `failed` | Jira could not be asked | message under the field; save nothing (FR-023) |

### PersonChoice (new, not stored)

Whose time the add-on shows. Part of AppState; lives as long as the selected period.

| Field | Type | Rule |
|-------|------|------|
| `mode` | `current` \| `other` | `current` on every page load and after the close button (FR-027, FR-028) |
| `person` | Person | the signed-in user when `mode` is `current`; the chosen person when `other` |

Derived: `isSelf` = `person.accountId` equals the session's account ID. It can be true in
mode `other` (the user typed their own name); the launcher then shows no name (FR-033).

### UserSettings (changed)

One field is added to the stored settings of 001.

| Field | Type | Default | Rule |
|-------|------|---------|------|
| `lastPerson` | Person or none | none | The other person saved last (FR-035). Written by every successful "Zapisz" with "Inny użytkownik" for a person other than the signed-in user. Read to fill the name field in advance (FR-036). Never decides whose time is shown on start. |

Validation on read: an object with a valid `accountId` and a `displayName` of 1 to 255
characters; anything else counts as none, and the other fields keep their values. Storage
format: [contracts/settings-storage.md](contracts/settings-storage.md).

### Session (changed)

| Field | Type | Source |
|-------|------|--------|
| `displayName` | string | `GET /rest/api/3/myself`, field `displayName`; empty when absent |

`accountId`, `timeZone`, and `siteUrl` are unchanged. The signed-in user as a Person is
`{ accountId, displayName }` of the session.

### AppState (changed)

| Field | Type | Rule |
|-------|------|------|
| `choice` | PersonChoice | see above; the launcher's own loads of today are always for the signed-in user, because they run only while `startOnToday` is `true`, which implies mode `current` |

## Changed rules of 001

- **Rows** (001 "TicketRow"): a worklog belongs to the table when its author's account ID
  equals `choice.person.accountId` (was: the session's account ID).
- **Loaded data and history** (001 "View state"): every remembered view and the last load
  belong to one person. A change of person empties them (FR-004).
- **Launcher label** (001 "AppState"): unchanged; for another person the name stands before
  it (FR-033).

- **Change of person** (new, FR-003, FR-040, FR-041): at the moment the person changes,
  the rows on screen, the last load, and the views of back and forward are emptied, the
  header shows the new name, the totals show `…`, and the launcher shows `–` with the new
  name. The rule of 001 that old rows stay under the spinner applies to a change of
  period only.

## State transitions

### PersonChoice

| From | Event | To | Effect |
|------|-------|----|--------|
| (none) | page load | `current` | header shows the signed-in user's name; launcher loads today for them |
| `current` | "Zapisz" with "Inny użytkownik", check `found(p)` | `other(p)` | `lastPerson := p` stored, unless `p` is the signed-in user; history and loaded data emptied; the period on screen is loaded for `p`; header and launcher show `p` |
| `other(p)` | "Zapisz" with another name, check `found(q)` | `other(q)` | as above for `q` |
| `other(p)` | "Zapisz" with `p` unchanged | `other(p)` | no check, no reload; other settings saved |
| `other(p)` | "Zapisz" with "Obecny użytkownik" | `current` | history and loaded data emptied; the period on screen is loaded for the signed-in user; `lastPerson` stays `p` |
| `other(p)` | minimise (button, launcher, Escape) | `other(p)` | nothing forgotten; the launcher keeps `p`'s name and total (FR-028) |
| `other(p)` | close button | `current` | with the return to today (001 FR-049); launcher loads today for the signed-in user |
| any | "Anuluj", Escape in the settings, check `several`, `notFound`, `failed` | unchanged | nothing saved (FR-014, FR-021) |
| any | page reload, new tab, browser start | `current` | by construction: the choice is not stored (FR-032) |

### Settings pop-over, person part

| State | Shown | Leaves by |
|-------|-------|-----------|
| `current` | two options, "Obecny użytkownik" selected; no field | selecting "Inny użytkownik" → `other-editing` |
| `other-editing` | field, focused, its text selected; the text was set once when the settings opened: the person in effect, else `lastPerson`, else empty (FR-013) | "Zapisz" → `checking`, or directly saved when the pick is certain; selecting "Obecny użytkownik" → `current` (text kept, FR-012) |
| `checking` | "Zapisz" disabled and marked busy (FR-019) | result: `found` → saved and closed; `several` → `choosing`; `notFound` → `alert`; `failed` (also no answer after 15 s, FR-045) → `other-editing` with the message. "Anuluj" or Escape → closed, result ignored |
| `choosing` | the list under the field | picking a person → `other-editing` with the pick; editing the field → `other-editing` without it |
| `alert` | the alert window over inert settings | "OK", Enter, Escape → `other-editing`, focus in the field, every value as entered (FR-022) |

A **pick** is a Person attached to the field's text: set by choosing from the list, by the
prefilled person in effect, or by the prefilled `lastPerson`. It is dropped as soon as the
normalised text no longer equals the pick's normalised name (FR-031).

| Pick on "Zapisz" | Check made |
|------------------|------------|
| chosen from the list in this visit | none (FR-031) |
| the person in effect, unchanged | none |
| the prefilled `lastPerson` | by account ID (FR-036; [research.md](research.md) R3) |
| no pick | by name ([research.md](research.md) R1) |

## Relationships

- Session 1 → 1 Person (the signed-in user).
- AppState 1 → 1 PersonChoice → 1 Person.
- UserSettings 1 → 0..1 Person (`lastPerson`).
- A load of a Period is always for exactly one Person; TicketRow and PeriodSummary inherit
  that person from the load.
