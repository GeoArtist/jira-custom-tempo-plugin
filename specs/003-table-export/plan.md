# Implementation Plan: Export of the Table to a File

**Branch**: `003-table-export` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-table-export/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

The worktime panel of [001](../001-worktime-panel/plan.md) and
[002](../002-other-user-worktime/plan.md) shows a table of tickets with logged time. This
feature adds a control "Eksport" at the left of the total row, present only while the table
has rows. It opens a menu of two formats. "*.csv" saves a plain file with a header and one
line per row, separated by semicolons. "*.xlsx" saves a formatted sheet: the person's name,
the period, and the total above a table with a coloured header, borders, the panel's column
proportions and colours, and a total row; its sums are numbers shown as "6h 55m", so the
spreadsheet can add them up (clarified on 2026-11-13). The file is named
`{name}_{range}_tempo_report.{format}`.

Technical approach (from [research.md](research.md)): both files are made in the browser
from the rows the table already has on screen, by code of the project's own in a new folder
`src/export/`: a CSV writer, an XLSX writer (XML parts), and a small ZIP writer with stored
entries. No library, no request to Jira, no permission: the file is handed to the browser
as a `blob:` link with a `download` name. The table owns the control, because only the
table knows the rows in their sort order and whether a load covers them. The build measures
the export code apart, as constitution 3.1.0 asks, by building once more without it.

## Technical Context

**Language/Version**: TypeScript in `strict` mode; SCSS (Dart Sass). No hand-written
JavaScript or CSS sources (constitution).

**Primary Dependencies**: runtime: none, and none added. Development only, unchanged:
`vite-plus`, `sass`, `typescript`, `happy-dom`, `@playwright/test`, `@types/node`, pinned in
`package.json` and the lock file.

**Toolchain (mandatory)**: Vite+, the `vp` command, configured in `vite.config.ts`, which
gains one build mode, `core` (the extension without the export code, for the size check).
Playwright stays for browser tests.

**Storage**: none. No setting is added; the format is chosen for every export. The files go
to the user's download folder through the browser.

**Testing**: `vp test` (Vitest with `happy-dom`) for the report, the CSV text, the XLSX
parts (read back from the ZIP and parsed), the file name, the palette against the tokens,
the menu, and the table's states; Playwright (Chromium) on the stand-in Jira page at 320 px
and 1280 px in both themes, catching the download, and with the real built extension. No
test needs a live Jira or a spreadsheet program.

**Target Platform**: unchanged: browser extension, Manifest V3, one content script on
`https://*.atlassian.net/*` (not `/wiki/*`); Chrome and Edge; Jira Cloud only. The manifest
changes only its version.

**Project Type**: single front-end project packaged as a browser extension.

**Performance Goals**: a file within 2 s of the choice for up to 500 rows (SC-001); making
a file is synchronous text building, expected well under 100 ms for 500 rows.

**Constraints**: no request of any kind while exporting (SC-009); no new permission
(FR-012); the script without the export code at most 100 kB gzipped, the export code
measured apart and reported (constitution 3.1.0, Principle I); layout from 320 px to
1920 px with 44 px touch targets (Principle III); nothing on the Jira page outside the
add-on's element is changed.

**Scale/Scope**: one sheet, four columns, up to several hundred rows. New: six small
modules in `src/export/`, one UI component. Changed: the table, the app, the texts, the
styles, the size check, the header (one method), the build configuration. 30 functional requirements.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v3.1.0, before research and again after the design. Checked a
third time on 2026-11-13 after the clarification session of the spec (five answers; one
changed the design: the sums of the XLSX file are numbers, [research.md](research.md) R13),
and a fourth time after the checklist `checklists/export.md` was resolved (the focus rule
of FR-030, R14; titles made one line; the surname alone for a name too long for a file
name; exact widths and heights). The
result did not change.

