---

description: "Task list for the Worktime of Another User feature"
---

# Tasks: Worktime of Another User

**Input**: Design documents from `/specs/002-other-user-worktime/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (jira-rest.md, settings-storage.md, ui.md), quickstart.md

**Tests**: INCLUDED. The constitution (Principle V) requires that every behavior ships with automated tests in the same change, runnable with one command and without a live Jira. In each phase the test tasks come first: write them, see them fail, then write the code.

**Organization**: Tasks are grouped by user story so each story can be built, tested, and shown on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on unfinished tasks)
- **[Story]**: Which user story the task belongs to (US1 to US4)
- **MANUAL** in a description: needs a person signed in to a real Jira Cloud site; an agent cannot complete it alone

## Path Conventions

Single front-end project at the repository root: `src/`, `tests/`, `demo/`, `extension/`, `scripts/`, `vite.config.ts`. Source is TypeScript and SCSS only. Paths below are relative to the repository root.

## Rules that apply to every task

- The spec is the source: `specs/002-other-user-worktime/spec.md`. FR and SC numbers below are from it; "001 FR-…" is from `specs/001-worktime-panel/spec.md`.
- All visible text comes from `src/i18n/pl.ts`; no other source file may contain Polish text. The exact strings are in spec FR-029.
- Every colour, space, and size in `src/styles/app.scss` comes from a token in `src/styles/_tokens.scss`; no one-off values.
- Only `GET` requests, only to paths on the page's own origin, only through `JiraGateway.request` (`src/jira/gateway.ts`). `src/jira/session-gateway.ts` stays the only file that calls `fetch`.
- No new dependency. No pictures are requested from anywhere.
- Vite+ (`vp`) for everything: `vp test run`, `vp check`, `vp run build`, `vp run test:e2e`, `vp run check`. On Windows run them from a path with an upper-case drive letter (`cd /E/Atlasus/_repos/jira-custom-tempo`), otherwise the unit test files are not found.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A known green starting point, and the texts and colours every later task uses.

- [X] T001 Run `vp run check` on branch `002-other-user-worktime` before any change and confirm it passes; note the gzipped size of `dist/extension/content.js` that `scripts/check-size.ts` prints, for comparison in T056
- [X] T002 [P] Add the new texts to `src/i18n/pl.ts`, exactly as in spec FR-029: `personGroup: 'Użytkownik'`, `personCurrent: 'Obecny użytkownik'`, `personOther: 'Inny użytkownik'`, `personName: 'Imię i nazwisko'`, `personNameRequired: 'Podaj imię i nazwisko.'`, `personNotFound: 'Nie znaleziono użytkownika. Nie można zapisać ustawień.'`, `ok: 'OK'`, `personCheckFailed: 'Nie udało się sprawdzić użytkownika w Jirze. Ustawienia nie zostały zapisane.'`, `personChecking: 'Sprawdzanie…'`, `personChoose: 'Znaleziono kilka osób. Wybierz jedną:'`, `personTooMany: 'Pokazano 10 pierwszych osób. Wpisz dokładniejsze imię i nazwisko.'`
- [X] T003 [P] Add tokens to `src/styles/_tokens.scss` (FR-007, FR-020, FR-034, FR-044, FR-048): in both theme blocks `--wt-person` (`#ff6c00` dark, `#b84e00` light; changed on 2026-11-13) and `--wt-scrim` (`rgb(0 0 0 / 55%)` dark, `rgb(23 32 51 / 35%)` light); in the shared block the sizes `--wt-launcher-name-max: 24ch`, `--wt-alert-width: 280px`, and `--wt-list-max-height: 220px`. No component may write one of these values itself (constitution, Principle IV)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The person as a type, the signed-in user's name, and a loader that can read anybody's time. Nothing the user sees changes in this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Write failing unit tests in `tests/unit/person.test.ts` for `isValidAccountId` (accepts `me`, `5b10a2844c20165700ede21g`, `712020:0f3c9a1e-7b2d-4c55-9a10-2f6d8e4b1c77`; rejects an empty string, 129 characters, a quotation mark, a space) and for `isPerson` (an object with a valid `accountId` and a `displayName` of 1 to 255 characters; rejects a missing field, an empty name, 256 characters, `null`, a string)
- [X] T005 Create `src/domain/person.ts` with `interface Person { accountId: string; displayName: string }`, `isValidAccountId(value)` using `^[A-Za-z0-9:_-]{1,128}$`, `isPerson(value: unknown): value is Person` (`displayName`: "1 to 255 characters"), and `samePerson(a, b)` comparing `accountId` only (data-model.md, Person); T004 passes
- [X] T006 [P] Extend `tests/unit/session-gateway.test.ts`: the session carries `displayName` from the `/rest/api/3/myself` answer, and an answer without `displayName` gives an empty string (FR-010)
- [X] T007 Add `displayName: string` to `Session` in `src/jira/gateway.ts` and read it in `src/jira/session-gateway.ts` (`myself.displayName ?? ''`); give every fake session the name `Jan Kowalski`: `fakeSession` in `tests/fake-gateway.ts`, `getSession` in `tests/e2e/browser-gateway.ts`, and the `/rest/api/3/myself` route in `tests/e2e/extension.spec.ts`; T006 passes and `vp check` has no type errors
- [X] T008 [P] Extend `tests/unit/worklog.test.ts` and `tests/unit/worklog-loader.test.ts` with failing tests (contracts/jira-rest.md, steps 2 and 3): `buildRows` keeps only worklogs whose `author.accountId` equals the given author; `buildJql` writes `worklogAuthor = currentUser()` for the signed-in user and `worklogAuthor = "712020:abc"` (double quotes) for another account ID; an account ID that fails `isValidAccountId` is never placed in the query (the author clause is left out); `loadPeriod` for another person sends the quoted query, repeats without the author clause on HTTP 400, and returns only that person's rows
- [X] T009 Change `buildRows` in `src/domain/worklog.ts` to take the author's account ID as a parameter instead of reading `session.accountId`, and change `buildJql` and `loadPeriod` in `src/jira/worklog-loader.ts` to take an optional `authorId` (default: `session.accountId`, which keeps `currentUser()`); update the existing callers in `src/ui/controller.ts` and `src/ui/app.ts` so behaviour is unchanged; T008 passes and the whole unit suite stays green
- [X] T010 MANUAL (done 2026-11-13: X7 and X8 confirmed, results in `research.md`; no fallback is needed; the client filter must fold Polish diacritics, see T016 and T021): before Phase 4, confirm checks X7 and X8 of `specs/002-other-user-worktime/research.md` on a real Jira Cloud site, without the extension, in a browser tab signed in to that site. X8: open `/rest/api/3/user/search?query=<a colleague's surname>&maxResults=50`; the colleague must be in the answer; repeat with their full name and with the name in lower-case letters. X7: open `/rest/api/3/search/jql?jql=worklogAuthor%20%3D%20%22<the colleague's accountId from the first answer>%22%20AND%20worklogDate%20%3E%3D%20%22<a date they logged time>%22&fields=summary&maxResults=5`; the answer must be HTTP 200, not 400. Write both results into the table of checks in that file. If X8 fails, apply the fallback named there when building T022 (send the first word only, filter in the client) and change spec User Story 3, scenario 8, as the spec's Dependencies say. If X7 fails, note in `specs/002-other-user-worktime/plan.md` (Risks) that the query without the author is the normal path for another person. Phase 3 does not wait for this task

