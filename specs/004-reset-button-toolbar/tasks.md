---

description: "Task list for the Reset Button and Two-Row Header feature"
---

# Tasks: Reset Button and Two-Row Header

**Input**: Design documents from `/specs/004-reset-button-toolbar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (ui.md, settings-storage.md), quickstart.md

**Tests**: INCLUDED. The constitution (Principle V) requires that every behavior ships with automated tests in the same change, runnable with one command and without a live Jira. In each phase the test tasks come first: write them, see them fail, then write the code. Browser tests need the built add-on and are run at the end of their phase.

**Organization**: Tasks are grouped by user story so each story can be built, tested, and shown on its own. The stories are in the order of their priority in the spec. Because "Resetuj" needs its place in the toolbar, the skeleton of the two rows is in Phase 2 (Foundational); the stories then add the reset (US1), the exact layout and the settings (US2), and the phone (US3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on unfinished tasks)
- **[Story]**: Which user story the task belongs to (US1 to US3)
- **MANUAL** in a description: needs a person with a real Jira Cloud site; an agent cannot complete it alone

## Path Conventions

Single front-end project at the repository root: `src/`, `tests/`, `demo/`, `extension/`, `scripts/`, `vite.config.ts`. Source is TypeScript and SCSS only. Paths below are relative to the repository root.

## Rules that apply to every task

- The spec is the source: `specs/004-reset-button-toolbar/spec.md`. FR and SC numbers below are from it; "001 FR-…", "002 FR-…", and "003 FR-…" are from the specs of those features. The markup, the sizes, and the interfaces are in `specs/004-reset-button-toolbar/contracts/ui.md`; the rule of the button's state and the reset transition in `specs/004-reset-button-toolbar/data-model.md`; the reasons in `specs/004-reset-button-toolbar/research.md` (R1 to R9).
- All visible text comes from `src/i18n/pl.ts`; no other file under `src/` may contain Polish letters (guarded by `tests/unit/i18n.test.ts`). The Polish letters in the test tasks below are test data.
- Edit source files with the editor tools, not through a shell heredoc: the shell decodes `\u` escapes and breaks long heredocs on this machine.
- Every colour, space, and size in `src/styles/` comes from a token in `src/styles/_tokens.scss`. This feature adds no token and no breakpoint; it changes one value, `--wt-panel-min-height` (FR-022).
- The class `wt-header__actions` disappears. The new classes are `wt-header__bar`, `wt-header__window`, and `wt-header__tools`; `wt-header__text` stays.
- No dependency is added, no new kind of request is made, no field is added to the stored settings, and `extension/manifest.json` changes only its version.
- Vite+ (`vp`) for everything: `vp test run`, `vp check`, `vp run build`, `vp run test:e2e`, `vp run check`. On Windows run them from a path with an upper-case drive letter (`cd /E/Atlasus/_repos/jira-custom-tempo`), otherwise the unit test files are not found.
- The fake Jira of the browser tests (`tests/e2e/browser-gateway.ts`): today is Friday 06-11-2026 with a total of 10h 10m; `openPanel(page, { scenario, delay })` of `tests/e2e/helpers.ts` chooses a scenario (`today` by default, `long-name` for a name of about 60 characters, `people-many` for the list of people) and how long each request takes; `window.__jiraDown = true` makes every later request fail; `window.__jiraRequests` lists the requests sent. The Playwright projects are `phone` (320 × 640, touch), `desktop` (1280 × 800), `wide` (1920 × 1080; `panel` and `launcher` specs only), and `extension`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A known green starting point.

- [X] T001 Run `vp run check` on branch `004-reset-button-toolbar` before any change and confirm it passes; note the three sizes that `scripts/check-size.ts` prints for `dist/extension` (core 25.2 kB expected), for comparison in T041

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The skeleton of the header in two rows with the six buttons it has today, and the smallest height of the panel that the higher header needs (research R1, R5, R7). After this phase the panel does everything it did before; only the places of the buttons differ.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for the skeleton ⚠️

> Write these first and see them fail.

- [X] T002 [P] Adapt `tests/ui/header.test.ts` to the two groups (contracts/ui.md, "Markup"). Replace the test "has a minimise button between settings and close" by "has the two window buttons in the title row": the children of `header.element` are exactly `.wt-header__bar` and `.wt-header__tools`, in this order; the children of `.wt-header__bar` are `.wt-header__text` and `.wt-header__window`, in this order; the labels (`aria-label ?? textContent`) of `.wt-header__window button` equal `['Minimalizuj', 'Zamknij']`; the title of "Minimalizuj" and its handler as before; `header.element.querySelector('.wt-header__actions')` is `null`. In "has back and forward before refresh…" read the labels from `.wt-header__tools button`. Replace the expectation of "leaves the action buttons as they were" by two: `.wt-header__window button` gives `['Minimalizuj', 'Zamknij']` and `.wt-header__tools button` gives `['Cofnij', 'Ponów', 'Odśwież', 'Ustawienia']`. Add "has its buttons in the reading order": the labels of all `button` elements of `header.element` in document order equal `['Minimalizuj', 'Zamknij', 'Cofnij', 'Ponów', 'Odśwież', 'Ustawienia']` (FR-006)
- [X] T003 [P] Add to `tests/unit/settings.test.ts` the test "reads a height chosen before the header had two rows as the new lowest height (004 FR-008)": with a stored `panelHeight` of `440` and of `483`, `readSettings` returns `panelHeight: 484`; with `484` it returns `484`; with `439` it returns `null`; the stored text in the storage is unchanged after the read (reading does not write). Keep the existing list of invalid heights (`100`, `5000`, `500.5`, `'500'`) as it is
- [X] T004 [P] In `tests/ui/app.test.ts`, test "changes with the arrow keys, never below the minimum, and is remembered" (describe "panel height"): the last two expectations become `'484px'` and `484`
- [X] T005 [P] Adapt `tests/e2e/layout.spec.ts` to the skeleton. (a) In the test that minimises with the header button (the block that starts with the comment "The minimise button of the header, between settings and close"): replace the two comparisons with the gear by: "Minimalizuj" is left of "Zamknij" (`own.x + own.width <= cross.x`), both have the same top (difference under 1 px), and "Ustawienia" stands below them (`gear.y >= own.y + own.height`); change the comment to "The minimise button stands before the close button, in the title row". (b) In "the user sets the height of the panel by dragging its top edge, and it is remembered": after `drag(-600)` expect `484`; after `drag(160)` and after the reload expect `644`. (c) In the export test that stores `panelHeight: 440` under the comment "The lowest panel": keep the stored `440` and expect a height of `484` (the stored height is read as the new lowest one, FR-008). (d) Rewrite "every header button is whole inside the panel, also in the narrowest window": `.wt-header__window button` has count 2 and `.wt-header__tools button` has count 4; every one of the six is inside the panel's box at its left and right edge, as today; the two window buttons share one top, the four toolbar buttons share one top, and the toolbar's top is greater than the bottom of the window buttons

### Implementation of the skeleton

- [X] T006 Change the markup in `src/ui/header.ts` (contracts/ui.md, "Markup"; research R1): `header.wt-header` gets two children, `div.wt-header__bar` holding `div.wt-header__text` (unchanged) and `div.wt-header__window` with `minimiseButton`, `closeButton`, and then `div.wt-header__tools` with `backButton`, `forwardButton`, `refreshButton`, `settingsButton`; remove `wt-header__actions`; no role and no `tabindex` on the groups; update the comment at the top of the file to name the two rows and 004 FR-001 to FR-004; T002 passes
- [X] T007 Change the header styles in `src/styles/app.scss` (contracts/ui.md, "Layout"; research R5), section "header": `.wt-header` becomes `display: flex; flex-direction: column; gap: var(--wt-space-2)` with the paddings it has today at both widths, and loses `align-items`, `justify-content`, and the `flex-wrap` of the narrow rule; add `.wt-header__bar { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--wt-space-3); }`; `.wt-header__text` keeps `min-width: 0` and gets `flex: 1 1 auto`; add `.wt-header__window { display: flex; flex: none; gap: var(--wt-space-2); }` and `.wt-header__tools { display: flex; justify-content: center; gap: var(--wt-space-2); }`; delete the whole `.wt-header__actions` rule with its narrow-screen block (the line of its own, `space-between`, the 4 px gap, the negative margin); in the narrow-screen block that hides the label of a header button and removes its padding, and in the rule for `[aria-disabled='true']` near the end of the file (003 FR-030), replace `.wt-header__actions` by `.wt-header__tools`; rewrite the comments that speak of five or six buttons on one line. In `.wt-popover` set the default `--wt-popover-top` to `104px` and, in its narrow-screen block, to `112px`, so the settings do not cover the toolbar (their final place comes in T024 and T025)
- [X] T008 [P] Raise the smallest height (research R7; contracts/settings-storage.md). In `src/styles/_tokens.scss` set `--wt-panel-min-height: 484px` and keep the comment true ("the lowest panel that still shows one table row under the header of two rows"). In `src/domain/settings.ts` set `MIN_PANEL_HEIGHT = 484`, and in `readSettings` read `panelHeight` through a small function: a value that passes `isValidPanelHeight` is kept; an integer from 440 to 483 (a constant `LEGACY_MIN_PANEL_HEIGHT = 440`, with a comment that names 004 FR-008) is read as `MIN_PANEL_HEIGHT`; anything else is the default `null`. Nothing is written by the read. T003 and T004 pass
- [X] T009 Run `vp check`, `vp test run`, and `vp run test:e2e`. All pass. If a browser test still fails because it expects a button at its old place or a height of 440, adapt that expectation and name the test in the commit message. Search `tests/` and `scripts/` for `wt-header__actions`: no match may remain

**Checkpoint**: `vp run check` passes. The header has two rows; the six buttons do what they did; the lowest panel is 484 px high.

---

## Phase 3: User Story 1 - Return to the start view with one press (Priority: P1) 🎯 MVP

**Goal**: "Resetuj" in the toolbar brings the open panel back to today for the signed-in user with no steps for "Cofnij" and "Ponów", without hiding the panel and without touching the stored settings. It is disabled on the start view.

**Independent Test**: On the stand-in page open the panel, press "Miesiąc", save another person in the settings, and press "Resetuj": the panel stays open and shows "Piątek 06-11-2026" for the signed-in user; "Cofnij", "Ponów", and "Resetuj" are disabled; the launcher shows "Dziś:" (quickstart V10 to V23).

### Tests for User Story 1 ⚠️

> Write these first and see them fail.

- [X] T010 [P] [US1] Add to `tests/unit/i18n.test.ts` the test "contain every text of spec 004 (FR-021)": read `specs/004-reset-button-toolbar/contracts/ui.md`, take the table under the heading `## Texts` up to the next `## ` heading, collect every text in backticks of its second column as the tests of 002 and 003 do, expect exactly `['Resetuj']`, and expect it to stand in `src/i18n/pl.ts` between single quotes
- [X] T011 [P] [US1] Extend `tests/ui/header.test.ts` for the button (contracts/ui.md, "Markup" and "Behaviour"). `build()` gains `onReset: vi.fn()`. Change the expectations of T002 that list the toolbar: `.wt-header__tools button` gives `['Cofnij', 'Ponów', 'Odśwież', 'Resetuj', 'Ustawienia']`, and the reading order of all buttons has "Resetuj" between "Odśwież" and "Ustawienia" (FR-004). New tests: (1) "has a reset button with a sign and a label": the button whose `textContent` is `Resetuj` has the classes `wt-button` and `wt-button--reset`, not `wt-button--icon`; it holds one `svg.wt-icon` and one `span` with the text; it has no `aria-label`; its `title` is `Resetuj`; its `type` is `button` (FR-009). (2) "is switched off until there is something to reset": it is `disabled` at first; a click does not call `onReset`; after `header.setResettable(true)` it is enabled and a click calls `onReset` once; after `setResettable(false)` it is disabled again (FR-015). (3) "hands the focus to refresh when it is switched off under it": with the header in `document.body`, `setResettable(true)`, focus on "Resetuj", then `setResettable(false)`: `document.activeElement` is the button "Odśwież"; the same with `header.setBusy(true)` before (FR-018). (4) "leaves the focus alone when it is elsewhere": with the focus on "Zamknij", `setResettable(false)` leaves it there. (5) `setResettable(true)` on an enabled button and `setResettable(false)` on a disabled one change nothing and move no focus
- [X] T012 [P] [US1] Create `tests/ui/app-reset.test.ts` with the helpers of `tests/ui/app.test.ts` (`manualTimers`, `memoryStorage`, `held`, `mountOpen`, `button`, `byLabel`) and of `tests/ui/app-person.test.ts` (`routes()` with the search of people, `saveOther`, `saveCurrent`, `authors`); a helper `reset = (root) => button(root, 'Resetuj')`. Describe "the state of Resetuj (004 FR-015)": (a) disabled after `mountOpen` on a new page; (b) enabled at once after a click on the preset "Miesiąc", while its search is still held, and still enabled when it has loaded; (c) enabled after another person is saved while the period is today; (d) on today for the signed-in user after "Tydzień" and "Cofnij" ("Ponów" enabled): enabled; (e) today chosen by hand after another period ("Cofnij" enabled): enabled; (f) the whole current day typed into the fields on the start view: disabled; (g) disabled while the first load of today is held, and disabled after that load failed; (h) another person on today with no steps, then "Obecny użytkownik" saved: disabled again; (i) minimised on "Miesiąc" and opened again: enabled; (j) the clock moved one day on (`clock.now += DAY`) and "Odśwież" pressed: enabled (the period on screen is yesterday); (k) the clock moved one day on and the automatic refresh fired: disabled (the view followed the calendar). Describe "Resetuj (004)": (1) from "Miesiąc": the panel is not hidden, the title starts with `Piątek 06-11-2026`, the preset "Dzień" is pressed, one search for today was sent after the press, "Cofnij", "Ponów", and "Resetuj" are disabled (FR-010, FR-011, SC-002); (2) from another person: in the same task as the click the name line shows `Jan Kowalski`, `tbody tr` has no row, and the launcher has no name and shows the pending total for `Dziś:`; the next search has the author of the signed-in user (FR-012, FR-014, SC-004); (3) from "Miesiąc" for the signed-in user the launcher shows `Dziś:` with the pending sign at once and the total after the load; from the state of (d) the launcher's text is the same directly after the click as before it and never shows the pending sign (FR-014); (4) the stored text under `SETTINGS_KEY` is byte for byte the same before and after a reset from a state with the light theme, 10 minutes, a panel height of 600, a width of 900, a moved launcher, and a remembered person; `root` keeps `data-theme="light"` (FR-013, SC-003); (5) the table sorted by "Suma" keeps `aria-sort` on that column after a reset (FR-013); (6) with the settings open and the interval field changed, a reset closes them (`.wt-popover` hidden, `aria-expanded="false"` on the gear) and the stored interval is the old one; with a held check of a person running in the settings, the reset closes them, and the released answer changes nothing; with the export menu open, the reset closes it (FR-016); (7) a reset while the search of "Rok" is held: the released answer of the year is never shown, the title stays today's, and the rows are today's (FR-015); (8) with the gateway failing after the press: the error text and the button "Spróbuj ponownie", the name of the signed-in user, "Resetuj" disabled; a click on "Spróbuj ponownie" with the gateway working again shows today's rows (FR-019); (9) with the header in the document and the focus on "Resetuj", a click moves the focus to "Odśwież" and the panel is still open (FR-018, SC-012); (10) the automatic refresh is scheduled again after the load, with the stored interval (the delay of the pending timer equals `refreshMinutes × 60 000`) (FR-015); (11) `app.reset()` on a hidden panel does nothing: no request, the launcher unchanged; (12) "forgets exactly what the close button forgets (FR-011)": two mounts brought to the same state (another person, "Miesiąc", two steps); one is closed and opened again, the other is reset; afterwards the title, the name line, the pressed preset, the disabled state of "Cofnij" and "Ponów", the launcher's text, the stored settings, and `aria-sort` are equal in both; (13) after a reset the close button and a new opening give the start view again (FR-020)
- [X] T013 [P] [US1] Create `tests/e2e/reset.spec.ts` (quickstart V10 to V23), for the projects `phone` and `desktop`, with a local `reset = (page) => page.getByRole('button', { name: 'Resetuj' })`: V10 "Resetuj" is disabled on a new panel; V11 after "Miesiąc" with `delay: 400` it is enabled before the rows change; V12 a press: the panel is visible, `.wt-title` starts with `Piątek 06-11-2026`, "Cofnij", "Ponów", "Resetuj" are disabled, the launcher has the text `Dziś: 10h 10m`; V13 another person saved with the steps `tests/e2e/person.spec.ts` uses, then "Resetuj": the name line is `Jan Kowalski`, the launcher has no name; V14 "Tydzień" then "Cofnij": "Resetuj" enabled, and after a press "Ponów" is disabled; V15 light theme, interval 10, then "Miesiąc" and "Resetuj": `localStorage.getItem('worktime.settings.v1')` is the same text before and after, also after `page.reload()`; V17 keyboard: focus "Resetuj", press Enter, "Odśwież" is focused, one press of Tab focuses "Ustawienia" (SC-012); V18 `delay: 600`: "Rok" then "Resetuj" at once: the title never shows a range of the year afterwards and the rows are today's; SC-005: the number of entries of `window.__jiraRequests` that start with `/rest/api/3/search` after a reset from "Miesiąc" equals the number after the first opening of the panel on a new page; V19 the settings open with a changed interval, then a press on "Resetuj": `.wt-popover` is hidden and the stored interval is unchanged; V20 the "Eksport" menu open, then "Resetuj": the menu is hidden; V21 `window.__jiraDown = true` on "Miesiąc", then "Resetuj": the error text and "Spróbuj ponownie", "Resetuj" disabled; V22 after a reset "Zamknij" and the launcher give the start view; V23 three quick clicks: one more search request than before, not three. On `desktop` also: "Resetuj" shows its label (the `span` is visible) and has the opacity `0.4` and the cursor `default` while disabled, as "Cofnij" has

