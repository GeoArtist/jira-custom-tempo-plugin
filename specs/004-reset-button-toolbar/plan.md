# Implementation Plan: Reset Button and Two-Row Header

**Branch**: `004-reset-button-toolbar` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-reset-button-toolbar/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

The header of the worktime panel of [001](../001-worktime-panel/plan.md),
[002](../002-other-user-worktime/plan.md), and [003](../003-table-export/plan.md) has one
row with six buttons. This feature gives it two rows. The first is a title row: the name and
the title at the left, "Minimalizuj" and "Zamknij" at the right. The second is a centred
toolbar: "Cofnij", "Ponów", "Odśwież", the new "Resetuj", "Ustawienia". The period box
follows. "Resetuj" brings the open panel back to the start view (today, the signed-in user,
no steps for "Cofnij" and "Ponów"), which is what the close button forgets, without hiding
the panel and without touching the stored settings. It is disabled while the panel is on
the start view already.

Technical approach (from [research.md](research.md)): the header component builds two groups
in place of one and gains one button and one method, `setResettable`. The controller, which
already tells the header about the steps of "Cofnij" and "Ponów", works out at the same
places whether there is something to reset. The application gains `reset()`, which shares
with `close()` the part that forgets the person and then calls the controller's existing
`start()`. The stylesheet turns the header into a column of two flex rows and centres the
settings under the toolbar; their top is measured from the header when they open. The
smallest height of the panel rises from 440 px to 484 px, by the height of the new row, and
a stored smaller height is read as 484 px. No dependency, no request, no stored field.

**Changed on 2026-11-14, after the first implementation** (spec, Clarifications, second and
third session; [research.md](research.md) R10 to R13). The requester looked at the built
plugin twice. What holds now: the header has two rows, as first planned, and the toolbar
stands 32 px lower than the usual gap. The part with the progress bar or the chart has
16 px of margin above and below; both distances are shared spacings of the panel. The total
row has three parts: the name of the plugin with its version at the left (the bottom left
corner of the panel), the export control of 003 in the middle, and the total at the right;
on a narrow screen the control keeps the left edge and the name takes a line below. The
version comes from `package.json` through `define` in `vite.config.ts`. The smallest height
of the panel is 592 px, not 484 px, and a stored height from 440 to 591 is read as 592.
Between the two looks the name stood in a third row at the top of the header and the
smallest height was 592 px; that state is gone. Where the text below says 484 or 483, read
592 and 591; the contracts and the data model carry the numbers of today.

## Technical Context

**Language/Version**: TypeScript in `strict` mode; SCSS (Dart Sass). No hand-written
JavaScript or CSS sources (constitution).

**Primary Dependencies**: runtime: none, and none added. Development only, unchanged:
`vite-plus`, `sass`, `typescript`, `happy-dom`, `@playwright/test`, `@types/node`, pinned in
`package.json` and the lock file.

**Toolchain (mandatory)**: Vite+, the `vp` command, configured in `vite.config.ts`
(unchanged). Playwright stays for browser tests.

**Storage**: the browser's `localStorage`, key `worktime.settings.v1`, unchanged in shape.
One bound changes: `panelHeight` is valid from 592 (was 440); 440 to 591 is read as 592
([contracts/settings-storage.md](contracts/settings-storage.md)). "Resetuj" writes nothing.

**Testing**: `vp test` (Vitest with `happy-dom`) for the header, the rule of the button's
state, the reset, and the stored height; Playwright (Chromium) on the stand-in Jira page at
320 px with touch and at 1280 px, in both themes, and with the real built extension. No test
needs a live Jira.

**Target Platform**: unchanged: browser extension, Manifest V3, one content script on
`https://*.atlassian.net/*` (not `/wiki/*`); Chrome and Edge; Jira Cloud only. The manifest
changes only its version.

**Project Type**: single front-end project packaged as a browser extension.

**Performance Goals**: after "Resetuj" exactly the requests of one load of today and none
for the view that was left (SC-005): it is the load the panel makes on its first opening. The state of the button is worked out synchronously with the view.

**Constraints**: no new kind of request and no new permission; the core script at most
100 kB gzipped (Principle I; 25.2 kB before this feature); layout from 320 px to 1920 px with
44 px touch targets (Principle III); existing tokens only (Principle IV); nothing on the
Jira page outside the add-on's element is changed.

**Scale/Scope**: one new button, one new icon outline, one new text. Changed: the header,
the controller (one rule), the application (one function), the settings (one bound), the
styles of the header and of the settings, their tests. No new module. 22 functional
requirements.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v3.1.0, before research and again after the design. The result
did not change.

