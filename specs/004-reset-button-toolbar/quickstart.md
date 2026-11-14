# Quickstart: Reset Button and Two-Row Header

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to run and validate the feature. Markup, sizes, and states are in
[contracts/ui.md](contracts/ui.md) and [data-model.md](data-model.md); they are not repeated
here.

## Prerequisites

- Node as in `.node-version`; dependencies installed with `vp install`.
- On Windows, run the commands from a path with an upper-case drive letter (`cd /E/...`),
  or the unit test files are not found.
- For X15: Chrome or Edge and a Jira Cloud site with logged time.

## Commands

| Command | What it does | Expected |
|---------|--------------|----------|
| `vp dev --mode demo` | The stand-in Jira page with the add-on, live, at `http://127.0.0.1:5173/` | The header has two rows; "Resetuj" stands between "Odśwież" and "Ustawienia", disabled; "Jira Custom Tempo - " and the version stand at the bottom left |
| `vp test run` | Unit and UI tests | All pass, including the new cases in `tests/ui/header.test.ts` and `tests/ui/app-reset.test.ts` |
| `vp run build` | Builds the extension and checks the size | The core stays under 100 kB gzipped; expected growth under 1 kB |
| `vp run test:e2e` | Browser tests on the stand-in page and with the built extension | All pass, including `tests/e2e/reset.spec.ts` |
| `vp run check` | The full merge gate | All pass |

## Validation scenarios

On the stand-in page (`vp dev --mode demo`, add `?scenario=…` as in the other specs). The
fake Jira's today is Friday 06-11-2026. "Wide" is a window of 1280 px, "phone" a window of
320 px with touch.

**The header (User Stories 2 and 3)**

| # | Do | Expect | Requirement |
|---|----|--------|-------------|
| V1 | Open the panel, wide | Row 1: the name of the person and the title at the left; "Minimalizuj", "Zamknij" at the right, level with the name. Row 2, 32 px lower than the usual gap: "Cofnij", "Ponów", "Odśwież", "Resetuj", "Ustawienia", together in the middle. Then the period box, and the bar with 16 px more room above and below. Total row: "Jira Custom Tempo - 0.5.0" at the left, small, grey, slanted; "Eksport" in the middle; the total at the right | FR-001, FR-002, FR-004, FR-023, FR-024, FR-025 |
| V2 | Open the panel, phone | The same two rows; in the total row "Eksport" at the left, the total at the right, the name of the plugin on the line below; all seven buttons whole inside the panel, each 44 × 44 px; "Odśwież" and "Resetuj" without a label | FR-007, SC-006, SC-007 |
| V3 | Note the place of "Zamknij"; select "Rok" (a long title); with `?scenario=long-name` as well | "Zamknij" and "Minimalizuj" have not moved; the title wraps or the name is cut inside its room | FR-003, SC-008 |
| V4 | Press Tab from "Zamknij" through the header | "Cofnij" and "Ponów" (when enabled), "Odśwież", "Resetuj" (when enabled), "Ustawienia", then the period box; a visible focus ring on each | FR-006, SC-010 |
| V5 | Press "Ustawienia", wide and phone, also after "Rok" | The settings open under the toolbar and are wholly inside the panel; "Anuluj" closes them | FR-005 |
| V6 | Wide, window 1400 px high: drag the top edge of the panel far down | The panel stops at 592 px; one table row and the total row are in view, also after "Tydzień" (the chart) | FR-008 |
| V7 | Store `panelHeight: 440` by hand in the browser storage, reload, open | The panel is 592 px high; no error | FR-008 |
| V8 | Switch to the light theme in the settings; repeat V1 and V2 | The same layout in the colours of the light theme | FR-022 |
| V9 | Press each of "Cofnij", "Ponów", "Odśwież", "Ustawienia", "Minimalizuj", "Zamknij" | Each does what it did before | FR-020, SC-009 |

**The reset (User Story 1)**

| # | Do | Expect | Requirement |
|---|----|--------|-------------|
| V10 | Open the panel on a newly loaded page | "Resetuj" is disabled and faded like "Cofnij" | FR-015 |
| V11 | Press "Miesiąc" | "Resetuj" is enabled at once, before the month has loaded | FR-015 |
| V12 | Press "Resetuj" | The panel stays open; the title is "Piątek 06-11-2026"; today's rows load; "Cofnij", "Ponów", "Resetuj" are disabled; the launcher shows "Dziś:" | FR-010, FR-011, FR-014, SC-001, SC-002 |
| V13 | In the settings choose "Inny użytkownik", "Anna Nowak", "Zapisz"; then "Resetuj" | The name becomes the signed-in user's and Anna's rows disappear in the same moment; today loads for the signed-in user; the launcher has no name | FR-012, SC-004 |
| V14 | Press "Tydzień", then "Cofnij" (today again, "Ponów" enabled) | "Resetuj" is enabled; a press disables "Ponów"; the launcher keeps its total and never shows the pending sign | FR-014, FR-015 |
| V15 | Choose the light theme and 10 minutes, drag the panel larger, move the launcher; go to "Miesiąc"; press "Resetuj"; reload the page | Theme, interval, size, and place are as chosen, before and after the reload | FR-013, SC-003 |
| V16 | Sort the table by "Suma", go to yesterday and back to today with "Resetuj" | The table is still sorted by "Suma" | FR-013 |
| V17 | With the keyboard: Tab to "Resetuj" (enabled), press Enter | The focus is on "Odśwież"; the next Tab goes to "Ustawienia" | FR-018, SC-012 |
| V18 | `?scenario=slow`: press "Rok", and press "Resetuj" while it loads | The year never appears; today loads | FR-015 |
| V19 | Go to "Miesiąc", open the settings, change the interval, press "Resetuj" (the settings close on the press outside them) | The interval is not saved; the view is today | FR-016 |
| V20 | Go to "Miesiąc", open the "Eksport" menu, press "Resetuj" | The menu is closed; the view is today | FR-016 |
| V21 | `?scenario=error` on a period other than today: press "Resetuj" | The error text and "Spróbuj ponownie" for today; "Resetuj" stays disabled | FR-019 |
| V22 | After V12 press "Zamknij", then the launcher | The start view again; the close button works as before | FR-020 |
| V23 | Press "Resetuj" three times quickly | One load of today | spec, Edge Cases |

The scenario names (`long-name`, `slow`, `error`) stand for the scenarios of
`tests/e2e/browser-gateway.ts` that give a long name, a slow answer, and a failed load; the
tasks name the exact ones.

## Check on real software (once per release)

| # | Do | Expect |
|---|----|--------|
| X15 | Install the built extension in a clean browser profile, open a Jira Cloud site while signed in, open the panel, go to another period, choose another person, press "Resetuj" | Today for the signed-in user, panel open; the header has two rows and nothing of Jira's page has moved |

## Size

`vp run build` prints the size of the whole script, of the core, and of the export code.
Before this feature the core was 25.2 kB gzipped of 100 kB. The feature adds one button, one
icon outline, one text, and a few style rules, and removes the rules for the six buttons on
a narrow screen.

Measured on 2026-11-14, after the implementation: whole script 29.5 kB gzipped (29.1 kB
before), core 25.8 kB of 100 kB (25.2 kB before), export code 3.8 kB (unchanged). The core
grew by 0.6 kB, the changes of Phase 7 included.