**Checkpoint**: `vp test run` and `vp check` pass; the add-on behaves exactly as before.

---

## Phase 3: User Story 1 - See whose time is shown (Priority: P1) 🎯 MVP

**Goal**: The header names the selected person on a line above the title, in the name colour. For now that is always the signed-in user.

**Independent Test**: `vp run dev`, open the panel: "Jan Kowalski" stands above "Piątek 06-11-2026 · 10h 10m" in orange, in both themes and at 320 px (quickstart V1).

### Tests for User Story 1 ⚠️

- [X] T011 [P] [US1] Add failing tests to `tests/ui/header.test.ts`: the header has a name line that is a sibling before the `h1` and not inside it (FR-006); `setPerson('Jan Kowalski')` writes the text and sets the same text as the element's `title` (FR-009); `setPerson('')` leaves the element in place and empty (FR-010); the action buttons are unchanged
- [X] T012 [P] [US1] Create `tests/e2e/person.spec.ts` with failing browser tests for quickstart V1 at 320 px and 1280 px in both themes: the name is visible above the title; its computed colour differs from the title's colour; its contrast against the panel's background, computed in the test with the WCAG formula, is at least 4.5:1 (FR-007); with the new scenario `long-name` of T015 the name is on one line, ends in an ellipsis (`scrollWidth > clientWidth`), and the header buttons have the same position and size as without it (FR-009)

### Implementation for User Story 1