| Principle | How this plan satisfies it | Result |
|-----------|----------------------------|--------|
| I. Minimal Footprint | The export code (everything in `src/export/`) is outside the budget since 3.1.0 and is measured apart: `vp run build` builds the extension once more without it and `scripts/check-size.ts` reports the whole script, the core, and the export code, and fails when the core is above 100 kB. Measured after implementation (2026-11-13): whole script 29.1 kB gzipped, core 25.2 kB of 100 kB, export code 3.8 kB. Before this feature the script was 24.1 kB, so the core grew by 1.1 kB (the control, its menu, its styles, eight short texts, and the focus rule). No library, no asset, no font. | Pass |
| II. Minimal Dependencies | No dependency added. The XLSX file is written as XML text and packed by a ZIP writer of about 60 lines; CRC-32, quoting, and the file name use the platform's typed arrays and string methods; the download uses `Blob` and a link. Libraries were considered and rejected ([research.md](research.md) R1). | Pass |
| III. Responsive on Mobile and Desktop | One control and one menu at every width; the button and the two items are 44 px targets on touch and narrow screens; the menu opens upward inside the panel; nothing depends on hover. Browser tests at 320 px and 1280 px. | Pass |
| IV. Modern, Consistent User Interface | The control and the menu use existing tokens only; no new colour or size. Both themes follow from the tokens. The colours of the XLSX file are one table in `src/export/palette.ts`, held equal to the light tokens by a test. The export has a busy state, an absent state (nothing to export), and a failure message; it does not fail silently. Menu-button pattern with full keyboard support and visible focus. | Pass |
| V. Tested Behavior | Every rule of the two formats and of the file name has unit tests that read the produced file back; the control's states and the menu have UI tests; browser tests catch real downloads. Jira is faked in all of them. What needs real spreadsheet programs is listed as checks X13 and X14 with a documented reason ([research.md](research.md) R12). | Pass |
| VI. Install-Only Setup | No setting, no permission, no migration. Without touching the control the add-on behaves as before. An update that adds a permission would disable the extension until approved; this one adds none. | Pass |

Technical Constraints: no Jira request at all in this feature, so read-only and "documented
REST API only" hold trivially (pass); TypeScript and SCSS only, Vite+ only, the new build
mode is a `vp build` mode in `vite.config.ts` (pass); one isolated element, and the
temporary download link is created inside it (pass); no browser permission and no new
address (pass); nothing stored (pass); no data sent to a third party or anywhere: the file
goes from memory to the user's disk (pass); one documented build command, `vp run build`
(pass).

**Gate result**: Pass, before research and after design. No violations to justify.

## Open points

| # | Point | Planned | Reason |
|---|-------|---------|--------|
| D1 | The constitution was amended so the export may be large, yet the plan adds no library. | A writer of the project's own, about 4 to 6 kB gzipped. | Principle II still asks for a justification for a dependency, and the format needed here is small ([research.md](research.md) R1). The amendment keeps the door open without a second amendment. |
| D2 | The XLSX file is not compressed inside. | Stored ZIP entries; about 150 kB for 500 tickets. | A synchronous writer of 60 lines; all three target programs read it ([research.md](research.md) R3). |
| D3 | Row heights in the XLSX file are estimated, not measured. | 15 pt per line; title lines estimated from the length and the column width, on the tall side. | The reader's font is not known; explicit heights look the same in every program ([research.md](research.md) R5). A very long title of narrow letters may get a line too many. |
| D4 | "Opens without a warning in three programs" cannot be tested automatically. | Structure asserted by unit tests; the three programs checked by hand per release (X13). | No spreadsheet program in the toolchain ([research.md](research.md) R12). |
| D5 | The export code is in the one `content.js`, not in a file loaded on demand. | One file; measured apart by a second build without it. | On-demand loading needs an extension API and `web_accessible_resources` for about 5 kB ([research.md](research.md) R10). Possible later behind `src/export/index.ts`. |
| D6 | While a file is made the control is "busy" (FR-009), but making it is synchronous. | The state is set and cleared around the call; a user will not see it. | Kept so the rule holds if the writer ever becomes asynchronous. |
| D7 | The browser may rename the file or ask where to save it. | Not handled: the browser's own behaviour. | Spec, Edge Cases. A blocked download cannot be detected from the page. |

## Risks

