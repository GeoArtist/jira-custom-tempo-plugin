---

description: "Task list for the Export of the Table to a File feature"
---

# Tasks: Export of the Table to a File

**Input**: Design documents from `/specs/003-table-export/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (files.md, ui.md), quickstart.md

**Tests**: INCLUDED. The constitution (Principle V) requires that every behavior ships with automated tests in the same change, runnable with one command and without a live Jira. In each phase the test tasks come first: write them, see them fail, then write the code. Browser tests need the built add-on and come last in their phase.

**Organization**: Tasks are grouped by user story so each story can be built, tested, and shown on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on unfinished tasks)
- **[Story]**: Which user story the task belongs to (US1 to US3)
- **MANUAL** in a description: needs a person with a real Jira Cloud site or real spreadsheet programs; an agent cannot complete it alone

## Path Conventions

Single front-end project at the repository root: `src/`, `tests/`, `demo/`, `extension/`, `scripts/`, `vite.config.ts`. Source is TypeScript and SCSS only. Paths below are relative to the repository root.

## Rules that apply to every task

- The spec is the source: `specs/003-table-export/spec.md`. FR and SC numbers below are from it; "001 FR-…" and "002 FR-…" are from the specs of those features. The exact formats are in `specs/003-table-export/contracts/files.md`, the markup and keys in `specs/003-table-export/contracts/ui.md`, the types and the file-name rules in `specs/003-table-export/data-model.md`.
- All visible text comes from `src/i18n/pl.ts`; no other source file may contain Polish letters (guarded by `tests/unit/i18n.test.ts`). Where code needs such a character (the letter l with stroke in the file-name rule), write it as an escape (`ł`, `Ł`); the byte order mark as `﻿`.
- Edit source files with the editor tools, not through a shell heredoc: the shell decodes `\u` escapes and breaks long heredocs on this machine.
- Every colour, space, and size in `src/styles/app.scss` comes from a token in `src/styles/_tokens.scss`; this feature adds no token. The colours of the XLSX file live in `src/export/palette.ts` only.
- Other code imports from `src/export/` only through `src/export/index.ts`. Nothing in `src/export/` imports from `src/ui/`. Only `src/export/download.ts` touches the DOM.
- No request of any kind is made by this feature, no dependency is added, and `extension/manifest.json` changes only its version.
- Vite+ (`vp`) for everything: `vp test run`, `vp check`, `vp run build`, `vp run test:e2e`, `vp run check`. On Windows run them from a path with an upper-case drive letter (`cd /E/Atlasus/_repos/jira-custom-tempo`), otherwise the unit test files are not found.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A known green starting point, and the texts every later task uses.

- [X] T001 Run `vp run check` on branch `003-table-export` before any change and confirm it passes; note the gzipped size of `dist/extension/content.js` that `scripts/check-size.ts` prints (24.0 kB expected), for comparison in T054
- [X] T002 [P] Add a failing test to `tests/unit/i18n.test.ts`: "contain every text of spec 003 (FR-028)": read `specs/003-table-export/spec.md`, take the table between `- **FR-028**` and `- **FR-029**`, collect every text in backticks of its second column, expect exactly 8 texts (`Eksport`, `*.csv`, `Eksport do pliku CSV`, `*.xlsx`, `Eksport do pliku XLSX`, `Tworzenie pliku…`, `Nie udało się utworzyć pliku.`, `Raport`), and expect each to stand in `src/i18n/pl.ts` between single quotes
- [X] T003 Add the eight texts to `src/i18n/pl.ts` with the keys of `contracts/ui.md` ("Texts"): `exportLabel: 'Eksport'`, `exportCsv: '*.csv'`, `exportCsvLabel: 'Eksport do pliku CSV'`, `exportXlsx: '*.xlsx'`, `exportXlsxLabel: 'Eksport do pliku XLSX'`, `exportBusy: 'Tworzenie pliku…'`, `exportFailed: 'Nie udało się utworzyć pliku.'`, `exportSheet: 'Raport'`; update the comment at the top of the file to name spec 003 FR-028; T002 passes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one seam between the panel and the export code, and a build that measures the two apart (constitution 3.1.0, Principle I; research R10). Nothing the user sees changes in this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create `src/export/index.ts` with the types of `contracts/ui.md` ("Interfaces between the parts"): `type ExportFormat = 'csv' | 'xlsx'`; `interface ExportView { rows: TicketRow[]; period: Period; timeZone: string; summary: PeriodSummary; personName: string }`; `interface ReportFile { name: string; mime: string; data: string | Uint8Array }`; and two functions, `buildFile(view: ExportView, format: ExportFormat, now: Date): ReportFile` and `saveFile(file: ReportFile, host: Node): void`, both throwing `new Error('not implemented')` for now; a comment at the top says this is the only module of `src/export/` that other code may import; add `tests/unit/export-seam.test.ts`: it reads every `.ts` file under `src/` outside `src/export/` and expects that every import of the export folder ends exactly in `/export/index'` (the spelling the alias of the `core` build matches, T006) and that no such file imports another module of `src/export/`
- [X] T005 Create `scripts/export-stub.ts` exporting the same two function names as `src/export/index.ts`, each throwing, with no other code and no imports except types; it stands in for the export code in the size build
- [X] T006 Add the build mode `core` to `vite.config.ts` (research R10): when `mode === 'core'`, the same library build as the default mode but with `outDir: resolve('dist-core/extension')`, `publicDir: false`, no plugins, and the alias `{ find: /^.*\/export\/index$/, replacement: resolve('scripts/export-stub.ts') }`; add `dist-core/**` to the `ignorePatterns` of `lint` and `fmt`; add `dist-core/` to `.gitignore`; extend the comment at the top of the file with the line for `vp build --mode core`
- [X] T007 Change `scripts/check-size.ts`: besides `--out` (default `dist`) read `--core` (default `dist-core`); for each page directory under the output, compute `whole` (as today), `core` (the same sum for the directory of the same name under the core directory) and `exported = whole - core`; print `<page>: whole X kB, core Y kB of 100.0 kB, export Z kB (no limit)`; fail with exit code 1 when `core` is above `BUDGET_BYTES` or when the core directory of a page is missing ("Run `vp build --mode core` first"); the whole is no longer compared with the budget; update the comment at the top to name constitution 3.1.0; add `tests/unit/check-size.test.ts`, which runs the script with `node` against two temporary directories passed as `--out` and `--core`: a core under the budget exits with 0 and prints the three numbers; a core above 100 kB gzipped (random bytes) exits with 1; a missing core directory exits with 1
- [X] T008 Change the scripts in `package.json`: `"build": "vp build && vp build --mode core && node scripts/check-size.ts"` and `"package": "vp build && vp build --mode core && node scripts/check-size.ts && node scripts/package.ts"`; run `vp run build` and confirm the three numbers are printed, that `core` equals `whole` within a few bytes (nothing imports the export code yet), and that `dist/extension` holds no file of the core build