| Principle | How this plan satisfies it | Result |
|-----------|----------------------------|--------|
| I. Minimal Footprint | One button, one icon outline of three short paths, one text, one method, one function, and a few style rules; the rules for six buttons on a narrow screen are removed. Expected growth of the core: under 1 kB gzipped, from 25.2 kB of 100 kB. No asset, no font. The build measures it and fails above the budget, as before. Measured after implementation (2026-11-14): whole script 29.5 kB gzipped (29.1 kB before), core 25.8 kB of 100 kB (25.2 kB before), export code 3.8 kB (unchanged). The core grew by 0.6 kB, the changes of 2026-11-14 (the name with the version, the margins) included. | Pass |
| II. Minimal Dependencies | No dependency added. Layout with flex, the focus with `focus()`, the measure of the header with `offsetHeight`. | Pass |
| III. Responsive on Mobile and Desktop | One header at every width: the same two rows from 320 px to 1920 px. All seven buttons are 44 × 44 px on touch and narrow screens and whole inside the panel (the toolbar needs 252 px of 280 px at 320 px). Nothing depends on hover: the tooltip of "Resetuj" repeats its name, and the label is visible on wide screens. Browser tests at 320 px with touch and at 1280 px. | Pass |
| IV. Modern, Consistent User Interface | Existing tokens only; no new colour, size, or breakpoint. "Resetuj" looks like "Odśwież", and disabled like "Cofnij". Both themes follow from the tokens. Keyboard: every button in reading order, a visible focus ring, and the focus never leaves the panel when "Resetuj" switches off. The load after a reset has the loading, empty, and error states of every load. One number of the tokens changes: the smallest height, 440 px to 484 px. | Pass |
| V. Tested Behavior | Every requirement has a test in the same change ([research.md](research.md) R9): UI tests for the state rule, the reset, and the focus; a unit test for the stored height; browser tests for places, sizes, and the keyboard at a phone and a desktop width. The existing tests of the header and of the layout are adapted, not removed. Jira is faked in all of them. | Pass |
| VI. Install-Only Setup | No setting, no permission, no step by the user. A stored panel height under the new smallest height is read as the smallest, automatically, on the first start after the update. | Pass |

Technical Constraints: TypeScript and SCSS only, Vite+ only (pass); the only request is the
load of today that the plugin already makes, through the documented REST API, read-only
(pass); one isolated element, nothing else on the page changes (pass); no permission and no
new address (pass); settings stay in the browser, one set per browser, defaults without
stored settings (pass); no data sent to a third party (pass); one build command (pass).

**Gate result**: Pass, before research and after design. No violations to justify.

**After implementation (2026-11-14)**: checked again against the finished code. Gate 1,
tests: `vp run check` passes with 534 unit and UI tests and 324 browser tests (19 skipped
on purpose: a test that sets its own window size, or that applies to one of the two widths
only). Gate 2, size: the core is 25.8 kB of 100 kB, with the changes of Phase 7. Gate 3, dependencies: none added. Gate
4, interface: the header is tested at 320 px with touch and at 1280 px, in the dark and in
the light theme (`tests/e2e/header.spec.ts`, `tests/e2e/reset.spec.ts`,
`tests/e2e/a11y.spec.ts`), and the retaken screenshots were looked at. Gate 6, code health:
`vp check` passes. Gate 5, the installation in a clean browser profile on a real Jira Cloud
site (X15), is open: it needs a person.

## Open points

| # | Point | Planned | Reason |
|---|-------|---------|--------|
| D1 | The smallest height of the panel changes (001 FR-059: 440 px). | 484 px; a stored 440 to 483 is read as 484. The spec says so in FR-008. | The header is 42 px higher on wide screens; at 440 px no table row would stay in view ([research.md](research.md) R7). A user who had the lowest panel gets one 44 px higher. |
| D2 | The sign of "Resetuj" is a house, not the usual arrow round against the clock. | Icon `home`. | On a phone the labels are hidden and the arrow would differ from the arrow of "Odśwież" beside it only in direction ([research.md](research.md) R8). The requester may choose another sign; it is one entry in the icon table. |
| D3 | The settings open centred under the toolbar, no longer at the right edge. | Centred across; the top measured from the header at each opening. | The gear stands in the middle of the header now ([research.md](research.md) R6). |
| D4 | The top of the settings is measured at three moments, not observed continuously. | Measured on opening, when the window changes size, and when a load ends. | These are the only moments at which the header changes its height while the settings are open (FR-005; [research.md](research.md) R6). |
| D5 | After midnight "Resetuj" notices the new day at the next load or change of view, not at midnight. | The state is worked out at every change of the view and at the start of every load. | A timer for one disabled button is not worth its code; the spec's edge case allows it. |
| D6 | "Cofnij" does not take a reset back. | As specified (spec, Assumptions). | The close button behaves the same way. |
| D8 | The smallest height is 592 px after the changes of 2026-11-14, 152 px more than before this feature. | As measured ([research.md](research.md) R13). | In a window lower than 1184 px the panel opens at its smallest height; in a window lower than about 690 px it scrolls as a whole. This is the price of the second row and of the two margins the requester asked for. |
| D9 | The two margins were asked for as `2em` and `1em`. | Shared spacings: `calc(var(--wt-space-4) * 2)` (32 px) and `var(--wt-space-4)` (16 px). | The requester said on 2026-11-14 that they need not be in em and should agree with the rest ([research.md](research.md) R11). No exception to FR-022 is left. |
| D10 | The version in the total row is the one of `package.json`, not read from the installed extension. | `define` at build time; a test holds the three version numbers equal. | No extension API in the content script, the stand-in page, or the tests ([research.md](research.md) R10). |
| D11 | On a narrow screen the export control is not in the middle of the total row. | At the left edge, as in 003; the name of the plugin on a line below. | The total reaches past the middle of a row of 280 px ([research.md](research.md) R13). |
| D12 | 003 FR-001 ("at its left edge") is changed by this feature for wide screens. | Noted in the spec of 003 and in the list at the top of the spec of 004. | The requester moved the control (spec, Clarifications, third session). |
| D7 | The class `wt-header__actions` disappears. | `wt-header__window` and `wt-header__tools`. | Tests and screenshots scripts that use the old class are changed in the same change. |