- [X] T013 [US1] In `src/ui/header.ts` add a `p.wt-person` element before the `h1` inside `div.wt-header__text` and a method `setPerson(name: string)` on `Header` that sets its text and `title`; T011 passes
- [X] T014 [US1] Style `.wt-person` in `src/styles/app.scss` (contracts/ui.md, Header): colour `var(--wt-person)`, `var(--wt-text-sm)`, `var(--wt-weight-medium)`, one line with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`, a fixed line height so the empty line keeps its place, and `min-width: 0` on `.wt-header__text` so the name shrinks before the buttons move; in the narrow layout (the existing header media query) the name line stays above the title on the title's own line
- [X] T015 [US1] Add a scenario `long-name` to `tests/e2e/browser-gateway.ts` whose session `displayName` is a 60-character name, and call `header.setPerson(session.displayName)` in `src/ui/app.ts` right after the header is created; add an assertion to `tests/ui/app.test.ts` that the mounted app shows the session's name in the header; T012 passes

**Checkpoint**: User Story 1 works on its own: the name is shown, nothing else changed.

---

## Phase 4: User Story 2 - Show the logged time of another person (Priority: P1)

**Goal**: In the settings the user chooses "Inny użytkownik", types a colleague's full name, presses "Zapisz"; the name is checked in Jira and, when exactly that person is found, the panel and the launcher show the colleague's time.

**Independent Test**: `vp run dev` → settings → "Inny użytkownik" → `piotr nowakowski` → "Zapisz": the rows shown before are cleared at once, "Piotr Nowakowski" stands above the title, the totals read 1h 30m, the launcher reads "Piotr Nowakowski · Dziś: 1h 30m" (quickstart V2, V3).

**Scope note**: this phase handles the result "found". Until Phase 5, any other result leaves the settings open with nothing saved and no message.

### Tests for User Story 2 ⚠️

- [X] T016 [P] [US2] Add failing tests to `tests/unit/person.test.ts` for name matching (data-model.md, "Name matching"; FR-017, FR-026): `normaliseName` trims, makes every run of white space one space, and lower-cases (`' anna  NOWAK '` → `'anna nowak'`), and removes Polish diacritical marks (`'Żółć Łukasz'` → `'zolc lukasz'`, all of `ą ć ę ł ń ó ś ź ż`), so that `zelazny` matches "Żelazny" and `żelazny` matches "Zelazny"; `matchPeople(candidates, text)` returns `empty` for a text of spaces only, `notFound` when no name contains the text, `found` when exactly one candidate matches and its normalised name equals the text, `several` otherwise ("Nowak" with three people; two people named "Anna Nowak"; "Anna Nowak" with "Anna Nowak" and "Anna Nowakowska"); `several` is ordered by name with Polish collation (`Ł` after `L`, `Ż` last) then by `accountId`, holds at most 10 people, and has `more: true` when more than 10 matched; quotation marks and `%` in the text are compared as written
- [X] T017 [P] [US2] Add fixtures `tests/fixtures/users-search-nowak.json` (two "Anna Nowak" with different `emailAddress`, "Piotr Nowakowski" with `emailAddress: ""` (what Jira sends for a hidden address), an account with `accountType: "app"` named "Nowak Bot", and a user with `active: false`) and `tests/fixtures/users-search-empty.json` (`[]`), and write failing tests in `tests/unit/people-finder.test.ts` (contracts/jira-rest.md, step 4): `findPeople` sends exactly one request, `GET /rest/api/3/user/search?query=<encoded text>&maxResults=50`, with the normalised text; it returns only users with `accountType` `atlassian`, `active` not `false`, and a valid `accountId`, each as `{ accountId, displayName, email? }`, with no `email` when `emailAddress` is absent or an empty string; an empty list gives an empty result; a status other than 200 rejects; an aborted signal rejects with the existing `AbortedError`
- [X] T018 [P] [US2] Add failing tests to `tests/ui/settings-popover.test.ts` (FR-011 to FR-016, FR-019, FR-024, FR-025, FR-042, FR-043, FR-046): the parts stand in the order of FR-011 with a second dividing line after the theme row; the two radio inputs form a group named "Użytkownik"; on open the option in effect is selected; the name row is hidden for "Obecny użytkownik"; selecting "Inny użytkownik" shows the field labelled "Imię i nazwisko", focuses it, and selects its text; selecting "Obecny użytkownik" hides it and keeps the text; the field has `maxlength="255"`, `autocomplete="off"`, `spellcheck="false"`; with another person in effect the field holds that name on open; "Zapisz" with "Obecny użytkownik" calls no look-up; "Zapisz" with a name calls the look-up once with the typed text and, on `found`, calls `onSave` with the settings and that person and closes; Enter in the field does the same; typing in the field calls no look-up (FR-016, SC-008); while the look-up is pending "Zapisz" is disabled with `aria-busy="true"` and the accessible text "Sprawdzanie…", and the options and the field are disabled; "Anuluj", Escape, and a click outside during the look-up close the pop-over and a late result changes nothing; "Zapisz" with the person in effect unchanged calls no look-up and saves the other settings
- [X] T019 [P] [US2] Create `tests/ui/launcher.test.ts` with failing tests (FR-033, FR-034, FR-041): `setPerson('Anna Nowak')` shows the name element before the label, then a separator `·`; `setPerson(null)` removes both so the launcher's text is as before; the full name is the launcher's `title` while a person is set; `showPending(period)` shows the label of the period and `–` in place of the total; the visible text is "Anna Nowak · Dziś: 6h 00m" after `show`
- [X] T020 [P] [US2] Add failing tests to `tests/ui/app.test.ts` for a change of person (FR-002 to FR-004, FR-037 to FR-041, FR-049; SC-002): with the signed-in user's rows on screen, saving another person makes, in the same tick, the header name the new name, the table free of rows, both totals "…", the progress bar empty, "Cofnij" and "Ponów" disabled, and the launcher "<name> · Dziś: –"; after the load the rows and totals are the new person's and the launcher shows their total; every later request (a period change, "Odśwież", auto-refresh with the panel open, the launcher's refresh with the panel minimised) carries the new person's account ID in the query; the period, the sort order, the zoom of the chart (set on a week before the change), the size of the panel, and the launcher's place are kept (FR-037); a change from one other person to a second clears the first one's rows the same way; "Zapisz" with "Obecny użytkownik" returns to the signed-in user the same way; a failed load for the new person shows the error state with no rows of the previous person and the launcher "–"; typing the signed-in user's own name leaves the launcher without a name

### Implementation for User Story 2

- [X] T021 [US2] Extend `src/domain/person.ts` with `PersonCandidate` (`Person` plus optional `email`), `MAX_CANDIDATES = 10`, `normaliseName` (spaces, lower case, and diacritics folded with `normalize('NFD')` minus the combining marks, plus `ł` → `l`, which does not decompose), and `matchPeople` returning `{ kind: 'empty' } | { kind: 'notFound' } | { kind: 'found'; person } | { kind: 'several'; people; more }`, ordered with `new Intl.Collator('pl')`; T016 passes
- [X] T022 [US2] Create `src/jira/people-finder.ts` with `findPeople(gateway, text, options?: { signal })` as tested in T017, sending the request through the existing `RequestPool` (`src/jira/request-pool.ts`) so HTTP 429 is retried as in 001; it never reads `avatarUrls`; T017 passes
- [X] T023 [US2] In `src/ui/controller.ts` hold the selected person (`ControllerOptions.person`, default the session's own) and pass its `accountId` to every `loadPeriod` call; add `reset(person): void` that aborts the running load, raises `loadId`, sets the person, empties `rows`, `loaded`, and `history` (one view: the current period, `rows: null`), disables back and forward, and redraws the header total as "…", the progress bar or chart as empty, and the table with no rows, without loading anything and without changing the zoom of the chart (FR-037); add `setPerson(person): Promise<void>` that calls `reset` and then loads the current period so that only the loading state is in the table area; add what `src/ui/table.ts` and `src/ui/progress.ts` need to show "no rows, loading" without an empty-state message (FR-003, FR-004, FR-039)
- [X] T024 [US2] In `src/ui/launcher.ts` add the name element and the separator before the label, `setPerson(name: string | null)`, and `showPending(period)` (label of the period, `–`, no colour); keep `title` as the full name while a person is set and as the error text after `showError`; T019 passes
- [X] T025 [US2] In `src/ui/settings-popover.ts` add the second dividing line, the radio group, and the name row, and new options `getChoice(): { mode: 'current' | 'other'; person: Person }`, `findPeople(text, signal): Promise<PersonCandidate[]>`, and `onSave(settings, choice)`; implement the save flow for `found` with the busy state, Enter in the field, the pick of the person in effect (no look-up when unchanged), and the abort of a running look-up on cancel; T018 passes
- [X] T026 [US2] In `src/ui/app.ts` keep `choice: { mode, person }` next to `startOnToday` (never stored), pass `getChoice` and `findPeople` (bound to the gateway) to the pop-over, and in `onSave`, when the person's `accountId` changed: `header.setPerson`, `launcher.setPerson` (null when it is the signed-in user), `launcher.showPending`, `controller().setPerson`, then `keepLauncherInside()` because the launcher's width changed; when it did not change, save the other settings only; T020 passes
- [X] T027 [US2] Style in `src/styles/app.scss` (contracts/ui.md): the radio options (44 px high on touch devices and narrow screens, visible focus), the name row and its field, the busy "Zapisz" (the spinner of the refresh button), and the launcher's name (`var(--wt-person)`, `max-width: var(--wt-launcher-name-max)`, ellipsis, `flex-shrink` so label and total stay whole) with its muted separator
- [X] T028 [US2] Give the stand-in Jira of `tests/e2e/browser-gateway.ts` a user directory and other people's time (quickstart, "Test data"): Jan Kowalski (`me`), Anna Nowak with a visible e-mail and 6h 00m on 6 November 2026 on two tickets, Piotr Nowakowski with 1h 30m on 6 November 2026, Józef Śliwiński with an empty `emailAddress` and no time; answer `GET /rest/api/3/user/search?query=` with the active people whose full name, or any word of it or of their e-mail, begins with the query, compared without letter case and without Polish diacritical marks, as the real Jira does (so `jozef sliwinski`, `piotr nowakowski`, `anna nowak`, and `nowak` each find someone); make the search route read the author from `worklogAuthor = currentUser()` or `worklogAuthor = "<id>"`
- [X] T029 [US2] Add browser tests to `tests/e2e/person.spec.ts` at 320 px and 1280 px: quickstart V2, V3, and V13; the launcher with a 40-character name is on one line, wholly inside the window, with label and total whole (FR-034); the whole flow by keyboard alone, saving with Enter, every new control showing a focus ring (User Story 2, scenario 16)

**Checkpoint**: User Stories 1 and 2 work: a colleague with a unique full name can be shown, and the table never holds one person's rows under another's name.

---

## Phase 5: User Story 3 - A name that is not in Jira (Priority: P2)

**Goal**: A name nobody has gives the alert window and saves nothing; a name several people fit gives a list to pick from; an empty field and a check that could not be made give a message under the field.

**Independent Test**: `vp run dev` → "Inny użytkownik" → `Jan Nieistniejący`, interval 10 → "Zapisz": alert with "OK"; after "OK" the settings hold the name and 10, the panel is unchanged, a reload shows the old interval (quickstart V4). Then `Anna Nowak` → a list of two (V5).

### Tests for User Story 3 ⚠️

- [X] T030 [P] [US3] Create `tests/ui/alert-dialog.test.ts` with failing tests (FR-020): `show(text)` adds an element with `role="alertdialog"`, `aria-modal="true"`, the text as its description, and one button "OK" that has the focus; the element given as "under" gets the `inert` attribute while it is shown and loses it after; "OK", Enter, and Escape close it and call `onClose` once; a click on the dimmed layer does not close it; Tab keeps the focus on "OK"
- [X] T031 [P] [US3] Add failing tests to `tests/ui/settings-popover.test.ts` for the other results (FR-018, FR-020 to FR-023, FR-026, FR-030, FR-031, FR-047): an empty or all-spaces field shows "Podaj imię i nazwisko." under the field, focuses it, and calls no look-up; `notFound` shows the alert with "Nie znaleziono użytkownika. Nie można zapisać ustawień.", `onSave` is not called, and after "OK" the pop-over is open with the option, the name, a changed interval, and a flipped theme switch as entered, the focus in the name field with its text selected; a rejected look-up shows "Nie udało się sprawdzić użytkownika w Jirze. Ustawienia nie zostały zapisane." under the field and no alert, the message stays until the field is edited, the other option is selected, or "Zapisz" is pressed, and "Zapisz" calls the look-up again; `several` shows the heading line "Znaleziono kilka osób. Wybierz jedną:", one button per person with the name and the e-mail when present and the name alone otherwise, the line "Pokazano 10 pierwszych osób. Wpisz dokładniejsze imię i nazwisko." only when `more`, the focus on the first entry, and `onSave` not called; picking an entry writes the name into the field, hides the list, and focuses "Zapisz"; the next "Zapisz" calls `onSave` with that person and no look-up; editing the field hides the list and drops the pick so the next "Zapisz" looks up again; Escape with the alert shown closes the alert only, and a second Escape closes the pop-over; a pointer press outside the pop-over while the alert is shown closes nothing; `cancel()` while the alert or the list is shown closes them with the pop-over
- [X] T032 [P] [US3] Add failing tests to `tests/unit/people-finder.test.ts` (FR-023, FR-045; contracts/jira-rest.md, "Errors and limits"): a look-up with no answer after 15 seconds (injected timers) abandons the request and rejects; HTTP 401 and 500 reject; HTTP 429 with `Retry-After` is retried and then succeeds

### Implementation for User Story 3

- [X] T033 [US3] Create `src/ui/alert-dialog.ts`: `createAlertDialog({ under, scope })` with `element`, `isOpen()`, `show(text, onClose)`, and `close()`, as tested in T030; it stops its own Escape and Enter key events so the pop-over and the panel do not see them
- [X] T034 [US3] Add the 15-second limit to `findPeople` in `src/jira/people-finder.ts` with an `AbortController` and injectable timers (the `Timers` shape of `src/ui/controller.ts`), exported as `CHECK_TIMEOUT_MS = 15_000`; T032 passes
- [X] T035 [US3] Complete the save flow in `src/ui/settings-popover.ts` for `empty`, `notFound`, `several`, and a rejected look-up: the field message element (`role="alert"`), the alert through `alert-dialog.ts` mounted inside the pop-over, the candidate list (a group named by its heading line, buttons for entries), the pick and its dropping, and the Escape order of FR-047; make `cancel()` close the alert and the list; T031 passes
- [X] T036 [US3] Style in `src/styles/app.scss` (contracts/ui.md): the field message (the existing `.wt-field-error` look), the candidate list (entries 44 px high on touch, name and e-mail on two lines, the e-mail in the muted colour, long text cut with an ellipsis, the list at most `var(--wt-list-max-height)` high and scrolling inside the pop-over while "Anuluj" and "Zapisz" stay visible), and the alert window (centred over the pop-over on a `var(--wt-scrim)` layer that covers the pop-over only, `var(--wt-alert-width)` wide and never wider than the pop-over, text wrapping, a primary "OK" button of 44 px on touch)
- [X] T037 [US3] Extend the stand-in Jira of `tests/e2e/browser-gateway.ts`: a second active "Anna Nowak" with another e-mail and no time, "Marta Zielińska" with `active: false` (never returned by the search), "Worklog Bot" with `accountType: "app"`; a scenario `people-many` with 12 people named "… Kowalski"; a scenario `people-offline` in which `/rest/api/3/user/search` answers HTTP 500
- [X] T038 [US3] Add browser tests to `tests/e2e/person.spec.ts` at 320 px and 1280 px in both themes: quickstart V4, V5, V6, V9, V10, V11; with `people-many` the list holds 10 entries and the "Pokazano 10 pierwszych osób…" line, and scrolls inside the pop-over with the buttons visible (FR-044); while the alert is shown a click on the interval field changes nothing and the Jira page behind stays clickable

**Checkpoint**: User Stories 1 to 3 work: every result of a name check has its defined answer, and nothing is saved unless a person is certain.

---

## Phase 6: User Story 4 - Start on the signed-in user (Priority: P2)

**Goal**: Every page load and the close button return to the signed-in user; minimising keeps the chosen person; the last other person is remembered in the browser and fills the name field in advance.

**Independent Test**: `vp run dev`, show Piotr Nowakowski, then: minimise and open → still Piotr; close and open → Jan Kowalski on today, no name on the launcher; reload → Jan Kowalski; settings → "Inny użytkownik" → the field already holds "Piotr Nowakowski", "Zapisz" shows him (quickstart V7, V8).

### Tests for User Story 4 ⚠️

- [X] T039 [P] [US4] Add failing tests to `tests/unit/settings.test.ts` (contracts/settings-storage.md): `DEFAULT_SETTINGS.lastPerson` is `null`; `readSettings` returns a stored `{ accountId, displayName }` when `accountId` matches `^[A-Za-z0-9:_-]{1,128}$` and `displayName` has 1 to 255 characters; a missing field, a non-object, an invalid `accountId`, an empty or 256-character name each give `lastPerson: null` while the other fields keep their values; a value written without the field (the previous version) reads as `null`; `writeSettings` stores the field under the unchanged key `worktime.settings.v1`
- [X] T040 [P] [US4] Add fixtures `tests/fixtures/user-anna-nowak.json` (active, `accountType: "atlassian"`, a changed `displayName`) and `tests/fixtures/user-inactive.json`, and failing tests to `tests/unit/people-finder.test.ts` (contracts/jira-rest.md, step 5): `getPerson(gateway, accountId)` sends `GET /rest/api/3/user?accountId=<encoded id>` and returns `{ accountId, displayName }` from the answer for HTTP 200 with `active: true` and `accountType: "atlassian"`; returns `null` for `active: false`, HTTP 404, and HTTP 403; rejects for HTTP 401, 500, and no answer after 15 seconds; sends nothing and returns `null` for an account ID that fails `isValidAccountId`
- [X] T041 [P] [US4] Add failing tests to `tests/ui/app.test.ts` (FR-008, FR-027, FR-028, FR-032, FR-035, FR-041, FR-049): with another person shown, minimising (button, launcher, Escape) and opening keeps the person, the rows' author, and the launcher's name; the close button makes the header name the signed-in user's, clears the other person's rows at once, so that on the next opening no row of the other person is in the table at any moment before today's data arrives, removes the launcher's name, shows `–` on the launcher until today's total for the signed-in user has loaded, and loads today for the signed-in user also when the panel was already on today; a second `mountApp` on the same storage starts on the signed-in user with "Obecny użytkownik" selected; a successful save of another person stores `lastPerson` with the name as Jira returned it; saving one's own name, and saving "Obecny użytkownik", leave the stored `lastPerson` as it was; resizing the panel and moving the launcher keep it; when storage refuses the write the person still changes, the pop-over stays open with "Nie udało się zapisać ustawień w tej przeglądarce.", and nothing is remembered (FR-024)
- [X] T042 [P] [US4] Add failing tests to `tests/ui/settings-popover.test.ts` (FR-013, FR-036, FR-046): opened while the signed-in user is shown and a person is remembered, selecting "Inny użytkownik" shows the field already holding the remembered name, selected; with nobody remembered it is empty; switching the options back and forth after typing keeps the typed text; "Zapisz" with the remembered name unchanged calls `getPerson` with the remembered account ID and no name look-up, and on a person calls `onSave` with the person as returned (the new name when it changed); on `null` it shows the "not found" alert; on a rejection it shows the "could not be checked" message; after the name is edited "Zapisz" looks up by name instead

### Implementation for User Story 4

- [X] T043 [US4] Add `lastPerson: Person | null` to `UserSettings` and `DEFAULT_SETTINGS` in `src/domain/settings.ts`, validated in `readSettings` with `isPerson` from `src/domain/person.ts` (a copy of the two fields only); T039 passes
- [X] T044 [US4] Add `getPerson(gateway, accountId, options?)` to `src/jira/people-finder.ts` with the same request pool and 15-second limit as `findPeople`; T040 passes
- [X] T045 [US4] In `src/ui/settings-popover.ts` fill the name field once on `open()` (the person in effect when it is another person, else `getSettings().lastPerson`, else empty), treat the prefilled remembered person as a pick that "Zapisz" checks through a new option `getPerson(accountId, signal)`, and map its results as in T042; T042 passes
- [X] T046 [US4] In `src/ui/app.ts`: in `onSave` set `settings.lastPerson` to the saved person when the mode is `other` and the person is not the signed-in user, otherwise keep it; pass `getPerson` (bound to the gateway) to the pop-over; in `close()` reset `choice` to the signed-in user, call `header.setPerson`, `launcher.setPerson(null)`, `launcher.showPending` for today, and `controller().reset(...)` with the signed-in user (the method of the controller task in Phase 4) so no row of the other person stays in the hidden panel, and call `loadToday()` when the panel was not on today **or** another person was shown; keep `lastPerson` in the two other places that write settings (the resize handles and the launcher move); T041 passes
- [X] T047 [US4] Add browser tests to `tests/e2e/person.spec.ts`: quickstart V7 (minimise keeps, close returns) and V8 (after `page.reload()` the signed-in user is shown, and "Inny użytkownik" offers the remembered name, which "Zapisz" shows without typing); typing "Jan Kowalski" shows the user's own time with no name on the launcher and does not replace the remembered person

**Checkpoint**: All four user stories work together and each passes its own test.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Gates of the constitution, documentation, and the checks only a real Jira can give.

- [X] T048 [P] Extend `tests/e2e/a11y.spec.ts`: on a phone viewport the two options, the name field, every list entry, and the alert's "OK" are at least 44 x 44 px (FR-015); every new control is reachable with Tab and shows a focus ring; the option group, the list, and the alert expose the names of FR-043 (asserted through `getByRole` with names)
- [X] T049 [P] Extend `tests/e2e/extension.spec.ts` (the real built extension; FR-005): add routes for `/rest/api/3/user/search` and `/rest/api/3/user`, show another person, and assert that every request the extension sent is a `GET` to the page's own origin, including the new ones, and that no request left for another host
- [X] T050 [P] Extend `tests/e2e/layout.spec.ts`: at 320 px, with the list of 10 people open and then with the alert open, the page has no horizontal scroll and the pop-over is wholly inside the window (FR-044, SC-007); with another person shown the launcher is wholly inside the window after the window is resized
- [X] T051 [P] Update `README.md`: what the feature does and how to use it; that it needs Jira's "Browse users and groups" permission; its limits (only active accounts; a name is found from its beginning, not from the middle of a word; no pictures in the list; days are cut by your own time zone; the last other person's name is kept in the browser)
- [X] T052 Raise the version to `0.3.0` in `package.json` and, where it is repeated, in `package-lock.json` and `extension/manifest.json`
- [X] T053 Run `vp run screenshots` and commit the changed pictures in `docs/screenshots/`, because the header now has the name line
- [X] T054 Record in the documents of 001 what this feature changes, so the two features do not contradict each other: in `specs/001-worktime-panel/spec.md` an amendment line "Amended by 002-other-user-worktime: FR-001 is replaced by 002 FR-001, and 'Only the current user's time is shown' no longer holds"; in `specs/001-worktime-panel/contracts/settings-storage.md` ("Scope of the data") that the value can now hold one person's account ID and name, with a link to the contract of 002; in `specs/001-worktime-panel/contracts/jira-rest.md` (steps 1 to 3) that the author is the selected person, with a link to the contract of 002; and in the header comment of `src/i18n/pl.ts` that the wording of the new texts is fixed by `specs/002-other-user-worktime/spec.md` FR-029
- [X] T055 Walk through quickstart V1 to V13 on the stand-in page (`vp run dev`), at 320 px and 1280 px, in both themes; fix what differs from `specs/002-other-user-worktime/quickstart.md`
- [X] T056 Run `vp run check` from an upper-case drive path and confirm everything passes; confirm the gzipped size printed by `scripts/check-size.ts` is under 100 kB and note the growth against T001 in `specs/002-other-user-worktime/plan.md` (Constitution Check, Principle I)
- [X] T057 MANUAL (done by the requester on 2026-11-13; results in `research.md`. Not checked: X11, which needs an account without the permission, and exact times in seconds): load `dist/extension/` unpacked into a clean browser profile, open a real Jira Cloud site while signed in, and with a real colleague do checks X9 to X11 of `specs/002-other-user-worktime/research.md`, and X7 and X8 once more through the extension; compare the colleague's total for one day with their worklogs in Jira, to the minute (SC-003); note the time from "Zapisz" to the colleague's data (SC-001: 5 seconds) and to the "not found" alert (SC-004: 3 seconds); write every result into the table of checks in that file (Verified, or what was changed)

## Implementation notes (2026-11-13)

- T001 to T056 are done. `vp run check` passes: 371 unit and UI tests, 217 browser tests
  (320 px, 1280 px, 1920 px, and the built extension), content script 24.0 kB gzipped
  (20.1 kB before the feature).
- The tests of the person flow in the settings are in a file of their own,
  `tests/ui/settings-person.test.ts`, and those of the whole add-on in
  `tests/ui/app-person.test.ts`; `tests/ui/settings-popover.test.ts` and
  `tests/ui/app.test.ts` only follow the new shape of the settings.
- "Zapisz" is switched off during a check with `aria-disabled`, not with the `disabled`
  attribute: a disabled button under the keyboard would lose the focus to the Jira page.
- Found while building, and added to the spec (FR-030, FR-044): in the lowest panel the list
  of people had no room under the other rows of the settings. While the list is shown the
  interval row, the theme row, and the two options step aside; the settings are never taller
  than the room under the panel's header, and the two buttons stay at their foot.
- T055 was done through the browser tests (every scenario V1 to V13 has one, at 320 px and
  1280 px) and by looking at pictures of the header, the list, the alert, and the launcher
  in both themes at both widths.
- After the tasks, on the requester's word (2026-11-13): the name colour became `#f51be3` and
  then `#ff6c00`, with the darker shade `#b84e00` in the light appearance (spec FR-007); and a fault older than this
  feature was fixed: at 320 px the close button of the header was cut by the edge of the panel
  (six buttons of 44 px did not fit). On narrow screens the buttons now take a line of their
  own and share its width; `tests/e2e/layout.spec.ts` has a test that failed before the fix.
  `vp run check` passes again: 371 unit and UI tests, 219 browser tests, 24.1 kB gzipped.
