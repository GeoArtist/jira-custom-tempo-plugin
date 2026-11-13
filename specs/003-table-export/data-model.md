# Data Model: Export of the Table to a File

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-13

Nothing is stored. Every type below lives for one export, in memory. The types of 001 and
002 that are read (`TicketRow`, `TimeEntry`, `Period`, `PeriodSummary`, `ToneMix`, `Person`)
do not change.

## ShownView (in `src/ui/table.ts`)

What the table has on screen. The table keeps it from its last `render`; it is the only
source of an export (FR-011).

| Field | Type | Meaning |
|-------|------|---------|
| `rows` | `TicketRow[]` | the rows on screen, already in the sort order on screen |
| `period` | `Period` | the period these rows were rendered for |
| `timeZone` | `string` | the time zone the entries are shown in |
| `summary` | `PeriodSummary` | the total and its colour, as shown in the total row |

Rules:

- It exists only while the table shows rows (`rows.length > 0`). `clear()` and
  `showError(…, false)` drop it.
- `period` is the table's, not the controller's: while a new period loads, the controller
  already holds the new one and the table still shows the old rows (001 FR-060). The control
  is disabled then (FR-003), and the period of a later export is again the table's.

## ExportView (input of `src/export/index.ts`)

`ShownView` plus `personName: string`, the full name of the selected person as Jira has it
(empty when Jira gives none, 002 FR-010). Added by `src/ui/app.ts`.

## ExportFormat

`'csv' | 'xlsx'`. Chosen for every export; never stored (FR-005).

## Report (in `src/export/report.ts`)

The view turned into the texts both files hold. Built once per export by
`buildReport(view)`; pure, no DOM.

| Field | Type | Source |
|-------|------|--------|
| `name` | `string` | `personName`, unchanged (with its Polish letters) |
| `period` | `string` | `formatTitle(period)`: the title of the panel without the total |
| `total` | `string` | `formatDuration(summary.totalSeconds)` |
| `totalMinutes` | `number` | `floor(summary.totalSeconds / 60)`: the whole minutes that `total` shows; the number of the XLSX total row (FR-025) |
| `totalColour` | `string` (hex) | from `summary`: the mixed light tones for a single day, the muted colour for 0, the text colour otherwise ([contracts/files.md](contracts/files.md), "Colours") |
| `rows` | `ReportRow[]` | one per row of the view, same order |
| `fileBase` | `string` | the file name without its ending (below) |

### ReportRow

| Field | Type | Source |
|-------|------|--------|
| `key` | `string` | `ticket.key` |
| `url` | `string` | `ticket.url`; used by the XLSX link only |
| `title` | `string` | `ticket.title` made one line (FR-011): every tab, carriage return, and line feed (a carriage return with its line feed counts once) becomes one space; other control characters (U+0000 to U+001F, U+007F) are removed. May be empty |
| `entries` | `string[]` | `formatEntry(entry, period, timeZone)` for each entry, in the row's order; never empty |
| `sum` | `string` | `formatDuration(totalSeconds)`; the CSV field, and the width of the XLSX column |
| `minutes` | `number` | `floor(totalSeconds / 60)`: the whole minutes that `sum` shows; the number of the XLSX cell (FR-025) |

Validation:

- `minutes` and `totalMinutes` are whole and not negative. They are floored like
  `formatDuration`, so a cell always reads as the screen does. With entries of whole minutes
  the `minutes` of the rows add up to `totalMinutes`.

- `rows` is never empty: the control does not exist without rows (FR-002). `buildReport`
  still returns a valid report for no rows, so the functions are total.
- Texts are taken as they are shown; only `title` is cleaned, once, here, so both files
  get the same text. The XLSX writer still removes any character XML cannot carry from
  every text it writes, as a second guard.
- `url` is written as a link only when it starts with `https://` or `http://`.

### File name (`fileBase`)

`{name}_{range}_tempo_report`, or `{range}_tempo_report` when the name is empty after
cleaning or left out as too long (FR-017, FR-018).

`{name}`, from `personName`, in this order:

1. Unicode decomposition (NFD); combining marks removed. The letter l with stroke, small
   and capital, replaced by `l` and `L`. Letters that do not decompose (ß, ø, đ) and
   letters of other alphabets stay.
2. Removed: `\ / : * ? " < > |` and control characters.
3. White space trimmed at the ends; every run of white space becomes one `_`.
4. Dots and underscores removed at the start and at the end.
5. Longer than 100 characters (`MAX_FILE_NAME_PART`): the surname alone, which is what
   follows the last `_` (the whole result when it has no `_`). Still longer than 100: the
   name is left out. Nothing is ever cut inside a word.

`{range}`, from `period`, with `dd-mm-yyyy` dates:

| Period | `{range}` |
|--------|-----------|
| whole days, one day (`isWholeDays` and `isSingleDay`) | `13-11-2026` |
| whole days, several | `01-11-2026_30-11-2026` |
| anything else | `13-11-2026_0800_13-11-2026_1200` (both ends, date `_` `HHMM`) |

