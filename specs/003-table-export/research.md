# Research: Export of the Table to a File

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-13

Decisions R1 to R14. Three checks (X12 to X14) need a real browser, a real Jira site, and
real spreadsheet programs; they continue the numbering of 002 (X7 to X11) and are run during
implementation ([quickstart.md](quickstart.md)).

## R1. How the XLSX file is made

**Decision**: a writer of the project's own, in `src/export/`: the sheet, the styles, and the
package parts are built as XML text and packed into a ZIP container by a small ZIP writer.
No library.

**Rationale**:

- An XLSX file is a ZIP archive of a few XML parts. This sheet needs seven of them (R2) and
  a fixed set of about a dozen cell styles; the content is four columns of text.
- The project already writes ZIP by hand in `scripts/package.ts` and has no runtime
  dependency at all. Principle II still applies after the amendment to 3.1.0: a dependency
  needs a written justification, and "we do not want to write it" is not one when the
  writer is a few hundred lines.
- Every library that writes styles is far larger than the whole add-on today (24.0 kB
  gzipped), and it would run inside every Jira page of the user: a larger attack surface
  for code that sees the user's Jira session.

**Alternatives considered**:

| Alternative | Why not |
|-------------|---------|
| ExcelJS | Styles, merges, links: everything needed. Several hundred kB gzipped with its own dependencies (a ZIP library, a stream shim, a date library); many times the add-on. |
| SheetJS (community build) | Does not write cell styles (fill, border, font colour) in the free build. |
| A fork of SheetJS that writes styles | Unmaintained forks of an old release; no hyperlink styling; large. |
| write-excel-file | Small and writes most styles; one more package in the lock file and in the content script for what the project can write itself; hyperlinks and per-row heights are limited. |
| A "Microsoft Excel 2003 XML" or HTML table saved as `.xls` | Smaller code, but the user asked for `.xlsx`; Excel warns that format and extension differ (fails FR-026). |

The amendment of the constitution (the export code has no size limit) stays useful: the
plan does not have to prove a number in advance, and a later change of mind (a library) does
not need another amendment. With this decision the export code is expected to be 4 to 6 kB
gzipped.

## R2. The parts of the XLSX package

**Decision**: the smallest package the three target programs open without a warning:

| Part | Content |
|------|---------|
| `[Content_Types].xml` | defaults for `rels` and `xml`; overrides for the workbook, the sheet, the styles |
| `_rels/.rels` | the workbook |
| `xl/workbook.xml` | one sheet, named with the text of FR-020 |
| `xl/_rels/workbook.xml.rels` | the sheet and the styles |
| `xl/styles.xml` | fonts, fills, borders, cell formats (R4) |
| `xl/worksheets/sheet1.xml` | columns, rows, merged cells, hyperlinks, in the order the schema demands: `cols`, `sheetData`, `mergeCells`, `hyperlinks` |
| `xl/worksheets/_rels/sheet1.xml.rels` | one external relationship per ticket link |

Cell texts are inline strings (`t="inlineStr"`), so no shared-strings part is needed and
a text can never be read as a formula (FR-027). The sums are the only numbers (R13). No
document properties, no theme, no calculation chain.

**Rationale**: fewer parts are fewer places to be wrong. Excel is strict about the order of
the children of `worksheet`; the order above is the schema's. Inline strings are read by
Excel, LibreOffice Calc, and Google Sheets.

**Alternatives considered**: a shared-strings table (smaller files for repeated texts, but
ticket titles do not repeat); a `HYPERLINK()` formula for the ticket link (a formula cell,
against FR-027, and it shows an error in programs that block formulas).

## R3. The ZIP container

**Decision**: `src/export/zip.ts` writes a ZIP with *stored* (uncompressed) entries: local
headers, central directory, end record, CRC-32 from a table computed once, UTF-8 name flag,
and the time of the export in the entries. The result is one `Uint8Array`.

**Rationale**: stored entries are valid for XLSX and need no compressor, so the writer is
synchronous and about 60 lines. A report of 500 tickets is about 150 kB uncompressed, which
is small for a file the user saves once. `scripts/package.ts` shows the same layout with
Node's buffers; the browser version uses `DataView`.

**Alternatives considered**: `CompressionStream('deflate-raw')` of the platform (smaller
files, but asynchronous, and the CRC still has to be computed by hand; no gain a user would
notice); sharing code with `scripts/package.ts` (that script uses `node:zlib` and Node
buffers and is not shipped; the two stay separate).

## R4. Colours, fonts, and styles of the sheet