## Risks

| Risk | Effect | Handling |
|------|--------|----------|
| A test or script still selects `.wt-header__actions` | It finds nothing and passes or fails for the wrong reason | Search for the class in `tests/` and `scripts/` as the first task; the header test asserts the class is gone |
| The focus is lost when "Resetuj" is disabled in the same task as the click | The keyboard user lands on the page | The focus moves before `disabled` is set; a UI test and a browser test assert the focused element after Enter |
| The settings stand over the toolbar on a phone when the title wraps | The gear is covered | The top is measured; a browser test opens the settings at 320 px with the longest title and name |
| A stored height of 440 to 483 is rejected in place of raised | The panel jumps to half of the window after the update | A unit test for 440, 483, 484, and 439 |
| The centred toolbar and the labels overflow in a panel of 640 px at a large text size | Buttons leave the header | 334 px of 600 px at the default size; a browser test checks every button inside the panel at 320 px and 1280 px |
| Two reset paths drift apart (`close()` and `reset()`) | "Resetuj" forgets less or more than the close button (FR-011) | One shared function; a UI test holds the state after both against each other |

## Project Structure

### Documentation (this feature)

```text
specs/004-reset-button-toolbar/
├── plan.md                      # This file
├── spec.md                      # Feature specification
├── research.md                  # Decisions R1 to R13
├── data-model.md                # Start view, "resettable", the reset transition, the changed bound
├── quickstart.md                # Commands, validation scenarios V1 to V23, check X15
├── contracts/
│   ├── ui.md                    # Markup, layout, look, behaviour, text, interfaces between the parts
│   └── settings-storage.md      # panelHeight: valid from 592; 440 to 591 read as 592
├── checklists/
│   ├── requirements.md          # Spec quality checklist
│   └── header.md                # Requirements checklist of the header and the reset button, resolved on 2026-11-14
└── tasks.md                     # Created by /speckit-tasks, not by this command
```

### Source Code (repository root)

Only files that are new or change. The layout of 001 to 003 stays.