- T057 was done by the requester on a real Jira Cloud site on 2026-11-13: a colleague's time is
  shown and matches Jira to the minute, a surname alone works, a name nobody has gives the
  alert, and colleagues' e-mail addresses are hidden in the list. X11 was not checked.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: after Setup. Blocks every user story. Its last task, T010, is manual; it blocks Phase 4 and later, not Phase 3.
- **User Story 1 (Phase 3)**: after Foundational.
- **User Story 2 (Phase 4)**: after Foundational; uses `header.setPerson` of User Story 1 (T013).
- **User Story 3 (Phase 5)**: after User Story 2 (it completes the same save flow).
- **User Story 4 (Phase 6)**: after User Story 2; its tests of the "not found" alert for a remembered person (T042) need User Story 3.
- **Polish (Phase 7)**: after all stories that are to be shipped.

### User Story Dependencies

| Story | Needs | Why |
|-------|-------|-----|
| US1 (P1) | Foundational | the session's name |
| US2 (P1) | US1 | the header shows whose time it is |
| US3 (P2) | US2 | the other results of the same check |
| US4 (P2) | US2, US3 | the life of the choice and the remembered person |

The stories build on one another because they are four faces of one flow; each still ends in a state that can be shown and tested by itself.

### Within Each User Story

- Tests are written first and must fail before the code is written.
- Domain (`src/domain`) before Jira access (`src/jira`) before UI (`src/ui`) before styles and browser tests.
- `src/ui/settings-popover.ts`, `src/ui/app.ts`, `src/styles/app.scss`, `tests/e2e/browser-gateway.ts`, and `tests/e2e/person.spec.ts` are touched in several phases: tasks on the same file are never parallel.