**Checkpoint**: `vp run check` passes; the add-on behaves exactly as before; the build reports whole, core, and export.

---

## Phase 3: User Story 1 - Save the table as a CSV file (Priority: P1) 🎯 MVP

**Goal**: "Eksport" at the left of the total row opens a menu of two formats; "*.csv" saves a file named `{name}_{range}_tempo_report.csv` with a header and one line for each ticket on screen.

**Independent Test**: With time logged on three tickets today, press "Eksport", choose "*.csv", open the saved file as text, and compare its name, its header, and every line with the table on screen (quickstart V1 to V5, V8, V9, V13, V14, V17).

### Tests for User Story 1 ⚠️

> Write these tests FIRST and see them FAIL before the implementation tasks.

- [X] T009 [P] [US1] Write failing unit tests in `tests/unit/export-report.test.ts` for `buildReport(view)` of `src/export/report.ts` (data-model.md, "Report"): `rows` has one `ReportRow` per row of the view in the same order; `key`, `url` from the ticket; `entries` equals `formatEntry(entry, period, timeZone)` for each entry (with the `dd-mm` date for a period longer than one day); `sum` equals `formatDuration(totalSeconds)`; `minutes` equals `floor(totalSeconds / 60)` (a row of 3599 s gives 59); `title` is "made one line: every tab, carriage return, and line feed (a carriage return with its line feed counts once) becomes one space; other control characters (U+0000 to U+001F, U+007F) are removed" and "may be empty"; `name` is `personName` unchanged; `period` equals `formatTitle(period)`; `total` and `totalMinutes` from the summary; no rows gives a valid report with an empty `rows`
- [X] T010 [P] [US1] In the same file `tests/unit/export-report.test.ts`, write failing tests for `fileBase` (FR-017, FR-018; data-model.md, "File name"), one per row of its examples table: `Jan Kowalski` + 13-11-2026 → `Jan_Kowalski_13-11-2026_tempo_report`; `Józef Śliwiński` + 01-11-2026 to 30-11-2026 → `Jozef_Sliwinski_01-11-2026_30-11-2026_tempo_report`; `Anna Maria  Nowak-Kowalska` + 13-11-2026 08:00–12:00 → `Anna_Maria_Nowak-Kowalska_13-11-2026_0800_13-11-2026_1200_tempo_report`; `Łukasz Żółć` → `Lukasz_Zolc_…`; an empty name and `???` → `13-11-2026_tempo_report`; `.Jan  Kowalski.` → `Jan_Kowalski_…`; 90 letters of first names followed by ` Nowak-Kowalska` (more than 100 characters after cleaning) → `Nowak-Kowalska_13-11-2026_tempo_report`; one word of 120 letters → `13-11-2026_tempo_report`; first names followed by a surname of 120 letters → `13-11-2026_tempo_report`; a name of exactly 100 characters is kept whole; `ß`, `ø`, and Cyrillic letters stay; `é`, `ü`, `č` lose their marks; `\ / : * ? " < > |` are removed; a multi-day period that starts at 00:00 and ends at 12:00 writes both ends with `HHMM` (write the Polish letters of these tests as they are: test files may hold them)
- [X] T011 [P] [US1] Write failing unit tests in `tests/unit/export-csv.test.ts` for `toCsv(report)` of `src/export/csv.ts` (contracts/files.md, "CSV"; FR-013 to FR-016): the text starts with U+FEFF; the first line after it is `Zgłoszenie;Tytuł;Czas wpisów;Suma`; every line, also the last, ends with CR LF and nothing follows; one line per row, in order; a row with five entries is one line whose third field joins them with `", "`; a title `Raport; wersja "B"` is written `"Raport; wersja ""B"""`; `=1+1` → `'=1+1`; ` -5 dni` (a space first) → `' -5 dni`; a tab or a no-break space before `@` also gets the apostrophe at the very start; `-test; a` → `"'-test; a"` (apostrophe first, then quotation marks); a title `a-b` and a sum `3h 30m` get no apostrophe; an empty title gives an empty field (`AM-1;;…`); a report without rows is the mark and the header line only
- [X] T012 [P] [US1] Write failing unit tests in `tests/unit/export-download.test.ts` for `saveFile(file, host)` of `src/export/download.ts` (research R7), with `URL.createObjectURL` and `URL.revokeObjectURL` replaced by spies: a `Blob` of the file's `mime` is made from `data` (a string and a `Uint8Array` both work); a link with `href` set to the blob address and `download` set to `file.name` is appended inside `host`, clicked once, and removed again, so `host` has no child left afterwards; the address is released later (use fake timers); when `createObjectURL` throws, `saveFile` throws and leaves nothing in `host`
- [X] T013 [P] [US1] Write failing UI tests in `tests/ui/export-menu.test.ts` for `createExportMenu({ onChoose })` of `src/ui/export-menu.ts` (contracts/ui.md, "Markup" and "Behaviour"; FR-005 to FR-009): the element is `div.wt-export` with a button "Eksport" (`aria-haspopup="menu"`, `aria-expanded="false"`, `aria-controls` naming the menu), a hidden `role="menu"` named "Eksport" with two `role="menuitem"` buttons whose texts are `*.csv` and `*.xlsx` and whose `aria-label`s are `Eksport do pliku CSV` and `Eksport do pliku XLSX`, and a `role="status"` message; in the state `enabled`: a click, Enter, Space, and Arrow Down on the button open the menu with the focus on `*.csv` and `aria-expanded="true"`; Arrow Down and Arrow Up move and wrap round; Home and End jump; Enter, Space, and a click on an item close the menu, return the focus to the button, and call `onChoose` once with `'csv'` or `'xlsx'`; a second click on the button closes it with the focus on the button; Escape closes it, returns the focus to the button, and the event does not reach a `keydown` listener on a parent element; Tab closes it; a `pointerdown` on the document outside closes it and one inside does not; the document listener exists only while the menu is open; when `onChoose` throws, the message shows `Nie udało się utworzyć pliku.` and the button is enabled, and the next activation of the button clears the message; while `onChoose` runs the button has `aria-busy="true"`, `aria-disabled="true"`, no `disabled` attribute, the accessible label `Tworzenie pliku…`, and still the focus, and a click on it does nothing; `setState('disabled')` and `setState('absent')` close an open menu
- [X] T014 [P] [US1] Extend `tests/ui/table.test.ts` with failing tests (data-model.md, "ShownView"; FR-001, FR-002, FR-011): the footer holds `div.wt-export` before the label "Suma czasu:"; before any render the export button is hidden; after `render` with rows it is visible and enabled; after `render` with no rows it is hidden; choosing a format calls the `onExport` option of `createTable` once with the format and a view whose `rows` are in the order on screen (sort by "Suma" descending first and expect that order), whose `period` and `timeZone` are those of the render, and whose `summary` is the one passed to `render`; `div.wt-export` is in the footer in every state (the row keeps its height)
- [X] T015 [P] [US1] Extend `tests/ui/app.test.ts` with failing tests, using a spy passed as `saveFile` in `AppDeps` (FR-011, FR-012, FR-017; 002): with the panel open on today, choosing "*.csv" calls the spy once with a file named `Jan_Kowalski_{date of the test's now}_tempo_report.csv`, the type `text/csv;charset=utf-8`, and a text whose lines are the rows on screen; the second argument is the add-on's root element; the fake gateway receives no request between the choice and the call; after another person is chosen in the settings and their rows are shown, the name of the file starts with that person's name without Polish letters

