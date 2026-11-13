# Contract: The Report Files

**Feature**: [spec.md](../spec.md) | **Data**: [data-model.md](../data-model.md)

What the two files contain, byte for byte where it matters. The tests assert this contract.
`Report` and `ReportRow` are defined in the data model.

## CSV (`{fileBase}.csv`, FR-013 to FR-016)

```text
file    = BOM header line*
BOM     = U+FEFF
header  = "Zgłoszenie;Tytuł;Czas wpisów;Suma" CRLF
line    = field ";" field ";" field ";" field CRLF
CRLF    = U+000D U+000A
```

- Encoding: UTF-8. Saved with the type `text/csv;charset=utf-8`.
- One `line` per `ReportRow`, in order. Nothing follows the last line.
- The four fields: `key`, `title`, `entries` joined with `", "` (comma, space), `sum`.
- `title` is already one line when it reaches the writer (data model, "ReportRow"): no
  tab, no line break, no other control character. Every ticket is therefore one line of
  the file (FR-014).
- A field is written in two steps:
  1. When its first character that is not white space (U+0020, U+00A0, U+0009) is `=`,
     `+`, `-`, or `@`: an apostrophe (`'`) is put at the very start of the field, before
     that white space.
  2. When it holds `;` or `"`: it is put in quotation marks and each `"` inside is
     doubled. Otherwise it is written as it is. The writer applies the same to a field
     with U+000D or U+000A, although no field holds one.
- The header texts come from `pl.columns` and are written by the same two steps.

Example (two tickets, the second with two entries and a title with a semicolon and quotes):

```text
Zgłoszenie;Tytuł;Czas wpisów;Suma
AM-101;Poprawka logowania;07:00–10:30 · 3h 30m;3h 30m
AM-102;"Raport; wersja ""B""";10:30–12:00 · 1h 30m, 13:00–14:55 · 1h 55m;3h 25m
```

A title `=1+1` is written `'=1+1`; a title ` -5 dni` (a space first) is written
`' -5 dni`; a title `-test; a` is written `"'-test; a"`.

## XLSX (`{fileBase}.xlsx`, FR-020 to FR-027)

Saved with the type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

### Container

A ZIP archive with stored (uncompressed) entries, UTF-8 names, and these parts in this
order:

1. `[Content_Types].xml`
2. `_rels/.rels`
3. `xl/workbook.xml`
4. `xl/_rels/workbook.xml.rels`
5. `xl/styles.xml`
6. `xl/worksheets/sheet1.xml`
7. `xl/worksheets/_rels/sheet1.xml.rels` (left out, with its reference, when no row has a link)

Every part starts with `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`. In text
and attributes `&`, `<`, `>`, and `"` are escaped; characters XML 1.0 does not allow are
removed.

### Sheet

One sheet, named `Raport` (`pl.exportSheet`). With `n` ticket rows:

| Row | A | B | C | D | Merged | Height |
|-----|---|---|---|---|--------|--------|
| 1 | `name` | | | | A1:D1 | 21 pt |
| 2 | `period` | | | | A2:D2 | 18 pt |
| 3 | `Suma czasu: ` + `total` | | | | A3:D3 | 18 pt |
| 4 | (empty row) | | | | | default |
| 5 | `Zgłoszenie` | `Tytuł` | `Czas wpisów` | `Suma` | | 18 pt |
| 6 … 5+n | `key` (link to `url`) | `title` | `entries` joined with a line feed | `minutes` as a duration | | 15 pt × lines |
| 6+n | (empty, bordered) | (empty, bordered) | `Suma czasu:` | `totalMinutes` as a duration | | 18 pt |

- Every cell with text is an inline string (`t="inlineStr"`, `xml:space="preserve"`).
- The cells of column D from row 6 to row 6+n are numbers (FR-025): the value is
  `minutes / 1440` (a fraction of a day, the unit spreadsheet programs keep time in), with
  the number format `[h]"h" mm"m"`, which shows `415 / 1440` as `6h 55m` and
  `2310 / 1440` as `38h 30m`. They read exactly as `sum` and `total` do.