```text
src/
├── ui/
│   ├── about.ts             # NEW  APP_NAME; createAbout(): p.wt-app with the name and the version
│   ├── header.ts            # CHG  two groups: wt-header__bar (wt-header__text, wt-header__window) and wt-header__tools; the button "Resetuj"; HeaderOptions.onReset; Header.setResettable (focus to "Odśwież" before disabling)
│   ├── table.ts             # CHG  the total row has three parts: createAbout(), the export control, and div.wt-footer__total with the label and the value
│   ├── controller.ts        # CHG  private canReset(); reported with header.setResettable() from showHistory() and at the start of load()
│   ├── app.ts               # CHG  reset(); the part of close() that forgets the person becomes a function both use; onReset wired; --wt-popover-top set from the header when the settings open, on window resize, and when a load ends; App.reset
│   └── dom.ts               # CHG  icon outline "home"
├── domain/
│   └── settings.ts          # CHG  MIN_PANEL_HEIGHT 592; a stored height of 440 to 591 is read as 592
├── i18n/pl.ts               # CHG  reset: "Resetuj"
└── styles/
    ├── _tokens.scss         # CHG  --wt-panel-min-height: 592px
    ├── _base.scss           # CHG  the disabled look of the history buttons also for wt-button--reset
    └── app.scss             # CHG  header: a column of two rows; window buttons at the top right; centred toolbar with a margin of 32 px above it; a margin of 16 px around .wt-progress; the narrow-screen rules for six buttons removed; the total row as a grid of three columns (two on a narrow screen); .wt-app (small, muted, slanted); the export control centred; settings centred, top from --wt-popover-top with new defaults

src/types.d.ts               # CHG  declares __APP_VERSION__
vite.config.ts               # CHG  define: __APP_VERSION__ = the version of package.json
package.json                 # CHG  version 0.5.0 (also package-lock.json)
extension/manifest.json      # CHG  version 0.5.0 only

tests/
├── unit/
│   ├── i18n.test.ts             # CHG  the text of spec 004 (FR-021)
│   ├── version.test.ts          # NEW  the versions of the package, the lock file, and the manifest are equal; __APP_VERSION__ is that version
│   └── settings.test.ts         # CHG  panelHeight: 439 invalid, 440, 484, and 591 read as 592, 592 kept
├── ui/
│   ├── header.test.ts           # CHG  the two groups and their order; no wt-header__actions; "Resetuj": label, tooltip, handler; setResettable; the focus goes to "Odśwież"; the existing cases adapted to the new groups
│   ├── app-reset.test.ts        # NEW  the state rule (each reason alone; at once; during and after a failed load; after midnight); the reset (period, person, steps, launcher, settings and menu closed, running load given up, stored settings unchanged, sort order kept); close() against reset()
│   ├── table.test.ts            # CHG  the three parts of the total row
│   ├── app.test.ts              # CHG  the name of the add-on with the version in the total row; the lowest height is 592; stored heights of the tests above it; cases that read the header's buttons by group
│   └── app-person.test.ts       # CHG  only where it selects header buttons by the old class
└── e2e/
    ├── reset.spec.ts            # NEW  V10 to V23 at 320 px and 1280 px
    ├── header.spec.ts           # NEW  two rows, 2 and 5 buttons, all inside the panel; the two distances; window buttons fixed for a short and the longest title; toolbar centred with 8 px gaps; labels and signs; both themes; four widths; the total row: the name of the plugin at the bottom left, the export control in the middle (at the left on a phone), the total at the right; settings under the toolbar, inside the smallest and the largest panel, following the header; lowest panel 592 px with one row
    ├── layout.spec.ts           # CHG  the existing tests adapted: minimise before close in the title row; heights 592 and 752 in a window of 1400 px; a stored 440 shown as 484; the header buttons in two rows
    ├── a11y.spec.ts             # CHG  keyboard order of FR-006; touch targets of the seven buttons; "Resetuj" announced as unavailable when disabled; focus after Enter on "Resetuj"
    ├── person.spec.ts           # CHG  the place of "Zamknij" with a long name; reset from another person at the phone width
    ├── theme.spec.ts            # CHG  the header in both themes, if it compares the header
    ├── export.spec.ts           # CHG  the control in the middle of the total row at 1280 px, at the left at 320 px
    └── extension.spec.ts        # CHG  the built extension: two rows and one reset

scripts/screenshots.ts       # CHG  only if it selects by the old class
README.md                    # CHG  the two rows and "Resetuj" in the feature list; the lowest height
BrowserInstallation.md       # CHG  one line, if the guide lists the buttons
docs/screenshots/            # CHG  retaken: every picture of the panel shows the header
specs/001-worktime-panel/    # CHG  spec.md: an amendment note (header in two rows, FR-086 place of "Minimalizuj", FR-059 484 px); contracts/ui.md: layout item 1 and the texts table point to 004; contracts/settings-storage.md: the bound of panelHeight
specs/002-other-user-worktime/  # CHG  spec.md: the row "Resetuj" in the table of FR-049
```

**Structure Decision**: the single front-end project of 001, unchanged in shape, with no new
module. The header stays one component with one element; it only groups its buttons
differently. The rule "is there something to reset" lives in the controller, beside the rule
for "Cofnij" and "Ponów", because the controller owns the period, the person of the loads,
and the list of views. The action lives in `src/ui/app.ts`, beside `close()` and
`minimise()`, because the application owns the user's choice of a person, the launcher, the
settings, and the export menu. One new test file holds everything about the reset, so the
large `tests/ui/app.test.ts` does not grow.

## Implementation order

1. The header in two rows (User Story 2): the markup in `header.ts` with "Resetuj" present
   and always disabled, the styles, the settings under the toolbar, the smallest height and
   the stored bound. The existing tests are adapted here; the panel works as before.
2. The reset (User Story 1): the icon and the text, `setResettable` and the focus, the rule
   in the controller, `reset()` in the application with the function shared with `close()`.
3. The phone (User Story 3): browser tests at 320 px with touch; touch targets; the settings
   with the longest title.
4. Documentation, screenshots, version 0.5.0, the notes in the specs of 001 and 002, the
   measured sizes into this plan, check X15.

## Complexity Tracking

No constitution violations. Nothing to justify.