### Implementation for User Story 1

- [X] T016 [US1] Create `src/export/report.ts` (data-model.md, "Report", "ReportRow", "File name"; research R11): `interface ReportRow { key; url; title; entries: string[]; sum; minutes }`, `interface Report { name; period; total; totalMinutes; totalColour; rows; fileBase }`, `buildReport(view: ExportView): Report`, and the constant `MAX_FILE_NAME_PART = 100`; `totalColour` is set to the text colour for now (T033 completes it); the file-name steps in this order: (1) NFD, combining marks removed, `ł` → `l` and `Ł` → `L`; (2) `\ / : * ? " < > |` and control characters removed; (3) white space trimmed at the ends, every run of white space becomes one `_`; (4) dots and underscores removed at the start and at the end; (5) "Longer than 100 characters: the surname alone, which is what follows the last `_` (the whole result when it has no `_`). Still longer than 100: the name is left out. Nothing is ever cut inside a word"; the range from `formatDate`, `isWholeDays`, and `isSingleDay` of `src/domain/`, with `HHMM` from the minute of the day for a period that is not whole days; T009 and T010 pass
- [X] T017 [P] [US1] Create `src/export/csv.ts` with `toCsv(report: Report): string` (contracts/files.md, "CSV"; research R6): the mark `﻿`, the header from `pl.columns`, one line per row, CR LF after every line; a field is written in two steps: first the apostrophe when its first character that is not white space (U+0020, U+00A0, U+0009) is `=`, `+`, `-`, or `@`, put at the very start of the field; then quotation marks with doubled `"` when it holds `;`, `"`, U+000D, or U+000A; the entries joined with `', '`; T011 passes
- [X] T018 [P] [US1] Create `src/export/download.ts` with `saveFile(file: ReportFile, host: Node): void` (research R7): a `Blob` with the file's type, `URL.createObjectURL`, a link with `download = file.name` appended to `host`, `click()`, removed at once, and `URL.revokeObjectURL` after a moment; on any exception the link is removed and the exception is thrown on; T012 passes
- [X] T019 [US1] Complete `src/export/index.ts`: `buildFile` builds the report once and returns `{ name: fileBase + '.csv', mime: 'text/csv;charset=utf-8', data: toCsv(report) }` for `'csv'`; for `'xlsx'` it still throws (Phase 4); `saveFile` is re-exported from `download.ts`; the parameter `now` is unused until Phase 4
- [X] T020 [US1] Create `src/ui/export-menu.ts` with `createExportMenu(options: { onChoose(format): void; onFocusLost?(): void }): ExportMenu` and `interface ExportMenu { element; setState(state: 'absent' | 'disabled' | 'enabled'): void; close(): void }` (contracts/ui.md): the markup, the keys, and the behaviour of that contract; `onChoose` is called inside `try`/`finally` with the button busy (`aria-busy` and `aria-disabled`, never the `disabled` attribute, so it keeps the focus; activation is ignored meanwhile; the label `pl.exportBusy`) and the failure message `pl.exportFailed` on an exception; `setState('absent')` hides the button, `'disabled'` disables it, both close the menu; `onFocusLost` is accepted and not called yet (T046); the document's `pointerdown` listener is added on opening and removed on closing, as `src/ui/settings-popover.ts` does; T013 passes
- [X] T021 [P] [US1] Add the styles to `src/styles/app.scss` (contracts/ui.md, "Layout" and "Look"; FR-001, FR-005, FR-007, FR-010): `.wt-footer` becomes two groups with `justify-content: space-between` and `align-items: center`, with a minimum height of one control plus its padding (`--wt-control`; `--wt-touch` inside `@include base.touch-size`), so the row is as high without the button; `.wt-export` is `position: relative` and holds the button, the menu, and the message; `.wt-export__button` looks like `.wt-button`, with the hover of the other buttons, the common disabled look, and the selected look while `aria-expanded="true"`; `.wt-export__menu` is `position: absolute`, `bottom: 100%`, left edge on the button's, the gap `--wt-space-1`, the raised surface, the border, the small radius, the panel's shadow, at least as wide as the button; its items are `--wt-control` high (`--wt-touch` on touch), with the hover background under the pointer and on focus; `.wt-export__message` in `--wt-danger` at the small text size, beside the button, wrapping under it when the row is too narrow; existing tokens only
- [X] T022 [US1] Change `src/ui/table.ts`: `createTable(options?: { onExport?(format: ExportFormat, view: ShownView): void; onFocusLost?(): void })`; export `interface ShownView { rows; period; timeZone; summary }`; `shown` keeps the summary and its `rows` are handed out in the sort order on screen (`sortRows` with the current column and direction); the footer is `[exportMenu.element, totalLabel, total]`; `render` sets the state `enabled` with rows and `absent` without; add `closeMenu(): void` to `Table`; the callback of the menu calls `options.onExport` with the current `ShownView` and lets an exception pass to the menu; T014 passes
- [X] T023 [US1] Wire the export in `src/ui/app.ts`: `AppDeps` gains `saveFile?: typeof saveFile` (default: the one of `src/export/index.ts`, imported as `'../export/index'`, the exact spelling the `core` build replaces); `createTable({ onExport: (format, view) => save(buildFile({ ...view, personName: choice.person.displayName }, format, new Date(now())), root) })`; `minimise()` calls `table.closeMenu()` (`close()` goes through `minimise()`); T015 passes; run `vp run build` and confirm that the export size it prints is now above 0
- [X] T024 [US1] Add the scenario `special-titles` to `tests/e2e/browser-gateway.ts` (quickstart V17): today's tickets titled `=1+1`, ` -5 dni` (a space first), `Raport; wersja "B"`, one whose title holds a line break, one with an empty title, and one with two entries; keep the existing scenarios unchanged
- [X] T025 [US1] Create `tests/e2e/export.spec.ts` with the CSV scenarios, each catching the file with `page.waitForEvent('download')`, checking `suggestedFilename()`, and reading the saved text (quickstart V1 to V5, V8, V9, V13, V14, V17): the button stands at the left of the total row and the total at the right; the menu opens above the button with `*.csv` then `*.xlsx`; today gives `Jan_Kowalski_06-11-2026_tempo_report.csv` whose bytes start with EF BB BF, whose first line is the header, and whose lines equal the rows on screen; after sorting by "Suma" descending the lines follow; "Miesiąc" gives `…_01-11-2026_30-11-2026_…` and entries with dates; a day from 08:00 to 12:00 gives `…_06-11-2026_0800_06-11-2026_1200_…`; another person gives their name without Polish letters; keyboard only: Tab to "Eksport", Enter, Arrow Down, Escape leaves the panel open, then Enter, Enter saves the file; `special-titles` gives `'=1+1`, `' -5 dni`, `"Raport; wersja ""B"""`, a space for the line break, an empty field, and exactly one line per ticket; run in the `phone` and `desktop` projects
- [ ] T026 [US1] MANUAL: check X12 of `specs/003-table-export/research.md` for the CSV file: build with `vp run build`, load `dist/extension` in Chrome, open a Jira Cloud page with logged time, export "*.csv", and confirm the file is saved under the specified name and the console shows no content-security-policy error; write the date and the result into `research.md` ("Checks on real software"); if the download is blocked, stop and report before Phase 4 (plan.md, Risks: the fallback is a `data:` address)