### Parallel Opportunities

- Phase 1: T002 and T003.
- Phase 2: T004, T006, and T008 (three test files); then T005, T007, T009 in order. T010 (manual, on a real Jira) runs beside all of them.
- Phase 3: T011 and T012.
- Phase 4: T016 to T020 (five test files); then T021 and T022 together, T023 and T024 together.
- Phase 5: T030, T031, T032; then T033 and T034 together.
- Phase 6: T039 to T042; then T043 and T044 together.
- Phase 7: T048 to T051.

---

## Parallel Example: User Story 2

```bash
# Write all failing tests of User Story 2 together (different files):
Task: "T016 name matching tests in tests/unit/person.test.ts"
Task: "T017 fixtures and tests in tests/unit/people-finder.test.ts"
Task: "T018 settings flow tests in tests/ui/settings-popover.test.ts"
Task: "T019 launcher tests in tests/ui/launcher.test.ts"
Task: "T020 change-of-person tests in tests/ui/app.test.ts"

# Then the two independent modules together:
Task: "T021 matching in src/domain/person.ts"
Task: "T022 look-up in src/jira/people-finder.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 and Phase 2.
2. Phase 3: the name above the title.
3. Stop and validate: quickstart V1 in both themes and at 320 px. This can be shipped by itself; nothing else changed.

### Incremental Delivery

1. Setup + Foundational → the add-on behaves as before.
2. User Story 1 → the name is shown (MVP).
3. User Story 2 → a colleague with a unique full name can be shown. Not to be released alone: a wrong name gives no answer yet.
4. User Story 3 → every result of the check is answered. First releasable state of the whole feature.
5. User Story 4 → the return to the signed-in user and the remembered person. Release.
6. Polish → the gates of the constitution, the README, and the checks on a real Jira.

### Parallel Team Strategy

One developer is enough: the stories share four files. With two, after Phase 2 one takes the domain and Jira tasks of Phases 4 to 6 (T016, T017, T021, T022, T032, T034, T039, T040, T043, T044) while the other takes the UI tasks.

---

## Notes

- [P] tasks touch different files and do not wait for an unfinished task.
- Every task names the requirement it serves; when a task and the spec differ, the spec wins.
- Commit after each task or each small group of tasks; `vp test run` must be green at every checkpoint.
- Stop at any checkpoint to validate the story by itself.
- T010 and T057 could not be done by an agent; both were done by the requester and their
  results are recorded in `research.md`.