| Risk | Effect | Handling |
|------|--------|----------|
| Excel rejects the hand-written package (wrong order of elements, a missing part) | A repair message on opening (fails FR-026) | The smallest set of parts in schema order ([research.md](research.md) R2); structure asserted by tests; check X13 before release |
| Jira's content security policy blocks the `blob:` download from the content script | No file is saved | Check X12 on a real Jira page early in the implementation; the fallback is a `data:` address for the CSV and the same for the XLSX in base64 |
| A program fits row heights differently from the explicit ones | Rows a little too tall or text cut in a rare long title | The estimate errs tall; X13 looks at a long title in each program |
| The palette in script drifts from the tokens | The file's colours no longer match the plugin | A unit test compares the two on every run |
| The second build doubles the build time | `vp run build` slower | The build takes about a second; the `core` build copies no assets |
| A program shows the numeric sums differently from the screen (a time of day, a decimal) | "6h 55m" reads as something else | Whole minutes and the format `[h]"h" mm"m"` ([research.md](research.md) R13); X13 looks at a day and at a total above 24 hours in each program |
| A ticket title carries a character XML does not allow | A file that does not open | Such characters are removed when the XLSX is written; tested |

## Project Structure

### Documentation (this feature)

```text
specs/003-table-export/
├── plan.md                      # This file
├── spec.md                      # Feature specification
├── research.md                  # Decisions R1 to R14, checks X12 to X14 on real software
├── data-model.md                # ShownView, Report, file name, states of the control
├── quickstart.md                # Commands, validation scenarios V1 to V21, checks X12 to X14
├── contracts/
│   ├── files.md                 # The CSV text and the XLSX package: parts, cells, styles, colours
│   └── ui.md                    # The control, the menu, texts, interfaces between the parts
├── checklists/
│   └── requirements.md          # Spec quality checklist
└── tasks.md                     # Created by /speckit-tasks, not by this command
```

### Source Code (repository root)

Only files that are new or change. The layout of 001 and 002 stays.