**Checkpoint**: The CSV export works end to end and can be shown. "*.xlsx" is in the menu and gives the failure message until Phase 4, so this state is not released alone.

---

## Phase 4: User Story 2 - Save the table as a formatted XLSX file (Priority: P2)

**Goal**: "*.xlsx" saves a sheet with the name, the period, and the total above a table with a coloured header, borders, the panel's proportions and colours, numeric sums shown as "6h 55m", and a total row.

**Independent Test**: Export "*.xlsx" for three tickets (one with two entries, one with a long title), open the file, and check the three title rows, the header, each ticket row, the total row, the widths, the borders, the colours, and that the "Suma" cells add up to the total (quickstart V6, V7, V8, V15, V17, V21).

### Tests for User Story 2 ⚠️

- [X] T027 [P] [US2] Create the test helper `tests/helpers/unzip.ts`: `unzip(bytes: Uint8Array): Map<string, string>` that reads the end record and the central directory of a ZIP, checks that every entry is stored (method 0), and returns each entry's name with its content decoded as UTF-8; it throws on a compressed entry or a broken structure
- [X] T028 [P] [US2] Write failing unit tests in `tests/unit/export-zip.test.ts` for `crc32(bytes)` and `zip(entries, now)` of `src/export/zip.ts` (research R3): `crc32` of the ASCII text `123456789` is `0xCBF43926` and of no bytes is `0`; `zip([{ name, data }], now)` returns a `Uint8Array` that starts with `PK\x03\x04`, that the helper of T027 reads back to the same names in the same order and the same contents; a name with a Polish letter round-trips (the UTF-8 flag `0x0800` is set); sizes and checksums in the local headers and in the central directory agree; the same input and the same `now` give the same bytes
- [X] T029 [P] [US2] Write failing unit tests in `tests/unit/export-palette.test.ts` for `src/export/palette.ts` (contracts/files.md, "Colours"; research R4): read `src/styles/_tokens.scss`, take the block of `.wt-root[data-theme='light']`, and expect `text` = `--wt-text`, `muted` = `--wt-text-muted`, `link` = `--wt-link`, `name` = `--wt-person`, `headerFill` = `--wt-accent`, `headerText` = `--wt-on-accent`, and the five tones = `--wt-tone-blue`, `-green`, `-yellow`, `-orange`, `-red`; `border` is `#9aa3b2` and equals `--wt-text-muted` of the dark block; `totalColour(summary)` gives `muted` for `totalSeconds === 0`, `text` for `colour === null`, the `from` tone at ratio 0, the `to` tone at ratio 1, and at ratio 0.5 each channel `round(from + (to − from) × 0.5)`; every text colour and every mix at ratios 0, 0.25, 0.5, 0.75, 1 has a contrast of at least 4.5:1 against `#ffffff`, and `headerText` against `headerFill`; `argb('#172033')` is `FF172033`
- [X] T030 [P] [US2] Write failing unit tests in `tests/unit/export-xlsx.test.ts` for `toXlsx(report, now)` of `src/export/xlsx.ts`, reading the result with the helper of T027 and the DOM parser (contracts/files.md, "XLSX"; FR-020 to FR-027), part 1, the package and the cells: the seven parts in the contract's order, each starting with the XML declaration; without any link the sheet's relationship part and its reference are left out; the sheet is named `Raport`; A1 holds the name, A2 the period, A3 `Suma czasu: ` and the total, row 4 has no cell, row 5 the four headers, rows 6 on one row per ticket in order, and the row after them `Suma czasu:` in C and the total in D with empty bordered cells in A and B; merged cells are exactly `A1:D1`, `A2:D2`, `A3:D3`; every text cell is `t="inlineStr"` with `xml:space="preserve"`; the entries of a ticket are joined with a line feed in one cell; the D cells of the ticket rows and of the total row are numbers whose value is `minutes / 1440` (415 minutes → 415/1440) and whose style has the number format `[h]"h" mm"m"`; no cell has an `<f>` element; a title `=1+1` is an inline string `=1+1` without an apostrophe; `&`, `<`, `>`, `"` are escaped and U+0001 is removed; an empty name still gives a merged, empty A1 with its height; an empty title gives an empty bordered B cell; each ticket with an `http://` or `https://` address has one `<hyperlink ref="A{row}">` with an external relationship to it, and a ticket without such an address has none; the children of `worksheet` stand in the order `cols`, `sheetData`, `mergeCells`, `hyperlinks`
- [X] T031 [P] [US2] In the same file `tests/unit/export-xlsx.test.ts`, write failing tests, part 2, the look (contracts/files.md, "Column widths", "Styles"; FR-021 to FR-024): the font is Calibri; the twelve styles of the contract's table by what they resolve to (A1: 14 pt bold in the name colour; A2: 12 pt bold in the text colour; A3: 12 pt bold in the total colour; the header: bold `FFFFFFFF` on a solid fill `FF0C66E4` with a border, "Suma" at the right; the key: bold in the link colour, top; the title: wrapped, top; the entries: muted, wrapped, top; the sum: right, top; the total row: bold in the total colour, right); every cell from row 5 to the total row in A to D has a thin border on all four sides in `FF9AA3B2`, and rows 1 to 4 have none; the widths start from 14, 47, 24, 11; a ticket number of 20 characters widens A to 22; an entry line of 26 characters widens C to 28 and then B is at least 38 and stays at least 47; a sum of 9 characters keeps D at 11; row heights: rows 1 to 3 are 21, 18, 18 pt, the header and the total row 18 pt, and a ticket row is 15 pt times "the larger of `entries.length` and `ceil(title.length / floor(widthB × 0.9))`, at least 1" (a title of 100 characters with B at 47 gives 3 lines, 45 pt; four entries and a short title give 60 pt); the total of a single day of 6h 55m is the mix of blue and green and of a month is the text colour; the same report gives the same bytes for the same `now`