Examples:

| `personName` | Period | `fileBase` |
|--------------|--------|-----------|
| `Jan Kowalski` | 13-11-2026 | `Jan_Kowalski_13-11-2026_tempo_report` |
| `Józef Śliwiński` | 01-11-2026 – 30-11-2026 | `Jozef_Sliwinski_01-11-2026_30-11-2026_tempo_report` |
| `Anna Maria  Nowak-Kowalska` | 13-11-2026 08:00–12:00 | `Anna_Maria_Nowak-Kowalska_13-11-2026_0800_13-11-2026_1200_tempo_report` |
| `Łukasz Żółć` | 13-11-2026 | `Lukasz_Zolc_13-11-2026_tempo_report` |
| (empty) | 13-11-2026 | `13-11-2026_tempo_report` |
| `???` | 13-11-2026 | `13-11-2026_tempo_report` |
| `.Jan  Kowalski.` | 13-11-2026 | `Jan_Kowalski_13-11-2026_tempo_report` |
| 90 letters of first names, then ` Nowak-Kowalska` | 13-11-2026 | `Nowak-Kowalska_13-11-2026_tempo_report` |
| one word of 120 letters | 13-11-2026 | `13-11-2026_tempo_report` |
| first names, then a surname of 120 letters | 13-11-2026 | `13-11-2026_tempo_report` |

## ReportFile (output of `src/export/index.ts`)

| Field | Type | CSV | XLSX |
|-------|------|-----|------|
| `name` | `string` | `{fileBase}.csv` | `{fileBase}.xlsx` |
| `mime` | `string` | `text/csv;charset=utf-8` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `data` | `string \| Uint8Array` | the text of [contracts/files.md](contracts/files.md) | the ZIP bytes |

## State of the export control (in `src/ui/table.ts` and `src/ui/export-menu.ts`)

| State | Control | Menu | When |
|-------|---------|------|------|
| absent | not shown; its place in the footer is kept | closed | no `ShownView`: before the first load, empty state, error without rows, emptied for a change of person |
| disabled | shown, disabled | closed | a spinner covers the rows (`showLoading`) |
| enabled | shown | closed or open | rows on screen and no spinner, also under the error message of a failed refresh |

Making a file is not one of these states: the button stays "enabled" here and is switched
off for that moment with `aria-disabled` and `aria-busy`, without the `disabled` attribute,
so it keeps the focus (FR-009).

Transitions, by the table's own methods:

| Call | Result |
|------|--------|
| `render(rows.length > 0)` | enabled; the failure message is cleared |
| `render(rows.length === 0)` | absent |
| `clear()` | absent |
| `showLoading()` | disabled when rows are shown, otherwise absent; an open menu closes |
| `showError(…, keepRows = true)` with rows on screen | enabled |
| `showError(…, keepRows = false)` | absent |

The menu itself: closed → open (button activated) → closed (item chosen, Escape, Tab,
pointer outside, button again, state leaves "enabled", panel hidden). Choosing an item
calls `onExport(format, shownView)` once. When the callback throws, the failure message of
FR-009 is shown until the next activation of the button, the start of a load, or new or
removed rows; a change of the sort order leaves it.

Focus (FR-030): when the state goes from "enabled" to "disabled" or "absent" while the
button or an item of the menu has the focus, the menu calls `onFocusLost()`; `app.ts`
passes it to the header, which focuses "Cofnij", or "Odśwież" when "Cofnij" is disabled.
"Odśwież" can always take it: while a load runs it is switched off with `aria-disabled`,
not with the `disabled` attribute, so it keeps the focus (below). The busy time of making
a file is not a change of state in this sense: the button keeps the focus. Nothing brings
the focus back when the state returns to "enabled".

## "Odśwież" while a load runs (in `src/ui/header.ts`, changed by FR-030)

| | Before | Now |
|---|--------|-----|
| Switched off by | the `disabled` attribute | `aria-disabled="true"`; no `disabled` attribute |
| Look | disabled, with the loading sign | the same |
| Activation (click, Enter, Space) | not possible | ignored: no second load starts |
| Announced as | unavailable, busy | the same (`aria-disabled`, `aria-busy`) |
| Keyboard focus | lost to the page when the load starts | kept; can also be given to it |

## Relations to existing data

```text
Controller ──render──▶ Table (ShownView) ──onExport(format, view)──▶ app.ts
                                                                      │ adds choice.person.displayName
                                                                      ▼
                                                    export/index.ts: buildFile(view, format, now)
                                                      report.ts ─▶ csv.ts │ xlsx.ts ─▶ zip.ts
                                                                      ▼
                                                    export/download.ts: saveFile(file, root)
```

No request to Jira and no write to storage happens anywhere on this path (FR-012).