**Decision**: `src/export/palette.ts` holds the colours of FR-024 as one table of constants.
A unit test reads `src/styles/_tokens.scss` and asserts that every colour taken from the
light appearance equals its token (`--wt-text`, `--wt-text-muted`, `--wt-link`,
`--wt-person`, `--wt-accent`, `--wt-on-accent`, and the five `--wt-tone-*`). The border
colour `#9aa3b2` is the one value that is not a light token (it is `--wt-text-muted` of the
dark appearance); the test asserts that too. The font is Calibri 11 pt, with the sizes of
FR-021 for the three title rows.

The total of a single day is coloured as on screen: the two tones of the `ToneMix` the
summary already carries, in their light values, mixed by `ratio` channel by channel in sRGB.
Nothing logged is the muted colour; a longer period is the text colour.

**Rationale**: a spreadsheet cannot read the stylesheet's custom properties, and the file
must look the same in the dark appearance, so the values have to exist in script once. The
test keeps them from drifting from the tokens (Principle IV: one shared set of values).

**Alternatives considered**: reading the values at run time with `getComputedStyle` from a
hidden element forced to the light appearance (works only in a real browser, adds an element
for nothing, and cannot be unit-tested); a build step that generates the palette from the
SCSS (a second build tool for eleven values).

## R5. Column widths and row heights

**Decision**: widths in the character units of the format, from a base of 14 : 47 : 24 : 11
(the proportions of FR-023), then widened: "Zgłoszenie" to its longest ticket number plus 2,
"Czas wpisów" to its longest entry line plus 2, "Suma" to its longest sum plus 2 (the
header and "Suma czasu:" count as texts of their columns), and "Tytuł" to at least 10 more
than the widest of the other three. Every row gets an explicit height: 15 pt for each line,
where the lines of a ticket row are the larger of its number of entries and the estimated
number of lines of its title (length divided by 90% of the title column's width, rounded
up). The title rows are 21, 18, and 18 pt high; the header row 18 pt.

**Rationale**: the programs do not agree on when they fit a row to wrapped text on opening,
and merged cells are never fitted. Explicit heights make the file look the same everywhere
and make FR-023 testable from the XML. The estimate errs on the tall side.

**Alternatives considered**: no heights (the program decides: Excel fits most rows, Google
Sheets not always); measuring text with a canvas (exact for one font on one machine, and
the font of the reader's program is not known anyway).

## R6. The CSV text

**Decision**: `src/export/csv.ts` returns one string: U+FEFF, then the header and one line
per ticket, each ended with CR LF. A field is quoted when it holds `;` or `"` (and, as a
guard, CR or LF, which no field holds); quotes inside are doubled. A field whose first
character that is not white space is `=`, `+`, `-`, or `@` gets an apostrophe at its very
start (before the quoting rule is applied). The entries of a ticket are joined with `, `.
A title is made one line when the report is built: a tab or a line break becomes a space.
So one ticket is always one line of the text (clarified on 2026-11-13). The file is saved
as `text/csv;charset=utf-8`.

**Rationale**: this is the form Excel with Polish regional settings opens directly: the
semicolon is its list separator, and the mark at the start makes it read UTF-8. The
apostrophe is the usual guard against formulas in CSV.

**Alternatives considered**: Windows-1250 (Excel opens it without a mark, but the en dash
and the middle dot of the entries exist there only by luck, and every other program reads
it wrong); a `sep=;` first line (Excel-only, and it switches off the detection of UTF-8).

## R7. Saving the file from a content script

**Decision**: `src/export/download.ts` makes a `Blob`, a `blob:` address for it, and a
temporary `<a download="{name}">` inside the add-on's own root; it clicks the link, removes
it, and releases the address after a moment. Any exception counts as "the file could not be
made" (FR-009).

**Rationale**: it needs no permission and no extension API, so the manifest does not change
(FR-012), and it works the same on the stand-in page of the browser tests. The link is
placed inside the add-on's element, so nothing else on the Jira page is touched.

**Alternatives considered**: the `downloads` API of extensions (a new permission, which
disables the extension until the user approves the update, and a background worker the
add-on does not have); the File System Access API (`showSaveFilePicker`: not in Firefox,
and an extra dialog for every export).

**To confirm (X12)**: on a real Jira Cloud page the link is not blocked by the page's
content security policy and the file gets the given name.

## R8. Where the control lives and what it exports

**Decision**: the control is a small component, `src/ui/export-menu.ts`, placed in the
footer that `src/ui/table.ts` already owns. The table is the only part that knows the rows
on screen in their sort order, the period and summary they were rendered with, and whether
a spinner covers them; it sets the control's state (absent, disabled, enabled) in the same
four methods that change the table (`render`, `clear`, `showLoading`, `showError`) and
hands the view to a callback, `onExport(format, view)`. `src/ui/app.ts` adds the name of
the selected person and calls the export.

**Rationale**: the file must hold "the rows on screen", and the table's own state is the
definition of that. Taking the period from the table's last render, not from the
controller, makes a mismatch between rows and file name impossible (SC-006).

**Alternatives considered**: the control in `app.ts` with rows from the controller (the
controller does not know the sort order, and during a load its period is already the new
one); exporting from the DOM (texts only, no ticket addresses, and it breaks the day the
markup changes).

## R9. The menu

**Decision**: a button with `aria-haspopup="menu"` and `aria-expanded`, and a `role="menu"`
with two `role="menuitem"` buttons, absolutely placed above the button inside the footer.
Keys: Enter, Space, and Arrow Down on the button open it with the focus on the first item;
Arrow Up and Down move and wrap; Home and End jump; Enter and Space choose; Escape closes
and returns the focus to the button, stopping the event so the panel does not minimise; Tab
closes. A `pointerdown` outside closes it, with the listener on the document only while the
menu is open, as the settings pop-over does.

**Rationale**: this is the standard menu-button pattern, so screen readers announce it
correctly without extra text (FR-008). A native `<select>` was the literal "combobox" of
the request, but it shows a selected value, which is wrong for an action, cannot be styled
alike in both appearances, and opens a system list that ignores the 44 px rule.

## R10. Measuring the export code apart (constitution 3.1.0)

**Decision**: the production build stays one `content.js`. A second, quick build in a new
mode, `vp build --mode core`, replaces `src/export/index.ts` by a stub through a resolve
alias (the mechanism the `demo` mode already uses for the session gateway) and writes to
`dist-core/extension/`. `scripts/check-size.ts` then reports three numbers per build: the
whole script, the core (the build without the export code; this one must stay within
100 kB and fails the build otherwise), and the export code as the difference (reported, no
limit). `vp run build` runs both builds and the check.

**Rationale**: the constitution asks that the export code can be measured apart and that
the rest keeps its budget. Building once without it measures exactly "the rest", after
minification and with gzip, with ten lines of configuration and no change to how the
extension is loaded.

**Alternatives considered**: a separate file loaded on demand with a dynamic `import()` of
an extension address (needs `web_accessible_resources` and an extension API in a script
that uses none today, a second code path for the stand-in page, and it buys nothing for
5 kB; it stays possible later without touching the export code, because everything goes
through `src/export/index.ts`); summing module sizes from the bundler's output (sizes
before minification; not what is shipped).

