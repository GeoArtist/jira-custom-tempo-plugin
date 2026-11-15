# Contract: User Interface

**Feature**: [../spec.md](../spec.md) | **Mock-ups**: [../inspiration/](../inspiration/)

The fixed, testable surface of the interface: where it appears, every Polish text, and every
display format. Tests assert against this file.

## Where it appears

The add-on is a browser extension. On every Jira Cloud page (`https://*.atlassian.net/*`,
except Confluence under `/wiki/`) of a signed-in user it draws two things on top of the page,
as in the first mock-up:

| Part | Position | Behaviour |
|------|----------|-----------|
| Launcher | fixed; by default 88 px from the right edge with its middle 48 px above the bottom edge, level with Jira's own corner button and clear of it (FR-069); the user drags it anywhere in the window (FR-072) | always visible; shows the total of the period the panel is on (today until another is selected); opens and minimises the panel; changes colour under the pointer |
| Panel | hangs on the launcher: above it, or below it when there is no room above (FR-072) | hidden until opened; opens on today on a new page and after the close button, on the kept period after minimising |

Everything is drawn inside one host element (`#jira-custom-tempo`) with a shadow root, so
Jira's styles and the add-on's styles cannot affect each other. The add-on changes nothing
else on the page. When nobody is signed in to Jira, it draws nothing.

Extension permissions: none. It only declares the Jira Cloud pages it runs on.

Icon: `extension/icons/icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`, drawn from
`scripts/icon.svg` with `vp run icons` (FR-067).

## Panel layout, top to bottom

0. Grips on the panel's free edges, the ones away from the launcher (by default the top and
   the left): drag the top edge to set the height (FR-059), the side edge to set the width,
   the corner to set both (FR-071).
1. Header, in two rows at every width (changed by 004; the markup, the sizes, and the
   behaviour are in [the UI contract of 004](../../004-reset-button-toolbar/contracts/ui.md)).
   The title row: the title line at the left and, at the right, minimise (a line at the foot
   of the button, FR-086) and close. The toolbar, centred, 32 px lower than the usual gap:
   back, forward (curved arrows, FR-082), "Odśwież", "Resetuj" (a house), settings
   (gear). No subtitle (FR-070).
2. Period box, one light frame (FR-055, FR-084). Left of the rows the previous-period button,
   right of them the next-period button: circles of one control (32 px; 44 px on touch)
   with a chevron, 8 px from the widest row, each at the middle of the height of the three
   rows. The rows with the two buttons are centred in the frame; the buttons do not go to
   its ends. At
   600 px and narrower the two stand side by side above the rows, each in the middle of its
   half of the box.
   Between them three rows, each centred and packed with 8 px gaps:
   1. "Dzień:" with a native date input;
   2. "Dzień", "Tydzień", "Miesiąc", "Rok": the current day, week, month, and year. The one
      for the kind of period on screen is shown selected (FR-085);
   3. "Od:" and "Do:" inputs, each a date and a time (native date-time input).
3. Progress bar with scale ticks and nothing written under it. It stands midway between the
   period box and the table: 24 px above the bar and 24 px below its scale (FR-020, FR-066).
   For a period longer than one day the bar chart stands here instead (FR-076).
4. Table: "Zgłoszenie", "Tytuł", "Czas wpisów", "Suma". Each header is a button that sorts.
5. Total row: "Suma czasu:" and the total, together at the right edge, in one colour (FR-062).
   Since 004 the row also has, at its left edge, the name of the plugin with its version,
   small, grey, and slanted, and in its middle the export control of 003 (004 FR-023,
   FR-025).

The panel has the size the user chose, whatever it shows. Width: 800 px by default, never
less than 640 px (ticket numbers, entry times, and sums stay on one line each) and never more
than the window allows (FR-071). Height: 50svh by default, never less than 592 px (one table
row stays visible) and never more than the window allows (FR-059). On screens 600 px and wider
the table area takes the height that is left: the rows scroll inside it, a short table sits at
its top with the rest empty (FR-061), and the header, the period box, and the total row stay
in view. Below 600 px the whole panel scrolls.

## Launcher and panel placement

- The launcher stands 88 px from the window's right edge with its middle 48 px above the
  bottom edge, level with Jira's own corner button and clear of it. The user drags it
  anywhere in the window, or moves it with Shift + arrow keys in 16 px steps; the place is
  remembered (FR-072). A press that travels less than 4 px is a click.