```text
src/
├── export/                  # NEW  everything only the export uses (outside the size budget)
│   ├── index.ts             # NEW  buildFile(view, format, now), saveFile; the only module imported from outside
│   ├── report.ts            # NEW  Report and ReportRow from the view; the file name
│   ├── csv.ts               # NEW  the CSV text: mark, header, quoting, apostrophe guard
│   ├── xlsx.ts              # NEW  the XML parts: sheet, styles, widths, heights, merges, links
│   ├── zip.ts               # NEW  stored ZIP entries, CRC-32
│   ├── palette.ts           # NEW  the colours of the sheet; the mix of two tones
│   └── download.ts          # NEW  Blob, blob: address, a temporary link inside the add-on's root
├── ui/
│   ├── export-menu.ts       # NEW  the button, the menu, the failure message; states absent / disabled / enabled
│   ├── table.ts             # CHG  the footer holds the control; ShownView keeps the summary; the four methods set the control's state; onExport, onFocusLost
│   ├── header.ts            # CHG  focusFallback(): "Cofnij", or "Odśwież"; "Odśwież" is switched off with aria-disabled while a load runs, so it keeps the focus (FR-030)
│   └── app.ts               # CHG  wires onExport: adds the person's name, calls buildFile and saveFile; closes the menu when the panel hides; AppDeps.saveFile
├── i18n/pl.ts               # CHG  eight texts (contracts/ui.md)
└── styles/
    └── app.scss             # CHG  footer with two groups and a fixed minimum height; button, menu, items, message

scripts/
├── check-size.ts            # CHG  reads dist/ and dist-core/: whole, core (limit 100 kB), export (reported)
└── export-stub.ts           # NEW  what the "core" build puts in place of src/export/index.ts

vite.config.ts               # CHG  mode "core": alias src/export/index → the stub, output dist-core/extension; ignore dist-core in lint and format
package.json                 # CHG  "build" and "package" run both builds before the check; version 0.4.0 (also package-lock.json)
extension/manifest.json      # CHG  version 0.4.0 only
.gitignore                   # CHG  dist-core/

tests/
├── helpers/
│   └── unzip.ts             # NEW  reads the stored entries of a ZIP back, for the tests
├── unit/
│   ├── export-report.test.ts    # NEW  rows as shown, order kept; every file-name case of the data model
│   ├── export-csv.test.ts       # NEW  mark, header, CR LF, quoting, apostrophe, joined entries
│   ├── export-download.test.ts  # NEW  Blob, link inside the host, click, removal, release; a failure is thrown on
│   ├── export-seam.test.ts      # NEW  other code imports the export only as …/export/index, the spelling the core build replaces
│   ├── check-size.test.ts       # NEW  the size script: under the budget, above it, without a core build
│   ├── export-zip.test.ts       # NEW  CRC-32 known values; headers; names; round trip
│   ├── export-xlsx.test.ts      # NEW  parts and their order; cells; numeric sums and their format; styles; merges; widths; heights; links; forbidden characters
│   ├── export-palette.test.ts   # NEW  equals the light tokens of _tokens.scss; the mix; contrast at least 4.5:1
│   └── i18n.test.ts             # CHG  the eight texts of spec 003 (FR-028)
├── ui/
│   ├── export-menu.test.ts      # NEW  open, close, keys, focus, roles, busy text, failure message, focus handed on when the button loses its use
│   ├── header.test.ts           # CHG  focusFallback picks "Cofnij" or "Odśwież"; "Odśwież" keeps the focus and ignores activation while busy
│   ├── table.test.ts            # CHG  the control per state; the exported view follows the sort order
│   └── app.test.ts              # CHG  the file carries the selected person's name; nothing is requested; the menu closes with the panel
└── e2e/
    ├── browser-gateway.ts       # CHG  scenario "special-titles"; a scenario where a refresh fails with rows on screen, if none exists
    ├── export.spec.ts           # NEW  V1 to V17, V19 to V21 at 320 px and 1280 px, the control and the menu in both themes: download caught, name and content checked
    ├── layout.spec.ts           # CHG  the footer at 320 px with the control and the longest total; the menu inside the window, in the lowest panel, and in a panel below the launcher; the failure message beside and under the control
    ├── a11y.spec.ts             # CHG  keyboard path through the menu; touch targets; accessible names
    ├── refresh.spec.ts          # CHG  "Odśwież" during a load: aria-disabled, not disabled (FR-030)
    ├── large-period.spec.ts     # CHG  500 rows exported within 2 seconds (SC-001)
    └── extension.spec.ts        # CHG  the built extension saves both files; no request while exporting

README.md                    # CHG  the feature; the size check and its exception for the export code
BrowserInstallation.md       # CHG  one line about the export, if the guide lists the features
docs/screenshots/            # CHG  retaken: the total row has the control
specs/001-worktime-panel/    # CHG  spec.md notes that the total row carries the control of 003; contracts/ui.md: "Odśwież" while a load runs is switched off but keeps the focus (003 FR-030)
```

**Structure Decision**: the single front-end project of 001, unchanged in shape, with one
new folder. `src/export/` holds everything that exists only to make a file; nothing in it
touches the DOM except `download.ts`, and other code imports only `src/export/index.ts`.
That one seam is what the size check replaces by a stub, and what a later on-demand load
would hang on. The control is ordinary panel code in `src/ui/export-menu.ts` and counts
toward the budget, as the constitution says. `src/ui/table.ts` owns the control's state
because the rows on screen, their order, and the spinner are its own state already;
`src/ui/app.ts` stays the only place that knows the selected person and joins the two.

## Implementation order

1. The seam and the measure: `src/export/index.ts` with a first `buildFile` for CSV,
   `scripts/export-stub.ts`, the `core` mode, the new `check-size.ts`. The gate works before
   the code grows.
2. Story 1 (CSV): `report.ts`, `csv.ts`, `download.ts`; `export-menu.ts`; the table's
   states; the wiring in `app.ts`; texts and styles. Check X12 on a real Jira page here.
3. Story 2 (XLSX): `zip.ts`, `palette.ts`, `xlsx.ts`. Check X13 as soon as a first file
   exists, before the styles are finished.
4. Story 3 (states): the remaining states and edge cases, browser tests, layout at 320 px.
5. Documentation, screenshots, version 0.4.0, measured sizes into this plan, X12 to X14
   recorded in the research.

## Complexity Tracking

No constitution violations. Nothing to justify.