### Implementation for User Story 1

- [X] T014 [US1] Add `reset: 'Resetuj'` to `src/i18n/pl.ts`, after `refresh`; extend the comment at the top of the file with "and for the reset button by specs/004-reset-button-toolbar/contracts/ui.md"; T010 passes
- [X] T015 [P] [US1] Add the icon outline `home` to `ICON_PATHS` in `src/ui/dom.ts` (research R8; FR-009), on the 24 × 24 grid, three paths with no arrow and no curve: the roof `M3 11.5 12 4l9 7.5`, the walls `M5.5 9.5V20h13V9.5`, the door `M10 20v-6h4v6`; a comment says it is the sign of the start view
- [X] T016 [US1] Add the button to `src/ui/header.ts` (contracts/ui.md, "Markup" and "Interfaces between the parts"): `HeaderOptions.onReset(): void` with the comment "Back to the start view; the panel stays open (004 FR-010)", placed after `onRefresh`; `resetButton` is `button.wt-button.wt-button--reset` with `type="button"` and `disabled`, the children `icon('home')` and `el('span', { text: pl.reset })`, `title = pl.reset`, and a click handler that calls `options.onReset()`; it stands in `wt-header__tools` between `refreshButton` and `settingsButton`. `Header.setResettable(can: boolean): void`: when `can` is false and the button is the active element of its root (the test `setHistory` already uses), call `refreshButton.focus()` first; then set `resetButton.disabled = !can`. Document the method as in the contract. T011 passes
- [X] T017 [P] [US1] In `src/styles/_base.scss` give the disabled reset button the look of the history buttons (FR-015; contracts/ui.md, "Look"): the rule `&--history:disabled { cursor: default; opacity: 0.4; }` also matches `&--reset:disabled`; the comment says "Back, forward, and reset: switched off when there is nothing to do, not because of a load"
- [X] T018 [US1] Add the rule to `src/ui/controller.ts` (data-model.md, "Resettable"; research R2): a private `canReset(): boolean` that returns true when the dates of `this.period` differ from those of `presetPeriod('today', session.timeZone, this.now())` (use the module's `samePeriod`), or `this.person.accountId !== session.accountId`, or `this.history.length > 1`; call `this.options.header.setResettable(this.canReset())` at the end of `showHistory()` and in `load()` directly after the state is set to `'loading'`; a comment on the method names 004 FR-015 and says the dates are compared, not the name of the preset, because after midnight a period can still be called today. Search `tests/` for `new Controller(` and for objects that stand in for a `Header`: give each a `setResettable`
- [X] T019 [US1] Add the reset to `src/ui/app.ts` (data-model.md, "Transition: reset"; research R3). (1) Move the part of `close()` that forgets the person into a function `forgetPerson(): boolean` that returns whether another person was shown: it sets `choice` to the signed-in user and, when another person was shown, calls `controller().reset(self)`, `showPerson()`, and `launcher.showPending(presetPeriod('today', session.timeZone, now()))`; `close()` calls it after `minimise()` and keeps its behaviour exactly (the existing tests of `close` must pass unchanged). (2) Add `function reset(): void`: return when the panel is hidden; `popover.cancel()`; `table.closeMenu()`; work out today's period and whether the period on screen has other dates; `const wasOther = forgetPerson()`; when the person did not change but the dates did, `launcher.showPending(today)` (when neither changed the launcher keeps its total, FR-014); `void controller().start()`. (3) Wire `onReset: () => reset()` in `createHeader`. (4) Add `reset(): void` to the interface `App` with the comment of the contract and return it from `mountApp`. For the comparison of dates export `samePeriod` from `src/ui/controller.ts`, or move it to `src/domain/period.ts` and import it in both files. T012 passes
- [X] T020 [US1] Update the tests that count the toolbar from Phase 2: in `tests/e2e/layout.spec.ts`, "every header button is whole inside the panel…" expects 5 buttons in `.wt-header__tools`; run `vp check`, `vp test run`, and `vp run test:e2e`; T010 to T013 and every earlier test pass

**Checkpoint**: User Story 1 works by itself: quickstart V10 to V23 on the stand-in page.

---

## Phase 4: User Story 2 - Header in two rows (Priority: P2)

**Goal**: The header meets the layout requirements exactly on a wide screen: the window buttons fixed at the top right for every title, the toolbar centred, the keyboard in reading order, and the settings directly under the toolbar, centred, inside the panel, following the header.

**Independent Test**: At 1280 px open the panel: two buttons in the first row at the right, five in the second row in the middle, the period box under them; "Rok" does not move the window buttons; "Ustawienia" opens the settings under the toolbar (quickstart V1, V3 to V6, V8, V9).

### Tests for User Story 2 ⚠️

> Write these first and see them fail.

- [X] T021 [P] [US2] Add to `tests/ui/app-reset.test.ts`, or to a new describe "the place of the settings (004 FR-005)" in `tests/ui/app.test.ts`: the test page has no layout, so make the header measurable with `Object.defineProperty(header, 'offsetHeight', { value: 120, configurable: true })` on `root.querySelector('.wt-header')`. (1) After a click on "Ustawienia" the panel element has `--wt-popover-top` equal to `120px` in its style; (2) with the settings open, change the value to 150, dispatch `resize` on the window: `150px`; (3) with the settings open, change the value to 170 and let an automatic refresh finish: `170px`; the same after a load that failed; (4) with the settings closed, a resize and a finished load do not set the property; (5) with an `offsetHeight` of 0 (no layout) the property is not set, so the default of the stylesheet stays
- [X] T022 [P] [US2] Add browser tests to `tests/e2e/layout.spec.ts`, skipped on `phone` unless stated (contracts/ui.md, "Layout" and "The settings"): (1) "the header has two rows (004 FR-001 to FR-004)": 2 buttons in `.wt-header__window`, 5 in `.wt-header__tools`, the names in the order "Cofnij", "Ponów", "Odśwież", "Resetuj", "Ustawienia"; the toolbar's top is at or below the bottom of the title row; `.wt-period` is the next element sibling of `.wt-header` (or of the settings element that stands between them in the markup) and its top is at or below the toolbar's bottom; run on `phone` as well; (2) "the window buttons stand at the top right corner for every title (FR-003, SC-008)": the right edge of "Zamknij" is 20 px from the panel's inner right edge and its top 16 px from the panel's inner top (within 1.5 px); the boxes of "Minimalizuj" and "Zamknij" are equal for "Dzień", after "Rok", and with `scenario: 'long-name'` at the same viewport; (3) "the toolbar is centred with 8 px between its buttons (FR-004)": the middle of the five buttons taken together is within 1 px of the middle of `.wt-header`; every gap between neighbours is 8 px (within 0.5 px); (4) "the settings open directly under the toolbar and stay inside the panel (FR-005, SC-013)": after a click on "Ustawienia" the top of `.wt-popover` is at or below the bottom of every header button, its middle is within 1 px of the panel's middle, and its box is inside the panel's box; repeat with `scenario: 'long-name'` after "Rok", in the lowest and narrowest panel (stored `panelHeight: 484`, `panelWidth: 640`) and in a large one (`panelHeight: 900`, `panelWidth: 1200`, viewport 1920 × 1080); (5) "the settings follow the header (FR-005)": with the settings open, `page.setViewportSize` to a width of 700 px: the top of `.wt-popover` is still at or below the bottom of the toolbar; (6) "the lowest panel shows one row under the higher header (FR-008, SC-014)": with a stored `panelHeight: 440` in a viewport 1280 × 1000 the panel is 484 px high, the header, `.wt-period`, the first `tbody tr`, and `.wt-footer` are inside the panel's box, and the panel's `scrollHeight` equals its `clientHeight`; (7) "both themes (FR-022)": in the dark and in the light theme the background and the border colour of "Resetuj" (enabled) equal those of "Odśwież", and the two rows keep the places of test (1)
- [X] T023 [P] [US2] Add to `tests/e2e/a11y.spec.ts` the test "the header is walked in reading order (004 FR-006, SC-010)", for `desktop` and `phone`: after `openPanel` the focus is on "Zamknij"; Shift and Tab moves it to "Minimalizuj"; from "Zamknij", Tab reaches "Odśwież" (the two history buttons and "Resetuj" are disabled on a new panel and are skipped), then "Ustawienia", then the first control of the period box; after "Miesiąc" (all three enabled except "Ponów"), Tab from "Zamknij" goes "Cofnij", "Odśwież", "Resetuj", "Ustawienia"; every focused button shows the focus ring (the check the existing test "every control is reachable by keyboard and shows a focus ring" uses); "Resetuj" while disabled is exposed as disabled (`toBeDisabled()`), like "Cofnij". Check that the existing test "every control is reachable by keyboard and shows a focus ring" still counts the right number of controls and adapt its expected number if it lists the header

### Implementation for User Story 2

- [X] T024 [US2] Place the settings from the header in `src/ui/app.ts` (research R6; contracts/ui.md, "The settings"): a function `placeSettings(): void` that reads `header.element.offsetHeight` and, when it is greater than 0, sets `--wt-popover-top` to that number of pixels on the panel element through `style.setProperty`; call it in `onSettings` before `popover.toggle()`; call it when the settings are open (`popover.isOpen()`) in the existing window `resize` handler and in the controller's `onLoaded` and `onFailed` callbacks; a comment names 004 FR-005 and says the header's height changes with a title that wraps. T021 passes
- [X] T025 [US2] Centre the settings in `src/styles/app.scss` (contracts/ui.md, "The settings"): in `.wt-popover`, for windows wider than the narrow breakpoint, replace `right: var(--wt-space-4)` by `right: 0; left: 0; margin-inline: auto` with the width it has today; the narrow-screen block keeps `right` and `left` of `var(--wt-space-2)`, `width: auto`, and resets the margin; `top` stays `var(--wt-popover-top)` and the greatest height stays `calc(100cqh - var(--wt-popover-top) - var(--wt-space-2))`; update the comment to say the settings stand under the toolbar and the top comes from script. Fix in the header rules whatever T022 (2) and (3) show (the alignment of the window buttons to the top, the gap, the centring)
- [X] T026 [US2] Run `vp check`, `vp test run`, and `vp run test:e2e`; T021 to T023 and every earlier test pass, including the tests of the settings in `tests/e2e/layout.spec.ts`, `tests/e2e/person.spec.ts`, and `tests/e2e/a11y.spec.ts` that open the settings at their new place

**Checkpoint**: User Stories 1 and 2 work: quickstart V1, V3 to V9 at 1280 px.

---

## Phase 5: User Story 3 - The header on a phone (Priority: P3)

**Goal**: In a window 600 px wide or narrower the same two rows hold: the title and the two window buttons in the first, the five toolbar buttons centred in the second, each 44 × 44 px, none cut off; "Odśwież" and "Resetuj" show their sign only.

**Independent Test**: In a window 320 px wide with touch input open the panel: all seven header buttons are wholly visible, each at least 44 × 44 px, and each one works (quickstart V2, V5).

### Tests for User Story 3 ⚠️

> Write these first and see them fail.

- [X] T027 [P] [US3] Add browser tests to `tests/e2e/layout.spec.ts` for the project `phone` (320 × 640, touch): (1) "the header on a phone (004 FR-007)": the title and the two window buttons share the first row (the top of "Zamknij" equals the top of `.wt-header__bar` within 1 px; its right edge is 12 px from the panel's inner right edge, its top 12 px from the inner top); the five toolbar buttons share one top below the title row, are 8 px apart, 252 px wide together, and centred in the header within 1 px; all seven are inside the panel's box; the page does not scroll sideways (`expectInsideWindow`); (2) "the labels give way to the signs (FR-007)": the `span` of "Odśwież" and of "Resetuj" is 1 px wide, and `getByRole('button', { name: 'Resetuj' })` and `{ name: 'Odśwież' }` each find one button; (3) "a title of three lines moves the toolbar down, not the window buttons (FR-003)": with `scenario: 'long-name'` after "Rok" the boxes of "Minimalizuj" and "Zamknij" equal those for "Dzień"; the title is higher than one line and does not overlap the window buttons (`title.x + title.width <= minimise.x`); the toolbar's top is at or below the title's bottom; (4) "the settings on a phone (FR-005, SC-013)": in the state of (3) a click on "Ustawienia" opens `.wt-popover` with its top at or below the bottom of the toolbar, 8 px from the panel's sides, inside the panel's box. For every project, with `page.setViewportSize`: (5) "two and five at every width (SC-006)": at widths of 320, 600, 1280, and 1920 px (height 900), in the dark and in the light theme, 2 visible buttons in the first row and 5 in the second, all inside the panel
- [X] T028 [P] [US3] Extend `tests/e2e/a11y.spec.ts`: in "touch targets are at least 44 × 44 on a phone" make sure all seven header buttons are measured, with "Resetuj" enabled (press "Miesiąc" first) and disabled; add that no two neighbouring header buttons overlap (the right edge of one is at or left of the left edge of the next in its row) (FR-007, SC-007). Add a test for a wide window with touch (`test.use({ hasTouch: true })`, viewport 1280 × 800, or a `pointer: coarse` emulation as the file already does it): the seven buttons are at least 44 px high and "Odśwież" and "Resetuj" show their labels (FR-007)

### Implementation for User Story 3

- [X] T029 [US3] Fix in `src/styles/app.scss` whatever T027 and T028 show: the narrow-screen rule that hides the label must match every button of `.wt-header__tools` that is not `wt-button--icon` ("Odśwież" and "Resetuj") and remove its padding; the toolbar keeps `gap: var(--wt-space-2)` and `justify-content: center` and does not wrap; `.wt-header__bar` keeps the window buttons at the top with `flex: none`; the title wraps (`overflow-wrap: anywhere`, as today) inside `.wt-header__text`. No new token and no new breakpoint
- [X] T030 [US3] Run `vp check`, `vp test run`, and `vp run test:e2e`; T027, T028, and every earlier test pass on `phone`, `desktop`, and `wide`

**Checkpoint**: All three stories work: quickstart V1 to V23.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: The built extension, the documents, the version, and the gates of the constitution.

- [X] T031 [P] Extend `tests/e2e/extension.spec.ts` (the built extension, project `extension`): in the test that ends with "Only the close button goes back to today", before the close: on the selected other period "Resetuj" is enabled; a click leaves the panel visible, the launcher shows `Dziś:` with today's total, the preset "Dzień" is pressed, and "Resetuj" is disabled; `.wt-header__window button` has count 2 and `.wt-header__tools button` has count 5; change the comment to "The close button and the reset button go back to today"
- [X] T032 [P] Update `README.md`: in the feature list describe the header in two rows and add "Reset": "Resetuj" returns to today for the signed-in user and forgets the steps of "Cofnij" and "Ponów", with the panel open and the settings untouched; say that "Cofnij" and "Ponów" stand in the toolbar with "Odśwież", "Resetuj", and the settings; change every mention of the lowest panel from 440 px to 484 px, if any. Update `BrowserInstallation.md` only if it lists the header buttons
- [X] T033 [P] Record the changes in the earlier specs (spec.md of 004, the list at its top). In `specs/001-worktime-panel/spec.md` add an amendment note dated 2026-11-14 in the style of the existing ones: the header has two rows (004 FR-001 to FR-008); "Minimalizuj" stands directly before the close button, in the title row (FR-086); "Resetuj" forgets the steps as the close button does (FR-082); the smallest height is 484 px (FR-059, and the number in FR-075). In `specs/001-worktime-panel/contracts/ui.md` replace item 1 of "Panel layout, top to bottom" by a line that points to `specs/004-reset-button-toolbar/contracts/ui.md`, add the row "Reset button (label, accessible name, tooltip) | `Resetuj`" to the texts table, and change 440 px to 484 px in the paragraph about the panel's size. In `specs/001-worktime-panel/contracts/settings-storage.md` change the valid range of `panelHeight` to "484 to 4000 (px); 440 to 483 is read as 484 (004 FR-008)". In `specs/002-other-user-worktime/spec.md` add the row `| P | "Resetuj" | signed-in user | with the return to today; the panel stays open; 004 FR-010, FR-012 |` to the table of FR-049 and a half sentence to FR-028 that the choice also ends with "Resetuj". Run `vp test run`: `tests/unit/i18n.test.ts` reads the texts table of the UI contract of 001 and must still pass
- [X] T034 Set the version to `0.5.0` in `package.json`, `package-lock.json` (both places of the root package), and `extension/manifest.json`
- [X] T035 Check `scripts/screenshots.ts` for selectors or clicks that depend on the old header (it clicks "Ustawienia" by name, which still works), then run `vp run screenshots` and look at every picture in `docs/screenshots/`: each shows the header in two rows, and `settings.png` shows the settings under the toolbar, inside the panel
- [X] T036 [P] Review `src/ui/header.ts`, `src/ui/controller.ts`, and `src/ui/app.ts` once more against `specs/004-reset-button-toolbar/contracts/ui.md` ("Interfaces between the parts") and the comments at the top of each file: the comments name the two rows and the reset with their requirement numbers; no dead code of the single row remains; no Polish letter outside `src/i18n/pl.ts`
- [X] T037 Walk through quickstart V1 to V23 on the stand-in page (`vp dev --mode demo`) at 1280 px and at 320 px with touch emulation, in both themes; every row of the two tables that no automated test covers is checked by hand, and anything that differs from the expected column is fixed with a test that fails without the fix
- [X] T038 Run `vp run check` (format, lint, types, unit and UI tests, both builds with the size check, browser tests). All pass
- [X] T039 Record the measured sizes of T038 in `specs/004-reset-button-toolbar/plan.md` (Constitution Check, Principle I: the core before and after, the growth) and in the "Size" section of `specs/004-reset-button-toolbar/quickstart.md`; the growth of the core is expected to be under 1 kB gzipped; if it is more, say why in the plan
- [X] T040 Re-read the Constitution Check of `specs/004-reset-button-toolbar/plan.md` against the finished code and tick the gates of the constitution: tests (1), size (2), no new dependency (3), the changed screen verified at a phone and a desktop width in both themes (4), code health (6); note the result in the plan
- [X] T041 Compare the sizes of T038 with those noted in T001 and confirm that `dist/extension` holds no new file besides the ones of version 0.4.0 (the manifest's version aside)
- [ ] T042 MANUAL: check X15 of the quickstart. Install the built extension in a clean browser profile, open a Jira Cloud site while signed in, open the panel, go to another period, choose another person, press "Resetuj": today for the signed-in user with the panel open; the header has two rows; nothing of Jira's page has moved (constitution, gate 5)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: after Setup. Blocks every user story: all of them build on the two groups of the header, and the browser tests need the lowest height that fits the higher header.
- **User Story 1 (Phase 3)**: after Foundational.
- **User Story 2 (Phase 4)**: after Foundational. Its tests count five toolbar buttons and compare "Resetuj" with "Odśwież", so they are written against the header of User Story 1; do Phase 3 first.
- **User Story 3 (Phase 5)**: after User Stories 1 and 2: it measures the seven buttons and the settings at their final place.
- **Polish (Phase 6)**: after all three stories.

### User Story Dependencies

- **US1 (P1)**: starts after Phase 2. Delivers the button, its state, the reset, and the focus. It touches `header.ts`, `controller.ts`, `app.ts`, `dom.ts`, `pl.ts`, `_base.scss`.
- **US2 (P2)**: needs the button of US1 in the toolbar for its counts. Its code touches `app.ts` (one function, three calls) and `app.scss` (the settings); it shares `app.ts` with T019 of US1: do T019 before T024.
- **US3 (P3)**: needs US1 and US2. Its code touches `app.scss` only.

### Within Each User Story

- Tests are written and seen to fail before the code they test.
- US1: the text (T014) and the icon (T015) before the button (T016); the button before the controller's rule (T018), which calls its method; the rule before the reset in the application (T019).
- US2: the script (T024) and the stylesheet (T025) are independent of each other; the browser tests need both.
- Browser tests are run last in each phase: they need `vp build --mode demo`.

### Parallel Opportunities

- Phase 2: T002, T003, T004, and T005 together (four files); then T008 beside T006 and T007.
- Phase 3: T010, T011, T012, and T013 together (four files); then T015 and T017 beside T014; T016, T018, T019 in this order.
- Phase 4: T021, T022, and T023 together, unless T021 goes into `tests/ui/app-reset.test.ts` while T012 is still open; then T024 and T025 together.
- Phase 5: T027 and T028 together.
- Phase 6: T031, T032, T033, and T036 together.

---

## Parallel Example: User Story 1

```text
# Write the failing tests of User Story 1 together (different files):
Task: "T010 the text of spec 004 in tests/unit/i18n.test.ts"
Task: "T011 the reset button in tests/ui/header.test.ts"
Task: "T012 the state rule and the reset in tests/ui/app-reset.test.ts"
Task: "T013 the reset in the browser in tests/e2e/reset.spec.ts"

# Then the independent pieces together:
Task: "T015 the icon outline home in src/ui/dom.ts"
Task: "T017 the disabled look in src/styles/_base.scss"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 and Phase 2: a green start and the header in two rows with the six buttons of today.
2. Phase 3: "Resetuj".
3. Stop and validate: quickstart V10 to V23. The layout is usable but not final: the settings stand under the toolbar at a fixed place, at the right.

### Incremental Delivery

1. Setup + Foundational → the panel behaves as before; the header has two rows; the lowest panel is 484 px.
2. User Story 1 → the reset can be shown. First state that could be released on a wide screen.
3. User Story 2 → the exact layout and the settings under the toolbar, for every title.
4. User Story 3 → the phone. Release.
5. Polish → the built extension, the documents, version 0.5.0, the gates of the constitution, and X15.

### Parallel Team Strategy

One developer is enough: the feature touches few files, and most tasks meet in `src/ui/header.ts`, `src/ui/app.ts`, or `src/styles/app.scss`. With two, one writes the test tasks of a phase while the other writes the code of the phase before.

---

## Notes

- [P] tasks touch different files and do not wait for an unfinished task.
- Every task names the requirement it serves; when a task and the spec differ, the spec wins.
- Commit after each task or each small group of tasks; `vp test run` must be green at every checkpoint.
- Stop at any checkpoint to validate the story by itself.
- T042 is open until a person with a real Jira Cloud site has done it.
- The sign of "Resetuj" is one entry in `src/ui/dom.ts` (T015): another sign is a change of that entry and of FR-009.

---

## Phase 7: Changes after the first implementation (2026-11-14)

**Purpose**: Four changes the requester asked for after seeing the built plugin on a real Jira site (spec, Clarifications, second session; FR-023, FR-024; research R10 to R12). They touch User Story 2 and User Story 3.

- [X] T043 [US2] Tests first: in `tests/ui/header.test.ts` the header has three children (`wt-header__bar`, `wt-header__text`, `wt-header__tools`), the bar holds `p.wt-app` and `wt-header__window`, and `p.wt-app` has the text `Jira Custom Tempo - ` with the version of `package.json`, stands before the heading, and is not a part of it (FR-023); new `tests/unit/version.test.ts`: the versions of `package.json`, `package-lock.json`, and `extension/manifest.json` are equal, and `__APP_VERSION__` is that version
- [X] T044 [US2] Put the version into the build: `define: { __APP_VERSION__: ... }` in `vite.config.ts` from the `version` of `package.json`; `declare const __APP_VERSION__: string` in `src/types.d.ts`
- [X] T045 [US2] In `src/ui/header.ts` add the constant `APP_NAME` and the paragraph `p.wt-app` at the left of the bar, and move `wt-header__text` out of the bar into a row of its own between the bar and the toolbar (FR-001, FR-002); `src/ui/app.ts` uses `APP_NAME` for the accessible name of the panel
- [X] T046 [US2] In `src/styles/app.scss`: `.wt-app` (the small text size, the muted colour, slanted, one line, cut with an ellipsis); the bar centres its two parts on one line; `.wt-header__tools` gets a margin above it and `.wt-progress` a margin above and below (FR-023, FR-024; first `2em` and `1em`, then the shared spacings, see T052); the default of `--wt-popover-top` becomes 176 px and, on a narrow screen, 192 px
- [X] T047 [US2] Measure in the browser what the lowest panel needs now, in the view of a day and in the views with the chart, and set the smallest height to it: 592 px in `src/styles/_tokens.scss` and `MIN_PANEL_HEIGHT` in `src/domain/settings.ts`; a stored height from 440 to 591 is read as 592 (FR-008; research R12)
- [X] T048 [US2] Adapt the tests to the smallest height of 592 px: `tests/unit/settings.test.ts` (440, 484, and 591 read as 592; 592 kept; 439 invalid; the stored heights of the other cases above the minimum), `tests/ui/app.test.ts`, `tests/ui/app-person.test.ts`, and `tests/ui/app-reset.test.ts` (stored heights of 800 in place of 600); `tests/e2e/layout.spec.ts` (the two tests that drag the edges run in a window 1400 px high: 700, 900, 592, 792; the lowest panel of the export test is 592)
- [X] T049 [US2] [US3] Rewrite the tests of the rows in `tests/e2e/header.spec.ts` for 320 px and 1280 px: the bar with the name of the plugin on the line of the window buttons, the title below it on the whole width, the toolbar, the period box; the name of the plugin with its version, slanted, 13 px, with a contrast of at least 4.5 to 1 in both themes, on one line (FR-023, SC-015); the toolbar 40 px below the title and the part with the bar or the chart 16 px from its neighbours (FR-024, SC-016); the window buttons at the same place for every title, with the title and the name below them (FR-003); the lowest panel of 592 px (SC-014)
- [X] T052 [US2] The requester said the two margins need not be in em and should agree with the rest of the panel: `margin-block-start: calc(var(--wt-space-4) * 2)` (32 px) on `.wt-header__tools` and `margin-block: var(--wt-space-4)` (16 px) on `.wt-progress` in `src/styles/app.scss`; measure again and set the smallest height to 592 px (the chart view leaves 46.0 px for a row at 636 px, which is too close); adapt the tests (40 px, 16 px, 592 px, 800 px after the drag) and the documents (FR-022 without an exception, FR-024, SC-016, research R11 and R12)
- [X] T053 [US2] [US3] After a second look the requester moved three things (spec, Clarifications, third session; research R13). Tests first: `tests/ui/header.test.ts` (two children again, the bar holds `wt-header__text` and `wt-header__window`, no `wt-app` in the header); `tests/ui/table.test.ts` and `tests/ui/app.test.ts` (the total row has the parts `wt-app`, `wt-export`, `wt-footer__total`; the text of `p.wt-app`; also for an empty table); `tests/e2e/header.spec.ts` (the title level with the window buttons; the name of the plugin at the bottom left, on the line of the total at 1280 px and on a line below at 320 px; the export button in the middle of the row at 1280 px, at the left at 320 px; the three places kept while there is nothing to export); `tests/e2e/export.spec.ts` (the place of the control)
- [X] T054 [US2] [US3] New module `src/ui/about.ts` with `APP_NAME` and `createAbout()`; `src/ui/header.ts` back to two rows without the name of the plugin; `src/ui/table.ts` builds the total row from `createAbout()`, the export control, and `div.wt-footer__total`; `src/ui/app.ts` takes `APP_NAME` from the new module
- [X] T055 [US2] [US3] In `src/styles/app.scss`: the title row as before (text at the left, window buttons at the top right); `.wt-footer` as a grid of three columns `minmax(0, 1fr) auto minmax(max-content, 1fr)`, two columns at 600 px and narrower with `.wt-app` on a line below; `.wt-export` centred (at the left on a narrow screen); `.wt-app` not bold, at mid-height of the row; the defaults of `--wt-popover-top` 136 px and 144 px (FR-023, FR-025)
- [X] T056 [US2] Measure again and set the smallest height to 592 px (`src/styles/_tokens.scss`, `src/domain/settings.ts`; a stored 440 to 591 is read as 592); adapt the tests (592, and 752 after the drag in a window of 1400 px)
- [X] T057 [US2] The requester asked for a smaller name of the plugin ("for example 10 px"): `.wt-app` uses `var(--wt-text-xs)`, 11 px, the smallest text size the panel has, in `src/styles/app.scss`; the browser test expects 11 px; FR-023, the UI contract, and research R10 say so; the screenshots are retaken; the change is part of the commit of the feature and of the tag `v0.5.0`
- [X] T050 Update the documents: `spec.md` (a second clarification session, Terms, User Stories 2 and 3, FR-001 to FR-003, FR-007, FR-008, FR-022, new FR-023 and FR-024, SC-006, SC-014, new SC-015 and SC-016, Assumptions), `contracts/ui.md`, `contracts/settings-storage.md`, `data-model.md`, `quickstart.md`, `research.md` (R10 to R12), `plan.md` (the change note, D8 to D10), the notes in the specs of 001, and `README.md`; retake `docs/screenshots/`
- [X] T051 Run `vp run check`; record the sizes in `plan.md` and `quickstart.md`

---

## Implementation notes (2026-11-14)

- All tasks are done except T042, which needs a person with a real Jira Cloud site. The
  requester opened the built plugin on a real Jira site on 2026-11-14 and asked for the
  changes of Phase 7; whether "Resetuj" was pressed there, and in a clean browser profile,
  is not recorded, so T042 stays open.
- Phase 7 changes numbers that the tasks of Phases 2 to 5 name: the smallest height is
  592 px where those tasks say 484 px, the toolbar and the progress bar have more room, the
  total row carries the name of the plugin, and the export control stands in its middle.
  Within Phase 7 the name of the plugin first stood in a third row of the header (T043 to
  T049) and then moved to the total row (T053 to T056); T043 to T049 describe the first of
  the two states. The tasks stay as they were done; the spec and the contracts carry the
  state of today.
- `vp run check` passes after Phase 7: 534 unit and UI tests, 324 browser tests (19 skipped on purpose),
  core 25.8 kB of 100 kB (25.2 kB before), whole script 29.5 kB, export code 3.8 kB.
- T022 and T027: the new browser tests of the layout are in a file of their own,
  `tests/e2e/header.spec.ts`, not in `tests/e2e/layout.spec.ts`, which is long already. It
  runs at 320 px with touch and at 1280 px, like the other files. `layout.spec.ts` holds only
  the existing tests that had to be adapted (T005, T020).
- T021 and T024: the property `--wt-popover-top` is set on the element of the settings, not
  on the panel. The stylesheet declares the default on `.wt-popover` itself, and a value on
  the panel would be hidden by it. The tests of T021 are in `tests/ui/app.test.ts`.
- T019: `samePeriod` is exported from `src/ui/controller.ts` and used by `src/ui/app.ts`.
- T029: nothing had to be changed. The rules for the narrow screen were written with the
  skeleton (T007) and passed the tests of T027 and T028 as they were.
- T028: the test of a wide window with touch runs in the `desktop` project with `hasTouch`;
  Chromium reports a coarse pointer for it, so the test is not skipped.
- T032: `BrowserInstallation.md` names the file of the new version (`0.5.0`); it lists no
  header buttons. The README said "about 24 kB" for the whole script; it now says 29 kB.
- T035, T037: the eight pictures of `docs/screenshots/` were retaken and looked at (dark and
  light, 1280 px). The header at 320 px was looked at in two more pictures, with the longest
  name, the longest title, and the settings open. The scenarios V1 to V23 are covered by the
  browser tests, except the look of the pictures themselves.
- SC-014 of the spec was made exact during the implementation: "one table row" is a row of
  one or two lines (at least 46 px under the column headers), as the test of 001 has it. The
  first row of the recorded day has three time entries and is higher than that.