- The panel hangs on the launcher through CSS anchor positioning: its bottom-right corner
  stands 8 px above the launcher's top-right corner. With no room above, the panel goes
  below the launcher (its top-right corner under the launcher's bottom-right corner); with
  no room to the left it lines up with the launcher's left edge. In a window too narrow for
  either, the panel stays inside the window, still above or below the launcher.
- The panel and the launcher always fit into the window together (FR-075). The panel's height
  is the chosen one, but not more than the larger of the two rooms beside the launcher: from
  the launcher up to the window's top edge, and down to its bottom edge, each less the 8 px
  gap and the 16 px edge. The stylesheet works both out from the launcher's offsets, so the
  panel gets lower by itself while the launcher is dragged or the window is resized. Below
  the height its content needs, the panel scrolls as a whole; the table part keeps at least
  140 px.
- Script decides the side and names it on the panel: `data-place-block` is `above` or `below`,
  `data-place-inline` is `end` (right edges in line), `start` (left edges in line), or
  `pinned` (16 px from the window's right edge; 8 px in a window up to 600 px wide). It
  decides afresh when the panel opens, while the launcher is dragged, when the window changes
  size, and when the panel's size was changed. The stylesheet turns the names into `anchor()`
  insets.
- A browser without anchor positioning places the panel from the launcher's two offsets:
  above or below it, right edges in line.
- No text cursor is drawn in the launcher and its text cannot be selected (FR-074).

## Texts

| Element | Text |
|---------|------|
| Back and forward buttons (accessible names and tooltips) | `Cofnij`, `Ponów` |
| Refresh button | `Odśwież` |
| Settings button (accessible name) | `Ustawienia` |
| Minimise button (accessible name and tooltip) | `Minimalizuj` |
| Close button (accessible name) | `Zamknij` |
| Reset button (label, accessible name, tooltip; 004 FR-009) | `Resetuj` |
| Previous / next period (accessible names) | `Poprzedni okres` / `Następny okres` |
| Period buttons | `Dzień`, `Tydzień`, `Miesiąc`, `Rok` |
| Day field label | `Dzień:` |
| Range labels | `Od:`, `Do:` |
| Table headers | `Zgłoszenie`, `Tytuł`, `Czas wpisów`, `Suma` |
| Sort hint (tooltip of a header, after the column name) | `sortuj rosnąco`, `sortuj malejąco` |
| Total label | `Suma czasu:` |
| Weekdays | `Poniedziałek`, `Wtorek`, `Środa`, `Czwartek`, `Piątek`, `Sobota`, `Niedziela` |
| Loading (accessible text of the spinner) | `Ładowanie…` |
| Empty state | `Brak wpisów czasu w wybranym okresie.` |
| Error state | `Nie udało się pobrać danych z Jiry.` |
| Retry action | `Spróbuj ponownie` |
| Range validation | `Początek „Od” nie może być późniejszy niż koniec „Do”.` |
| Settings title | `Ustawienia` |
| Interval field | `Odświeżaj co` … `min` |
| Interval hint (tooltip of the interval row; not written in the pop-over) | `0 = automatyczne odświeżanie wyłączone (domyślnie 5 min)` |
| Interval validation | `Podaj liczbę całkowitą od 0 do 1440.` |
| Theme switch | `Tryb ciemny` |
| Settings buttons | `Anuluj`, `Zapisz` |
| Settings not saved | `Nie udało się zapisać ustawień w tej przeglądarce.` |
| Launcher label, today | `Dziś:` |
| Launcher label, a period that is not one whole day | `Zakres:` |
| Height grip (accessible name and tooltip) | `Zmień wysokość okna` |
| Width grip (accessible name and tooltip) | `Zmień szerokość okna` |
| Corner grip (accessible name and tooltip) | `Zmień rozmiar okna` |
| Chart (accessible name) | `Wykres czasu` |
| Chart zoom buttons (accessible names and tooltips) | `Przybliż`, `Oddal` |
| Launcher, how to move it (accessible description) | `Przeciągnij, aby przenieść (Shift + strzałki)` |

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
| Chart tip, a day | `Weekday dd-mm-yyyy` | `Piątek 06-11-2026` |
| Chart tip, a whole month / year | `mm-yyyy` / `yyyy` | `11-2026`, `2026` |
| Chart tip, a month or year cut by the period | `dd-mm-yyyy – dd-mm-yyyy` | `02-11-2026 – 30-11-2026` |
| Chart label under a bar | `dd-mm`, `mm-yyyy`, `yyyy` | `06-11`, `11-2026`, `2026` |
| Chart axis | whole hours | `0h`, `4h`, `8h` |
| Title while a newly selected period loads | the title of that period, `…` as the total | `Czwartek 05-11-2026 · …` |
| Progress tip, line 1 | the title without the total | `Piątek 06-11-2026` |
| Progress tip, line 2 | `Suma czasu: total` | `Suma czasu: 10h 10m` |
| Sort tooltip | `column: hint` (the hint names what the next click does) | `Suma: sortuj malejąco` |
| Title, multi-day with times | `dd-mm-yyyy HH:MM – dd-mm-yyyy HH:MM · total` | `02-11-2026 08:00 – 04-11-2026 16:00 · 20h 15m` |
| Total row | `Suma czasu: total` | `Suma czasu: 10h 10m` |
| Launcher, today | `Dziś: total` | `Dziś: 10h 10m` |
| Launcher, another whole day | `dd-mm-yyyy: total` | `05-11-2026: 1h 15m` |
| Launcher, any other period | `Zakres: total` | `Zakres: 22h 40m` |
| Launcher, today not readable | `Dziś: –` (the error text as its tooltip) | `Dziś: –` |

An entry that ends on the next day shows its end time only (`22:00–01:30`); it belongs to its
start day.

## Table structure

- One `<tr>` per ticket. Multiple entries of a ticket are separate lines inside the single
  "Czas wpisów" cell, never extra rows (FR-007).
- "Zgłoszenie": a link to `{siteUrl}/browse/{KEY}` that opens in a new tab. The key never
  wraps.
- "Tytuł": wraps inside its column; long unbroken words break (FR-036).
- "Suma": right-aligned, never wraps.
- Sorting (FR-063): each `<th>` holds a button and carries `aria-sort` (`ascending`,
  `descending`, or `none`). The first click on a column sorts ascending, the next descending.
  The table starts on "Czas wpisów" ascending, which is the loading order (FR-009).
  "Zgłoszenie" compares the project as text and the number as a number (`AM-9` before
  `AM-10`); "Tytuł" uses Polish alphabetical order, ignoring case; "Czas wpisów" the start of
  the earliest entry; "Suma" the row sum. Rows that compare equal keep the loading order. The
  order stays when data is refreshed or the period changes. A small triangle after the header
  text shows the direction of the active column.
- Loading (FR-060): the table area (`.wt-table-area`) is covered by a half-transparent layer
  with a spinner (`.wt-loading`, `role="status"`); the rows under it stay. The area carries
  `aria-busy` while loading.
- Empty and error messages are shown at the top of the table area.
- Below 600 px width each ticket becomes a block: "Zgłoszenie" and "Suma" on the first line,
  then "Tytuł", then the entries. All four pieces stay visible; nothing scrolls horizontally
  (FR-038).

## Progress bar

Single-day period (active):

- Scale 0 to 24h; ticks at 0, 4, 8, 12, 16, 24 hours; the 8h tick is emphasised. As in the
  mock-up, the first 8 hours take 60% of the bar's width and the hours from 8 to 24 the
  remaining 40%.
- Fill from 0 to 8h: red through yellow (4h) to green. Fill beyond 8h: green through blue
  (16h) to violet (24h) (FR-016, FR-017).
- Title total, total row value, and the launcher's total and dot use the colour from the data
  model's colour rule (FR-018).
- The bar exposes `role="progressbar"` with its minimum, maximum, current value, the total as
  its value text, and the title of the period as its name.
- While the pointer is over the bar or its scale, a tip above the bar shows two lines in the
  smallest type size: the period as in the title, and "Suma czasu:" with the total in the
  progress colour (FR-058). It repeats the header, so it is hidden from assistive technology.

Period longer than one day: the bar chart (FR-019, FR-076 to FR-079):

- The progress bar is hidden. In its place: the hours of the vertical axis at the left, the
  plot, and two zoom buttons at the right ("Przybliż" above "Oddal"; hidden when the period
  lies inside one month, where there is nothing to zoom).
- One column per day, month, or year, 2 px apart; the bar in it is at most 48 px wide, with
  rounded top corners, filled with `--wt-progress-*` colours mixed by the model's colour rule,
  at 75% opacity. A bar with any time is at least 2 px tall; a column without time is empty.
- Horizontal lines at the labelled hours; in the chart of days also a dashed line at 8h.
- Under the columns: `dd-mm` for a day, `mm-yyyy` for a month, `yyyy` for a year. Labels are
  left out where the columns are too narrow for all of them.
- The plot is `clamp(64px, 14.5% of the panel's height, 150px)` tall (96 px at least with
  touch-sized controls); 16 px stand above and below the chart.
- The column under the pointer gets a faint background, its bar 100% opacity, and a tip above
  it: what the bar stands for, and "Suma czasu:" with its total in the progress colour (muted
  for zero). The tip stays inside the chart. It goes away when the pointer leaves the plot.
- Zoomed in beyond the default, a column is at least 14 px (days) or 32 px (months) wide and
  the plot scrolls sideways; the part of the period in view stays in view.
- Keyboard: the plot is one tab stop named "Wykres czasu". Arrow left and right walk through
  the bars and show the tip, which is announced (`role="status"`); plus and minus zoom.
  Ctrl with the mouse wheel zooms around the pointer.
- A column is clickable (pointer cursor). A click, or Enter or Space on the bar chosen with
  the arrow keys, selects that bar's part of the period (FR-080): a year or a month shows its
  own chart, a day shows the progress bar. The change is immediate, without the spinner,
  because no request is sent (FR-081).
- Title total and total row value use `--wt-text`.

Zero (FR-068): a total of `0h 00m` is drawn in `--wt-text-muted` in the title, the total row
(label and value), the tip, and on the launcher (value and dot). The element carries
`data-zero`.

The launcher follows the same rules as the panel's totals: the progress colour for a single
day, the normal text colour for a longer period, muted for zero. Its dot always has the colour
of its value; without a progress colour the dot is muted.

## Colour tokens (both themes define all of them)

`--wt-bg`, `--wt-surface`, `--wt-surface-raised`, `--wt-border`, `--wt-text`, `--wt-text-muted`,
`--wt-link`, `--wt-accent`, `--wt-on-accent`, `--wt-focus`, `--wt-danger`, `--wt-track`,
`--wt-progress-red`, `--wt-progress-yellow`, `--wt-progress-green`, `--wt-progress-blue`,
`--wt-progress-violet`, and `--wt-tone-red`, `--wt-tone-yellow`, `--wt-tone-green`,
`--wt-tone-blue`, `--wt-tone-violet`, and for the theme switch `--wt-switch-track`,
`--wt-switch-border`, `--wt-switch-icon`. The knob of the switch uses `--wt-accent` and the
icon on it `--wt-on-accent`.

The `--wt-progress-*` tokens paint the bar. The `--wt-tone-*` tokens carry the same meaning
for text (the coloured totals) and are tuned per theme so that the text keeps a contrast
ratio of at least 4.5:1 against `--wt-surface` (FR-048, Principle IV). Spacing, radius, type,
and size tokens are defined once for both themes; among them `--wt-panel-width` (800 px),
`--wt-panel-height` (50svh by default; the height grip sets it on the panel),
`--wt-panel-min-height` (592 px; 440 px until 004 FR-008), `--wt-launcher-right` (88 px), `--wt-switch-height`
(32 px; 44 px on touch devices and narrow screens), and `--wt-hover`, the background of a
control under the pointer (18% of `--wt-accent` on `--wt-surface`).

Tokens live on the add-on's root element (`.wt-root`), not on the page. The theme is the
`data-theme` attribute of that element; the Jira page's own theme is never read or changed.
Sizes are in px, because `rem` would follow the Jira page's root font size.

## Interaction rules

- Every control is reachable by keyboard with a visible focus ring; touch targets are at least
  44 × 44 CSS pixels on touch devices and on screens narrower than 600 px (Principle III).
- The launcher opens and minimises the panel. Opening moves the focus into the panel; hiding
  it returns the focus to the launcher. `Escape` closes the settings if they are open,
  otherwise it minimises the panel.
- Minimising (launcher, `Escape`) keeps the selected period; the next opening reloads it, and
  a preset follows the calendar. The close button forgets the period: the next opening shows
  "Dziś" (FR-049, FR-064).
- Hover (FR-065): the launcher, every button, and every preset get the `--wt-hover` background
  and an accent border while the pointer is over them. Filled controls (the selected preset,
  "Zapisz") answer the other way round: the `--wt-hover` background with `--wt-link` text, the
  selected preset also with a soft accent ring. Column headers and the theme switch show an
  accent colour. A disabled button does not react. The change is animated when the pointer
  comes in.
- Size (FR-059, FR-071): three grips, each a `role="separator"` element, on the panel's free
  edges: the horizontal one sets the height, the vertical one the width, the corner between
  them both. The free edges are the ones away from the launcher (top and left by default;
  bottom when the panel is below the launcher, right when it lines up with the launcher's
  left edge); the panel carries them as `data-free-block` and `data-free-inline`. Dragging a
  free edge outwards makes the panel larger, within 592 px by 640 px and the window. The
  arrow keys on a focused grip move its edge by 16 px; Home or a double click returns to the
  default. The size is stored when the drag ends (see
  [settings-storage.md](settings-storage.md)). Below 600 px window width only the height grip
  is shown.
- Moving the launcher (FR-072): a press on the launcher that travels 4 px or more is a drag;
  the launcher follows the pointer, stays 4 px inside the window, and the click that ends the
  drag does not open or close the panel. Shift with an arrow key moves it 16 px. The place is
  stored when the drag ends and is brought back inside the window when the window gets
  smaller.
- The launcher shows the period the panel is on (FR-040). It is "Dziś:" on a new page and
  after the close button. While the panel is minimised on another period, the launcher keeps
  that period and refreshes it at the auto-refresh interval.
- Keys typed inside the add-on do not reach the Jira page, so Jira's single-key shortcuts do
  not fire while the user types a number or a date.
- Settings: the gear toggles a popover inside the panel. `Escape` or a click outside closes it
  as "Anuluj". The theme switch previews immediately; "Zapisz" keeps, anything else reverts.
- Settings layout: the title "Ustawienia", a dividing line, the interval row (its explanation is the
  row's tooltip, FR-073), the theme row, the buttons. The theme switch stands directly after its label "Tryb ciemny". It
  is a pill twice as wide as it is high, with a sun on the left and a moon on the right; a
  round knob in the accent colour slides under the icon of the active theme with a slight
  overshoot (none when the user asked for reduced motion). The knob has the same 2 px gap to
  the border at the top, the bottom, and the end it rests at. `aria-checked="true"` means dark
  (FR-044).
- "Dzień", "Tydzień", "Miesiąc", "Rok" work like radio buttons (FR-085): the selected one
  (`aria-pressed="true"`, filled) names the kind of period on screen and stays selected
  while the arrows move through days, weeks, months, or years; none is selected for another
  range. A press goes to the current day, week, month, or year: without the spinner when
  the loaded data covers it, with a load otherwise or when it is already on screen.
- Selecting a preset, picking a day in "Dzień:", editing "Od"/"Do", or pressing an arrow loads
  the new period at once.
- Changing "Od" moves "Do" to the same day: its time is kept, or becomes 23:59 when it would be
  earlier than "Od" (FR-056). Changing "Do" to earlier than "Od" shows the range validation
  text and restores the previous values (FR-027).
- "Dzień:" shows the day when the period is exactly one whole day and is empty otherwise
  (FR-057).
- "Odśwież" is switched off while a load is running and shows the loading indication: it
  looks disabled, is announced as unavailable and busy, and does nothing when activated,
  but it can hold the keyboard focus and keeps it (changed by 003 FR-030; until then it
  was disabled and lost the focus).
- "Minimalizuj" hides the panel like the launcher and Escape do and moves the focus to the
  launcher; nothing is forgotten (FR-064, FR-086).
- "Cofnij" and "Ponów" are disabled when there is no view to go to: 40% opacity, default
  cursor, no reaction to the pointer. Enabled, they get the accent border and the hover
  background of the other buttons. When the button under the keyboard focus becomes
  disabled, the focus moves to the other of the two. Going to a remembered view changes the
  screen at once, without the spinner (FR-083).