- No cell holds a formula; the total is a value. A3 holds label and total as one text.
- `lines` of a ticket row = the larger of `entries.length` and
  `ceil(title.length / floor(widthB × 0.9))`, at least 1.
- Links: one `<hyperlink ref="A{row}" r:id="rId{i}"/>` per row whose `url` starts with
  `http://` or `https://`, with an external relationship to that address. A row without
  such an address keeps style 6 and gets no link.
- A1 is written also when `name` is empty: an empty merged cell with its height.
- A ticket without a title gives an empty cell B with its border.
- Order of the children of `worksheet`: `cols`, `sheetData`, `mergeCells`, `hyperlinks`.

### Column widths

In the character units of the format, with `len` the number of characters:

| Column | Width |
|--------|-------|
| A | `max(14, longest key + 2, len("Zgłoszenie") + 2)` |
| C | `max(24, longest entry line + 2, len("Suma czasu:") + 2)` |
| D | `max(11, longest sum + 2, len(total) + 2)` |
| B | `max(47, max(A, C, D) + 10)` |

### Styles

Font Calibri. "Border" is a thin line on all four sides in the border colour. Vertical
alignment is top where not stated.

| # | Used by | Font | Fill | Border | Alignment |
|---|---------|------|------|--------|-----------|
| 0 | default, row 4 | 11 pt, text | | | |
| 1 | A1 (name) | 14 pt bold, name colour | | | left, centre |
| 2 | A2 (period) | 12 pt bold, text | | | left, centre |
| 3 | A3 (total) | 12 pt bold, total colour | | | left, centre |
| 4 | A5 to C5 (header) | 11 pt bold, header text | header fill | yes | left, centre |
| 5 | D5 (header "Suma") | 11 pt bold, header text | header fill | yes | right, centre |
| 6 | key | 11 pt bold, link colour | | yes | left, top |
| 7 | title | 11 pt, text | | yes | left, top, wrap |
| 8 | entries | 11 pt, muted | | yes | left, top, wrap |
| 9 | sum (number, duration format) | 11 pt, text | | yes | right, top |
| 10 | total row, C (label) | 11 pt bold, total colour | | yes | right, centre |
| 11 | total row, A and B | 11 pt, text | | yes | |
| 12 | total row, D (number, duration format) | 11 pt bold, total colour | | yes | right, centre |

The duration format is one custom number format of the styles part, `[h]"h" mm"m"`, used by
styles 9 and 12 only. The width of column D is still computed from the texts `sum` and
`total`, which are what the cells show.

The entries cell wraps only so that its line feeds are shown; column C is wide enough that
no entry line wraps by itself.

### Colours

Defined once in `src/export/palette.ts`; a test compares them with `_tokens.scss`.

| Name | Value | Token of the light appearance |
|------|-------|-------------------------------|
| text | `#172033` | `--wt-text` |
| muted | `#5a6475` | `--wt-text-muted` |
| link | `#0b5cd7` | `--wt-link` |
| name | `#b84e00` | `--wt-person` |
| header fill | `#0c66e4` | `--wt-accent` |
| header text | `#ffffff` | `--wt-on-accent` |
| border | `#9aa3b2` | none (the muted text of the dark appearance) |
| tone blue | `#0a6199` | `--wt-tone-blue` |
| tone green | `#146c43` | `--wt-tone-green` |
| tone yellow | `#7a5200` | `--wt-tone-yellow` |
| tone orange | `#a34100` | `--wt-tone-orange` |
| tone red | `#b3261e` | `--wt-tone-red` |

Total colour, from the `PeriodSummary` of the view:

| Case | Colour |
|------|--------|
| `totalSeconds === 0` | muted |
| `colour === null` (a period longer than one day) | text |
| `colour = { from, to, ratio }` | each of red, green, blue: `round(from + (to − from) × ratio)` of the two tones |

In the file a colour is written as `FF` followed by its six hex digits in capitals
(`FF172033`).

## File name

See the data model ("File name"). The name is given to the browser as the `download` name
of the link; the browser may change it by its own rules when a file of that name exists.