## R11. The file name

**Decision**: `src/export/report.ts` builds the name of FR-017 and FR-018 from the full
name and the table's period: NFD decomposition, combining marks removed, the letter l with
stroke replaced in both cases, the forbidden characters and control characters removed,
runs of white space turned into one underscore, and dots and underscores at the ends
removed. A result above 100 characters is not cut: the surname alone (the last word) is
used, and when that is above 100 characters too, the name is left out (decided by the
requester on 2026-11-13). The whole file name so stays far below the 255 characters a file
system allows, even with a period that carries times. The dates
come from `formatDate` of `src/domain/format.ts`; a period with times adds `HHMM`. The two
regular expressions for marks follow `src/domain/person.ts`; the letter with stroke is
written as an escape, because no source file but `src/i18n/pl.ts` may hold Polish letters
(guarded by `tests/unit/i18n.test.ts`).

**Alternatives considered**: reusing `normaliseName` of `person.ts` (it also lower-cases,
which the file name must not).

## R12. Testing without spreadsheet programs

**Decision**: unit tests read the produced files back: the CSV as text; the XLSX through a
small reader of stored ZIP entries in the test helpers and the DOM parser of the test
environment, asserting cells, styles, merged cells, widths, heights, links, and colours.
Browser tests catch the download event, check the suggested name, and read the saved
bytes. That the three programs open the file without a warning (FR-026, SC-004) and that
Excel splits the CSV (FR-016, SC-003) is checked by hand once per release (X13, X14),
because no spreadsheet program is part of the toolchain.

**Alternatives considered**: a development dependency that reads XLSX (a parser accepts
files Excel rejects, so it would not prove FR-026 either); LibreOffice in the test run
(not available on every machine; a headless conversion says little about warnings).

## R13. Sums as numbers (clarified on 2026-11-13)

**Decision**: the "Suma" cell of each ticket row and the total of the total row are numeric
cells holding `minutes / 1440`, a fraction of a day, with the custom number format
`[h]"h" mm"m"`. The minutes are floored from the seconds exactly as `formatDuration` does.
The total is written as a value, not as a `SUM` formula.

**Rationale**: spreadsheet programs keep durations as fractions of a day, and the format
`[h]` counts hours beyond 24, so the cell reads "38h 30m" as on screen while `SUM`, sorting,
and the status bar work. Flooring to whole minutes first keeps the display equal to the
screen in every program, whatever it does with seconds. A value needs no recalculation and
is still there when a program opens the file with formulas blocked (FR-027).

