# Contract: User Interface

**Feature**: [../spec.md](../spec.md) | **Mock-ups**: [../inspiration/](../inspiration/)

The fixed, testable surface of the interface: where it appears in Jira, every Polish text, and
every display format. Tests assert against this file.

## Entry points in Jira

| Module | Key | Title shown in Jira | Opens |
|--------|-----|---------------------|-------|
| `jira:globalPage` | `worktime-panel` | "Czas pracy" | the panel page |
| `jira:dashboardGadget` | `worktime-today` | "Czas pracy: dziś" | the gadget with today's total |
| `jira:command` (Preview) | `worktime-open` | "Czas pracy: otwórz panel" | the panel as a pop-up over the current Jira page; also bound to a keyboard shortcut |

The page and the pop-up are the same panel code. The pop-up variant adds a close button; the
page variant has none (FR-041, FR-049).

App scope: `read:jira-work` only. No functions, no external hosts, no `unsafe-inline`.

## Panel layout, top to bottom

1. Header: title line, subtitle, buttons "Odśwież", settings (gear), and, in the pop-up
   only, close.
2. Period row: previous arrow, six preset chips, next arrow.
3. Range row: "Od" and "Do" inputs, each a date and a time (native date-time input).
4. Progress bar with scale ticks and caption.
5. Table: "Zgłoszenie", "Tytuł", "Czas wpisów", "Suma".
6. Total row: "Suma czasu:" and the total.

## Texts

| Element | Text |
|---------|------|
| Subtitle | `Twój zalogowany czas` |
| Refresh button | `Odśwież` |
| Settings button (accessible name) | `Ustawienia` |
| Close button, pop-up only (accessible name) | `Zamknij` |
| Previous / next period (accessible names) | `Poprzedni okres` / `Następny okres` |
| Presets | `Dziś`, `Wczoraj`, `Ten tydzień`, `Poprzedni tydzień`, `Ten miesiąc`, `Poprzedni miesiąc` |
| Range labels | `Od`, `Do` |
| Table headers | `Zgłoszenie`, `Tytuł`, `Czas wpisów`, `Suma` |
| Total label | `Suma czasu:` |
| Weekdays | `Poniedziałek`, `Wtorek`, `Środa`, `Czwartek`, `Piątek`, `Sobota`, `Niedziela` |
| Loading | `Ładowanie…` |
| Empty state | `Brak wpisów czasu w wybranym okresie.` |
| Error state | `Nie udało się pobrać danych z Jiry.` |
| Retry action | `Spróbuj ponownie` |
| Range validation | `Początek „Od” nie może być późniejszy niż koniec „Do”.` |
| Settings title | `Ustawienia` |
| Interval field | `Odświeżaj co` … `min` |
| Interval hint | `0 = automatyczne odświeżanie wyłączone (domyślnie 5 min)` |
| Interval validation | `Podaj liczbę całkowitą od 0 do 1440.` |
| Theme switch | `Tryb ciemny` |
| Settings buttons | `Anuluj`, `Zapisz` |
| Settings not saved | `Nie udało się zapisać ustawień w tej przeglądarce.` |
| Gadget label | `Dziś:` |
| Gadget button | `Otwórz panel` |

## Formats

| Value | Format | Example |
|-------|--------|---------|
| Duration | hours unpadded, minutes two digits | `6h 55m`, `0h 45m`, `0h 00m`, `38h 30m` |
| Clock time | 24-hour `HH:MM` | `07:00` |
| Date (display) | `dd-mm-yyyy` | `06-11-2026` |
| Entry, single-day period | `HH:MM–HH:MM · duration` | `07:00–10:30 · 3h 30m` |
| Entry, multi-day period | `dd-mm HH:MM–HH:MM · duration` | `06-11 07:00–10:30 · 3h 30m` |
| Title, whole single day | `Weekday dd-mm-yyyy · total` | `Piątek 06-11-2026 · 10h 10m` |
| Title, part of a single day | `Weekday dd-mm-yyyy HH:MM–HH:MM · total` | `Piątek 06-11-2026 08:00–12:00 · 3h 30m` |
| Title, whole days | `dd-mm-yyyy – dd-mm-yyyy · total` | `02-11-2026 – 08-11-2026 · 38h 30m` |
| Title, multi-day with times | `dd-mm-yyyy HH:MM – dd-mm-yyyy HH:MM · total` | `02-11-2026 08:00 – 04-11-2026 16:00 · 20h 15m` |
| Caption, single day, norm reached | `total · norma 8h osiągnięta` | `10h 10m · norma 8h osiągnięta` |
| Caption, single day, below norm | `total · do normy 8h brakuje duration` | `6h 00m · do normy 8h brakuje 2h 00m` |
| Caption, multi-day | `total` | `38h 30m` |
| Total row | `Suma czasu: total` | `Suma czasu: 10h 10m` |
| Gadget | `Dziś: total` | `Dziś: 10h 10m` |

An entry that ends on the next day shows its end time only (`22:00–01:30`); it belongs to its
start day.

## Table structure

- One `<tr>` per ticket. Multiple entries of a ticket are separate lines inside the single
  "Czas wpisów" cell, never extra rows (FR-007).
- "Zgłoszenie": a link to `{siteUrl}/browse/{KEY}`, opened through the host router in a new
  tab. The key never wraps.
- "Tytuł": wraps inside its column; long unbroken words break (FR-036).
- "Suma": right-aligned, never wraps.
- Below 480 px width the table keeps all four pieces of information by stacking "Tytuł" under
  "Zgłoszenie" in the first column; nothing scrolls horizontally (FR-038).

## Progress bar

Single-day period (active):

- Scale 0 to 24h; ticks at 0, 4, 8, 12, 16, 24 hours; the 8h tick is emphasised.
- Fill from 0 to 8h: light blue to light green. Fill beyond 8h: yellow through orange to red
  (FR-016, FR-017).
- Title total, total row value, and gadget value use the colour from the data model's colour
  rule (FR-018).
- The bar exposes `role="progressbar"` with its minimum, maximum, current value, and the
  caption as its text.

Period longer than one day (inactive, FR-019):

- The same bar outline in light gray (`--wt-track`), with no fill and no emphasised norm tick.
- Title total and total row value use `--wt-text`.
- The bar is hidden from assistive technology (`aria-hidden`); the caption still states the
  total.

## Colour tokens (both themes define all of them)

`--wt-bg`, `--wt-surface`, `--wt-border`, `--wt-text`, `--wt-text-muted`, `--wt-link`,
`--wt-accent`, `--wt-focus`, `--wt-progress-blue`, `--wt-progress-green`,
`--wt-progress-yellow`, `--wt-progress-orange`, `--wt-progress-red`, `--wt-track`.

The five progress tokens may have different values per theme so that coloured text keeps a
contrast ratio of at least 4.5:1 against `--wt-surface` in each theme (FR-048, Principle IV).

## Interaction rules

- Every control is reachable by keyboard with a visible focus ring; touch targets are at least
  44 × 44 CSS pixels (Principle III).
- Settings: the gear toggles a popover inside the panel. `Escape` or a click outside closes it
  as "Anuluj". The theme switch previews immediately; "Zapisz" keeps, anything else reverts.
- Selecting a preset, editing "Od"/"Do", or pressing an arrow loads the new period at once.
- "Odśwież" is disabled while a load is running and shows the loading indication.
