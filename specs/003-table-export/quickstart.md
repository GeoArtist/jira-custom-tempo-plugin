# Quickstart: Export of the Table to a File

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to run and validate the feature. Formats and markup are in
[contracts/files.md](contracts/files.md) and [contracts/ui.md](contracts/ui.md); they are
not repeated here.

## Prerequisites

- Node as in `.node-version`; dependencies installed with `vp install`.
- On Windows, run the commands from a path with an upper-case drive letter
  (`cd /E/...`), or the unit test files are not found.
- For X12 to X14: Chrome or Edge, a Jira Cloud site with logged time, Excel with Polish
  regional settings, LibreOffice Calc, and a Google account for Google Sheets.

## Commands

| Command | What it does | Expected |
|---------|--------------|----------|
| `vp dev --mode demo` | The stand-in Jira page with the add-on, live, at `http://127.0.0.1:5173/` | The panel opens; "Eksport" stands at the left of the total row |
| `vp test run` | Unit and UI tests | All pass, including `tests/unit/export-*.test.ts` and `tests/ui/export-menu.test.ts` |
| `vp run build` | Builds the extension, builds it once more without the export code, and checks the size | Three numbers: the whole script, the core (at most 100 kB gzipped, or the build fails), the export code (reported, no limit) |
| `vp run test:e2e` | Browser tests on the stand-in page and with the built extension | All pass, including `tests/e2e/export.spec.ts` |
| `vp run check` | The full merge gate | All pass |

## Validation scenarios

On the stand-in page (`vp dev --mode demo`, add `?scenario=…` as in the other specs) unless
stated. The fake Jira's today is Friday 06-11-2026.

| # | Do | Expect | Spec |
|---|----|--------|------|
| V1 | Open the panel on today | "Eksport" at the left of the total row; "Suma czasu:" and the total at the right; the row is as high as on an empty day | FR-001 |
| V2 | Press "Eksport" | A menu opens above it with "*.csv" then "*.xlsx" | FR-005 |
| V3 | Choose "*.csv" | The browser saves `{name}_06-11-2026_tempo_report.csv`; the menu is closed; the focus is on "Eksport" | FR-005, FR-017 |
| V4 | Open that file in a text editor | First line `Zgłoszenie;Tytuł;Czas wpisów;Suma`; one line per row on screen, in the same order; lines end with CR LF; the file starts with the UTF-8 mark | FR-013, FR-016 |
| V5 | Sort by "Suma" descending, export "*.csv" again | The lines follow the new order | FR-011 |
| V6 | Choose "*.xlsx" and open the file | Rows 1 to 3: name, "Piątek 06-11-2026", "Suma czasu: …"; row 4 empty; blue header with white bold text; one row per ticket; total row at the bottom; borders from the header to the total row | FR-020 to FR-022 |
| V7 | In that file, look at a ticket with two entries and at the ticket number | The entries stand on two lines in one cell; the number is a blue bold link that opens the ticket | FR-021 |
| V21 | In that file, select the "Suma" cells of all ticket rows | The program's sum equals the total row; each cell reads as on screen ("3h 30m"), and a total above 24 hours reads "38h 30m" | FR-025 |
| V8 | Select "Miesiąc", export both formats | The name holds `01-11-2026_30-11-2026`; each entry starts with its date; the totals in the XLSX file are in the text colour | FR-018, FR-024 |
| V9 | Set "Od" 08:00 and "Do" 12:00 of one day, export | The name ends `…_06-11-2026_0800_06-11-2026_1200_tempo_report.…`; row 2 of the XLSX file names the times | FR-018, FR-020 |
| V10 | Select a day without entries | No "Eksport"; the total row keeps its height | FR-002 |
| V11 | With `?delay=3000`, change the period | "Eksport" is disabled while the spinner shows, and enabled when the rows arrive; a menu that was open closes | FR-003 |
| V12 | Use the scenario where a refresh fails, with rows on screen | "Eksport" stays enabled and saves those rows | FR-004 |
| V13 | In the settings choose another person, save, export | The file name and row 1 carry that person's name, without Polish letters in the file name | FR-017, 002 |
| V14 | Keyboard only: Tab to "Eksport", Enter, Arrow Down, Escape; then Enter, Enter | Escape closes the menu and the panel stays; the second pass saves the CSV file | FR-006, FR-007 |
| V15 | Switch to the dark appearance, export "*.xlsx" | The file is identical in look to one made in the light appearance | FR-024 |
| V16 | At 320 px width (device toolbar), open the menu | Button and total on one line; the menu inside the window; each target at least 44 px high | FR-005, FR-007 |
| V17 | Export the test data `special-titles`: titles `=1+1`, ` -5 dni` (a space first), `Raport; wersja "B"`, one with a line break, one empty | CSV: `'=1+1`, `' -5 dni`, `"Raport; wersja ""B"""`, the line break as a space, an empty field; one line per ticket. XLSX: all shown as text, the empty title as an empty bordered cell | FR-011, FR-013 to FR-015, FR-027 |
| V19 | Tab to "Eksport", then wait for an automatic refresh (interval 1 min, `?delay=3000`) | The button is disabled and the focus is on "Cofnij"; on the first view, where "Cofnij" is disabled, it is on "Odśwież", which shows its loading sign and ignores Enter. The focus stays there when the rows are back | FR-030 |
| V20 | With a screen reader, or in the accessibility tree, look at "Eksport" and its menu | The button announces whether the menu is open; the items read "Eksport do pliku CSV" and "Eksport do pliku XLSX" | FR-008 |
| V18 | Watch the network panel while exporting | No request is sent | FR-012 |

## Checks on real software (once per release)

| # | Do | Expect |
|---|----|--------|
| X12 | Install `dist/extension` in Chrome, open a Jira Cloud page with logged time, export both formats | Both files are saved under the specified names; the console shows no content-security-policy error |
| X13 | Open the XLSX file of a single day and of a month in Excel, LibreOffice Calc, and Google Sheets | No warning and no repair message; at 100% zoom no ticket number, entry line, or sum is cut or wrapped; every title and entry is fully visible without resizing |
| X14 | Double-click the CSV file of V17 in Excel with Polish regional settings | Four columns; Polish letters, the dash, and the middle dot are right; `=1+1` is shown as text |

Write the date and the result of X12 to X14 into [research.md](research.md), as 002 did for
X7 to X11.

## Size

After `vp run build`, copy the three numbers into the "Constitution Check" row for
Principle I in [plan.md](plan.md): the whole script, the core, and the export code.