**Alternatives considered**: minutes as a plain integer (adds up, but reads "415"); hours
as a decimal ("6,92"); a `SUM` formula in the total row (shows 0 until recalculated in some
viewers, and a formula cell is what FR-027 forbids).

**To confirm (X13)**: the three programs show the cells as "6h 55m" and "38h 30m" and add
them up to the total.

## R14. The focus when the control loses its use (clarified on 2026-11-13)

**Decision**: when the control is disabled or hidden while it, or an item of its menu, has
the focus, the focus is moved to the header: "Cofnij", or "Odśwież" when "Cofnij" is disabled
(FR-030). The export menu notices the case itself (it compares the root's active element
before it changes its state) and calls `onFocusLost`; the header gets one new method,
`focusFallback()`. The focus is not brought back when the control is enabled again.
"Odśwież" is switched off during a load with `aria-disabled` and a click handler that does
nothing, no longer with the `disabled` attribute, so it can take and keep the focus.

**Rationale**: a disabled or hidden button drops the focus to the page, and the next key
would go to Jira's own shortcuts. The header already solves the same problem between
"Cofnij" and "Ponów" (`setHistory`). The requester chose "Cofnij" as the target and
"Odśwież" for when "Cofnij" is disabled, which it is on the first view. The control loses
its use exactly when a load starts, and at that moment 001 disabled "Odśwież" too; a
button with the `disabled` attribute cannot be focused. Switching it off with
`aria-disabled` keeps everything a user sees and hears, and also ends an older flaw: a
refresh started from the keyboard no longer drops the focus to the Jira page.

**Alternatives considered**: a third target for when "Odśwież" is disabled ("Ponów", then
the close button: the first plan, replaced by the requester's choice); keeping the export
control itself focusable with `aria-disabled` (the focus would stay, but nothing was asked
for it, and the control also disappears altogether); returning the focus after the load (a focus
that jumps twice during an automatic refresh is worse than one that moves once).

## Checks on real software

| # | Check | How | Blocks |
|---|-------|-----|--------|
| X12 | The download works from the installed extension on a real Jira Cloud page, with the given file name | Install the built extension, open Jira, export both formats | release |
| X13 | The XLSX file opens without a warning or repair message in Excel, LibreOffice Calc, and Google Sheets; widths, heights, borders, colours, link as specified; the sums read "6h 55m" and "38h 30m" and add up to the total | Open one single-day and one month file in each; sum the "Suma" cells | release |
| X14 | The CSV file opens by double click in Excel with Polish regional settings: four columns, Polish letters, dash, and middle dot right; a title starting with `=` stays text | Open a file with the special titles of the test data | release |

### Results (2026-11-13, during implementation)

Checked by the implementing agent on the developer's machine (Windows, pl-PL, list separator
`;`, Microsoft Excel 16). A person still has to do what is marked "open".

| # | Result | How it was checked | Open |
|---|--------|--------------------|------|
| X12 | Not checked on a real Jira Cloud site. | The built extension, loaded into Chromium on a faked Jira address that sends a strict content security policy (`default-src 'self'; style-src 'self'; script-src 'self'`), saves both files under the specified names, shows no failure message, and sends no request (`tests/e2e/extension.spec.ts`). | The same on a real Jira Cloud page, signed in |
| X13 | Excel: confirmed. The file opens without a repair; a control file with the parts of the sheet in a forbidden order is refused by the same call, so the check tells the two apart. Excel shows: sheet "Raport"; A1 the name in Calibri 14 pt bold; A1:D1 merged; the header white on `#0C66E4`; a thin border; the sums as "6h 55m", "10h 10m", "11h 40m" with the number format `[h]"h" mm"m"` (shown by a Polish Excel as `[g]"h" mm"m"`); `SUM` of the ticket rows equal to the total row; the link of a ticket number; widths 14, 47, 24 (28 with dated entries), 11; row heights 21, 18, and 15 pt for each line. | Excel driven through automation, hidden and read-only, on a file of a single day and one of a week (`buildFile` on the recorded test data). | LibreOffice Calc and Google Sheets: not installed here, not checked |
| X14 | Confirmed for Excel 16 with Polish regional settings: four columns; "Zgłoszenie", "Tytuł", "Czas wpisów", "Suma"; the Polish letters, the dash, and the middle dot are right; no cell is a formula. | Excel driven through automation with the option `Local`, which opens a CSV file with the regional settings, as a double click does. | A real double click on the file of the scenario `special-titles` (a title `=1+1`) |

Independent of the project's own code, Python's `zipfile` recomputed every checksum of both
XLSX files without an error, and every part parsed as well-formed XML.