### Implementation for User Story 2

- [X] T032 [P] [US2] Create `src/export/zip.ts` (research R3): `crc32(bytes: Uint8Array): number` from a table computed once, and `zip(entries: { name: string; data: Uint8Array }[], now: Date): Uint8Array` writing stored entries with local headers, the central directory, and the end record through a `DataView`, the UTF-8 name flag, and the date and time of `now` in the DOS fields (`scripts/package.ts` shows the same layout with Node's buffers; do not import from it); T028 passes
- [X] T033 [P] [US2] Create `src/export/palette.ts` (contracts/files.md, "Colours"): the twelve colours as one constant, `mix(from, to, ratio)` per channel with rounding, `totalColour(summary: PeriodSummary): string`, and `argb(hex)`; T029 passes; then, in two finished files of Phase 3, first add a failing test for `Report.totalColour` to `tests/unit/export-report.test.ts` and then use `totalColour` in `src/export/report.ts`
- [X] T034 [US2] Create `src/export/xlsx.ts`, part 1 (research R2, R13): `toXlsx(report: Report, now: Date): Uint8Array`; an `escapeXml` that escapes `&`, `<`, `>`, `"` and removes what XML 1.0 does not allow; the parts `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml` (the sheet named `pl.exportSheet`), `xl/_rels/workbook.xml.rels`, and `xl/worksheets/sheet1.xml` with `sheetData` (inline strings; the D cells as numbers `minutes / 1440`), `mergeCells`, `hyperlinks`, and the sheet's relationship part; the parts are encoded with `TextEncoder` and packed by `zip` in the contract's order; the tests of T030 pass except those that need styles
- [X] T035 [US2] Complete `src/export/xlsx.ts`, part 2 (research R4, R5): `xl/styles.xml` with the fonts, the solid header fill, the thin border, the custom number format `[h]"h" mm"m"` (id 164), and the twelve cell formats of the contract's table, in that order, so the style numbers of the contract are the indexes; `cols` with the widths by the contract's rule; an explicit height on every row (`ht` with `customHeight="1"`) by the rule of FR-023; the colours from `palette.ts` only; T030 and T031 pass
- [X] T036 [US2] Complete `buildFile` in `src/export/index.ts` for `'xlsx'`: `{ name: fileBase + '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', data: toXlsx(report, now) }`; extend `tests/ui/app.test.ts`: choosing "*.xlsx" calls the `saveFile` spy with that name and type and with bytes that start with `PK`; the names of the CSV and the XLSX file of the same view differ only in their ending (FR-019)
- [X] T037 [US2] Extend `tests/e2e/export.spec.ts` with the XLSX scenarios, reading the downloaded bytes with `tests/helpers/unzip.ts` (quickstart V6, V7, V8, V15, V17, V21): today gives `Jan_Kowalski_06-11-2026_tempo_report.xlsx`; the sheet holds the name, `Piątek 06-11-2026`, the total, the header, one row per row on screen in the order on screen, and the total row; the numbers of the D cells of the ticket rows add up to the number of the total row; a ticket with two entries has them in one cell; "Miesiąc" gives the range in the name and in A2; the file exported in the dark appearance has the same bytes as the one exported in the light appearance at the same fixed time; the titles of `special-titles` are inline strings as written
- [ ] T038 [US2] MANUAL: a first look at check X13 of `research.md`, before the feature is finished: export one single-day and one month file from the stand-in page (`vp dev --mode demo`) and open both in Microsoft Excel, LibreOffice Calc, and Google Sheets; no warning and no repair message; the sums read "6h 55m" and "38h 30m" and add up to the total; widths, heights, borders, colours, and the link are as specified; report what differs so it can be corrected in T034 or T035

**Checkpoint**: Both formats work. First state of the feature that could be released.

---

## Phase 5: User Story 3 - The export is offered only when there is something to export (Priority: P2)

**Goal**: The control exists only while rows are on screen, cannot be used while a load covers them, hands the keyboard focus on when it loses its use, and reports a file that could not be made.

**Independent Test**: Go through a period with entries, a period without, a failed load, a slow load of another period, a failed refresh, and a change of person, and confirm at each moment whether the control is present and usable as FR-002 to FR-004 and FR-030 say (quickstart V10 to V12, V16, V19, V20).

### Tests for User Story 3 ⚠️

- [X] T039 [P] [US3] Extend `tests/ui/export-menu.test.ts` with failing tests (data-model.md, "State of the export control"; FR-003, FR-009, FR-030): when `setState('disabled')` or `setState('absent')` is called while the button or an item of the open menu has the focus, `onFocusLost` is called once, and when the focus is elsewhere it is not called; it is not called for the busy time of `onChoose`, after which the button still has the focus; nothing moves the focus when the state returns to `enabled`; the failure message is cleared by `setState('disabled')` and `setState('absent')`, and kept by `setState('enabled')` called again while already enabled
- [X] T040 [P] [US3] Extend `tests/ui/table.test.ts` with failing tests, one per row of the transitions table of data-model.md (FR-002 to FR-004): `showLoading()` with rows on screen → the button is disabled and an open menu is closed; `showLoading()` without rows → hidden; `clear()` → hidden; `showError(retry, true)` with rows on screen → enabled, and choosing a format hands out those rows; `showError(retry, false)` → hidden; `render` with rows after a load → enabled; a change of the sort order leaves an open menu and a shown message as they are; the `onFocusLost` option of `createTable` is called when the button had the focus and `showLoading()` or `clear()` is called
- [X] T041 [P] [US3] Extend `tests/ui/header.test.ts` with failing tests (FR-030; data-model.md, "Odśwież while a load runs"): `setBusy(true)` gives "Odśwież" `aria-disabled="true"` and `aria-busy="true"` and no `disabled` attribute; a click on it then does not call `onRefresh`; it keeps the keyboard focus through `setBusy(true)` and `setBusy(false)`; `setBusy(false)` removes `aria-disabled` and a click calls `onRefresh` again; `focusFallback()` focuses "Cofnij" when it is enabled and "Odśwież" when "Cofnij" is disabled, also while busy; update the existing tests of this file that expect the `disabled` attribute on "Odśwież"
- [X] T042 [P] [US3] Extend `tests/ui/app.test.ts` with failing tests (FR-002 to FR-006, FR-030; User Story 3): with the focus on "Eksport", a refresh that starts moves the focus to "Odśwież" on the first view (where "Cofnij" is disabled) and to "Cofnij" after the user changed the period once; with the focus in the "Od:" field a refresh moves nothing; when the rows are back the focus has not moved again; Escape with the menu open closes the menu and the panel stays open, and a second Escape minimises the panel; minimising and closing the panel close an open menu; after a refresh that fails with rows on screen, "*.csv" saves those rows; after a change of person the button is hidden until that person's rows are shown; an empty period hides the button; a view shown from memory without a load (a bar of the chart chosen inside the loaded period, then "Cofnij" and "Ponów") has the button enabled at once and exports the rows of that view (FR-002); a `saveFile` that throws shows `Nie udało się utworzyć pliku.`, saves nothing, leaves the rows, and the next activation of "Eksport" clears the message

### Implementation for User Story 3

- [X] T043 [US3] Change `src/ui/header.ts` (FR-030; contracts/ui.md, "Interfaces"): `setBusy(busy)` sets and removes `aria-disabled` and `aria-busy` on "Odśwież" and no longer sets the `disabled` attribute; its click handler does nothing while busy; add `focusFallback(): void` to `Header` ("Cofnij" when enabled, otherwise "Odśwież"); T041 passes
- [X] T044 [P] [US3] In `src/styles/app.scss`, give a button with `aria-disabled='true'` the same look as `:disabled` (the disabled strength, the default pointer, no hover colour), keeping the busy look of `.wt-button--busy`; check in both appearances that "Odśwież" during a load looks as before this feature
- [X] T045 [US3] Complete the states in `src/ui/table.ts` (data-model.md, transitions table): `showLoading()` sets `disabled` when rows are shown and `absent` otherwise; `clear()` and `showError(…, false)` set `absent`; `showError(…, true)` with rows on screen sets `enabled`; `sortBy` does not touch the menu; hand `options.onFocusLost` to `createExportMenu`; T040 passes
- [X] T046 [US3] Complete `src/ui/export-menu.ts` (FR-030; research R14): before `setState` disables or hides the button, look whether the active element of the button's root (`getRootNode()`) is the button or an item of the menu; if so, call `onFocusLost` after the change; the busy time of making a file is not a change of state and never calls it (the button is not disabled for it, T020); clear the failure message on `disabled` and `absent`; T039 passes
- [X] T047 [US3] Finish the wiring in `src/ui/app.ts`: `createTable({ onExport: …, onFocusLost: () => header.focusFallback() })`; make sure the `keydown` listener on the root that minimises on Escape is not reached while the menu is open (the menu stops the event; if the listener order makes that impossible, ask the table whether its menu is open, as is done for the pop-over); T042 passes
- [X] T048 [US3] Extend `tests/e2e/export.spec.ts` with the states (quickstart V10 to V12, V19; FR-002 to FR-004, FR-030; SC-006): a day without entries has no "Eksport" and the total row is as high as on a day with entries; with `delay=3000` a change of period disables "Eksport" under the spinner, closes an open menu, and enables it when the rows arrive; a refresh that fails with rows on screen leaves "Eksport" enabled and the CSV holds those rows (add the scenario to `tests/e2e/browser-gateway.ts` if none makes only the second load fail); with the focus on "Eksport" an automatic refresh puts the focus on "Odśwież" on the first view and on "Cofnij" after one change of period, and the focus is still there when the rows are back; and, in the dark and in the light appearance (set with the theme helper of `tests/e2e/helpers.ts`; constitution gate 4, FR-010, SC-008): the button, the open menu with its two items, and the failure message (made to appear by letting `URL.createObjectURL` throw in the page) are visible, and the text of each has a contrast of at least 4.5:1 against its painted background (`paintedColour` of the helpers)
- [X] T049 [P] [US3] Extend `tests/e2e/layout.spec.ts` (quickstart V16; FR-001, FR-005, FR-009): at 320 px the button, "Suma czasu:", and the total share one line, also when the text of the total is set to `999h 59m` in the page, and the page has no horizontal scroll; the open menu lies wholly inside the window and the panel at 320 px, in a panel at its lowest height (440 px), and in a panel that hangs below the launcher (store a launcher place near the top of the window before the page loads), and in each case it stands above the button; with `URL.createObjectURL` made to throw in the page, the failure message stands beside the button at 1280 px and under it at 320 px, and the total stands where it stood before the message in both
- [X] T050 [P] [US3] Extend `tests/e2e/a11y.spec.ts` (quickstart V20; FR-007, FR-008): the button and both items are at least 44 x 44 px in the `phone` project; each shows a focus ring when focused by keyboard; the accessible names are `Eksport`, `Eksport do pliku CSV`, `Eksport do pliku XLSX`; `aria-expanded` follows the menu; and update `tests/e2e/refresh.spec.ts`, which expects "Odśwież" to be `disabled` during a load, to expect `aria-disabled="true"`, no second load on a click, and the focus kept (FR-030)

**Checkpoint**: Every state of FR-002 to FR-004 and the focus rule hold. The feature is complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: The gates of the constitution, the documents, and the checks on real software.

- [X] T051 [P] Extend `tests/e2e/extension.spec.ts` (FR-012, SC-009): with the built extension on the faked Jira Cloud address, "*.csv" and "*.xlsx" each fire a download with the specified name; between the click on a format and the download no request leaves the page (count the requests the route handler sees); the manifest asks for no permission
- [X] T052 [P] Extend `tests/e2e/large-period.spec.ts` (SC-001): with a period of 500 tickets on screen, the time from the click on "*.xlsx" to the download event is under 2 seconds, and the file holds 500 ticket rows; the same for "*.csv"
- [X] T053 [P] Update the documents: `README.md` (the export in the list of features with its two formats and the file name; in the table of commands, `vp run build` builds twice and fails when the core is above 100 kB gzipped, the export code being measured and reported apart, constitution 3.1.0; the limits: sums are numbers only in the XLSX file, the browser decides where the file goes); `BrowserInstallation.md` (one line about the export, if the guide lists the features); `specs/001-worktime-panel/spec.md` (a line "Amended by 003-table-export (2026-11-13)": the total row of 001 FR-014 carries the export control at its left; "Odśwież" keeps the keyboard focus while a load runs); `specs/001-worktime-panel/contracts/ui.md` (the line "Odśwież is disabled while a load is running" becomes: switched off with the same look and announced as unavailable and busy, and able to hold the keyboard focus, 003 FR-030)
- [X] T054 Set the version `0.4.0` in `package.json`, `package-lock.json`, and `extension/manifest.json`; run `vp run check` from an upper-case drive path and fix what fails; write the three numbers of `scripts/check-size.ts` (whole, core, export) and the growth of the core against T001 into the "Constitution Check" row for Principle I in `specs/003-table-export/plan.md`
- [X] T055 [P] Retake the screenshots with `vp run screenshots` (`docs/screenshots/`): the total row now has "Eksport"; add one with the open menu if `scripts/screenshots.ts` takes named views
- [X] T056 Remove the "Sync Impact Report" comment from the top of `.specify/memory/constitution.md` before the constitution is committed (it is review scratch of the amendment to 3.1.0); the rest of the file stays as it is
- [X] T057 Go through `specs/003-table-export/quickstart.md` V1 to V21 on `vp dev --mode demo` in both appearances and at 320 px and 1280 px, and correct what differs
- [ ] T058 MANUAL: run the checks X12, X13, and X14 of `specs/003-table-export/research.md` on the final build (SC-003, SC-004, SC-010): X12 both formats from the installed extension on a real Jira Cloud page; X13 the XLSX file of a single day and of a month in Microsoft Excel, LibreOffice Calc, and Google Sheets: no warning, sums "6h 55m" and "38h 30m" adding up to the total, nothing cut at 100% zoom; X14 the CSV file of `special-titles` by double click in Excel with Polish regional settings: four columns, Polish letters, the dash and the middle dot right, `=1+1` shown as text; write the date and each result into `research.md`

---

## Implementation notes (2026-11-13)

All tasks are done except the three that need a person (T026, T038, T058). `vp run check`
passes: 499 unit and UI tests, 268 browser tests (13 skipped: views that do not exist on a
phone, 2 of them new), formatting, lint, and types. Sizes: whole 29.1 kB, core 25.2 kB of
100 kB, export code 3.8 kB (before the feature: 24.1 kB).

Where the work differs from the task list:

- T009 to T015: the tests were written before the code of their phase but run for the first
  time after it, so their first failing run was not watched. What they caught afterwards is
  listed below.
- T015, T036, T042: the tests of the whole add-on are in a file of their own,
  `tests/ui/app-export.test.ts`, as 002 did with `app-person.test.ts`, not in
  `tests/ui/app.test.ts`. `app.test.ts` changed only where the total row and "Odśwież" are
  asserted.
- T033: `src/export/palette.ts` was written in Phase 3, because the tests of the report
  already ask for the colour of the total.
- T020, T046: the button and its menu stand in one more element, `div.wt-export__anchor`,
  so the menu hangs on the button. Without it the menu took the whole width of the row; a
  screenshot showed that, no test did. `contracts/ui.md` names the element, and
  `tests/e2e/layout.spec.ts` now checks the width of the menu.
- T021: the padding of the total row went from 12 px to 8 px above and below, and the row
  is 51 px high (61 px on touch) with or without the button; before the feature it was
  46 px. The lowest panel (440 px) still shows one table row; the table area's minimum
  height went from 124 px to 130 px. The label and the value of the total are as high as a
  control and stand on the first line of the row, so a message that wraps under the button
  does not move them (FR-009).
- T044: buttons switched off with `aria-disabled` get no hover colour (the hover rule now
  leaves them out), and "Odśwież" keeps its "progress" pointer during a load.
- T024, T052: the fake Jira of the browser tests has the scenarios `special-titles` and
  `tickets-500`, and a switch `window.__jiraDown` that makes every later request fail.
- T053: `BrowserInstallation.md` lists no features, so it got no line about the export;
  the name of the zip file in it was still `0.2.0` and is now `0.4.0`.
- T057: V1 to V21 were gone through by the automated browser tests at 320 px and 1280 px
  and, for the control and the menu, in both appearances; the screenshot of the open menu
  was looked at. Nobody clicked through them by hand.

Found while implementing:

- The editor tools decode `\uXXXX` sequences when a file is written: the byte order mark,
  a no-break space, and the letter l with stroke landed in source files as themselves. They
  were turned back into escapes, and all sources were scanned for invisible characters.
- The formatter's fix removes a spread around a typed array (`[...bytes.slice(0, 4)]`),
  which changes what an equality test compares; such tests use `Array.from`.
- Waiting for a button to be "enabled" passes while it is still hidden; the browser tests
  wait for it to be visible first.

Checks on real software, as far as an agent could go (details in `research.md`):

- X12 (T026, T058): NOT done on a real Jira Cloud site. The built extension saves both
  files on a faked Jira address behind a strict content security policy
  (`tests/e2e/extension.spec.ts`), which is the risk X12 is about.
- X13 (T038, T058): done for Microsoft Excel 16 (pl-PL) through automation, NOT done for
  LibreOffice Calc and Google Sheets (neither is installed here).
- X14 (T058): done for Microsoft Excel 16 with Polish regional settings, through automation
  with the option that opens a file as a double click does.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: after Setup. Blocks every user story: all of them import `src/export/index.ts`, and the size gate must exist before the code grows.
- **User Story 1 (Phase 3)**: after Foundational.
- **User Story 2 (Phase 4)**: after User Story 1: it needs the report (T016), the menu, and the wiring.
- **User Story 3 (Phase 5)**: after User Story 1; independent of User Story 2. It can be built before or beside Phase 4.
- **Polish (Phase 6)**: after all three stories.

### User Story Dependencies

- **US1 (P1)**: starts after Phase 2. Delivers the control, the menu, the file name, and the CSV file.
- **US2 (P2)**: needs US1's `report.ts`, `index.ts`, and the control. Its own modules (`zip.ts`, `palette.ts`, `xlsx.ts`) touch no file of US3.
- **US3 (P2)**: needs US1's `export-menu.ts`, `table.ts`, and `app.ts`. It shares `app.ts` and `tests/ui/app.test.ts` with T036 of US2: do T036 before T042, or merge with care.

### Within Each User Story

- Tests are written and seen to fail before the code they test.
- `report.ts` before `csv.ts` and `xlsx.ts`; `zip.ts` and `palette.ts` before `xlsx.ts`; `export-menu.ts` before `table.ts`, `table.ts` before `app.ts`.
- Browser tests last: they need `vp build --mode demo`.

### Parallel Opportunities

- Phase 1: T002 beside T001.
- Phase 3: all seven test tasks T009 to T015 together, except that T009 and T010 share one file; then T017, T018, and T021 together once T016 exists.
- Phase 4: T027 to T031 together, except that T030 and T031 share one file; then T032 and T033 together.
- Phase 5: T039 to T042 together; T044 beside T043; T049 and T050 beside T048.
- Phase 6: T051, T052, T053, T055 together.

---

## Parallel Example: User Story 1

```bash
# Write the failing tests of User Story 1 together (different files):
Task: "T009 + T010 report and file-name tests in tests/unit/export-report.test.ts"
Task: "T011 CSV tests in tests/unit/export-csv.test.ts"
Task: "T012 download tests in tests/unit/export-download.test.ts"
Task: "T013 menu tests in tests/ui/export-menu.test.ts"
Task: "T014 table tests in tests/ui/table.test.ts"
Task: "T015 app tests in tests/ui/app.test.ts"

# After T016 (report.ts), the independent modules together:
Task: "T017 CSV text in src/export/csv.ts"
Task: "T018 download in src/export/download.ts"
Task: "T021 styles in src/styles/app.scss"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 and Phase 2: texts, the seam, the size gate.
2. Phase 3: the control and the CSV file.
3. Stop and validate: quickstart V1 to V5 and V17, and the check X12 on a real Jira page (T026). X12 is the one risk that could change the design of the download; it is settled here, before the larger half of the code is written.

### Incremental Delivery

1. Setup + Foundational → the add-on behaves as before; the build reports three sizes.
2. User Story 1 → the CSV export can be shown. Not released alone: "*.xlsx" answers with the failure message.
3. User Story 2 → both formats. First state that could be released.
4. User Story 3 → the control is right in every state and the focus is never lost. Release.
5. Polish → the gates of the constitution, the documents, version 0.4.0, and X12 to X14.

### Parallel Team Strategy

One developer is enough. With two, after Phase 3 one takes Phase 4 (`src/export/zip.ts`, `palette.ts`, `xlsx.ts` and their tests) while the other takes Phase 5 (`src/ui/` and its tests); they meet only in `src/ui/app.ts` and `tests/ui/app.test.ts` (T036 and T042, T047).

---

## Notes

- [P] tasks touch different files and do not wait for an unfinished task.
- Every task names the requirement it serves; when a task and the spec differ, the spec wins.
- Commit after each task or each small group of tasks; `vp test run` must be green at every checkpoint.
- Stop at any checkpoint to validate the story by itself.
- T026, T038, and T058 are open: they need a person with a real Jira Cloud site, LibreOffice Calc, and Google Sheets. What an agent could check of them is recorded in `research.md`.
- The Polish letters in the test tasks (T010, T011) are test data; they stay out of `src/` except `src/i18n/pl.ts`.
