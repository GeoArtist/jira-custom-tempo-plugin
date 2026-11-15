# Data Model: Worktime Panel

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-12

The add-on keeps no data of its own except two user settings. Everything else is read from Jira on
each refresh and held in memory. All types below are TypeScript-level shapes in `src/domain/`;
none of them touch the DOM or the network, so they are unit-testable in isolation.

## Entities

### LocalDate

A calendar day in the user's time zone, independent of any clock time.

| Field | Type | Rule |
|-------|------|------|
| `year`, `month`, `day` | integer | A valid Gregorian date; `month` is 1 to 12 |

Formatting: `dd-mm-yyyy` for display (FR-012, FR-013), `yyyy-mm-dd` for JQL and date inputs.

### Period

The range being displayed (spec: "Period (okres)"), to the minute.

| Field | Type | Rule |
|-------|------|------|
| `from` | LocalDate + minute of day (0 to 1439) | `from` ≤ `to` (FR-027) |
| `to` | LocalDate + minute of day (0 to 1439) | inclusive: the whole minute counts |
| `preset` | `today` \| `yesterday` \| `dayBeforeYesterday` \| `thisWeek` \| `prevWeek` \| `thisMonth` \| `prevMonth` \| `thisYear` \| `prevYear` \| `custom` | `custom` when "Od"/"Do" or "Dzień:" were edited, or the range was shifted, to a range that equals no preset |

A preset always runs from 00:00 of its first day to 23:59 of its last day (FR-024). A custom
range can start and end at any minute (FR-023).

Derived:

- `isSingleDay` = `from` and `to` are on the same calendar day (FR-051), whole or partial.
- `isWholeDays` = `from` is at 00:00 and `to` is at 23:59.
- `startInstant` = epoch milliseconds of `from` in the user's time zone.
- `endInstant` = epoch milliseconds of `to` plus one minute (half-open interval; FR-026).

Rules:

- Weeks run Monday to Sunday (FR-026). Months run from day 1 to the last day. Years run from
  1 January to 31 December (FR-022).
- The "Dzień:" field gives one whole day: 00:00 to 23:59 of the picked date (FR-057).
- "Do" follows "Od" (FR-056): after a change of "Od", `to.date` = `from.date`; `to.minuteOfDay`
  is kept, or becomes 1439 when it would be less than `from.minuteOfDay`.
- Shift (FR-025): a full week moves by 7 days; a full calendar month by one calendar month; a
  full calendar year by one year; any
  other range moves by the number of calendar days it spans, keeping its clock times. After a
  shift the preset is recomputed: it becomes the matching preset if the new range equals one,
  otherwise `custom`.
- Default on open: `today` (FR-021).

### TimeEntry

One worklog of the current user (spec: "Time entry (wpis czasu)").

| Field | Type | Source | Rule |
|-------|------|--------|------|
| `id` | string | worklog `id` | unique |
| `issueId` | string | worklog `issueId` | links to Ticket |
| `startedMs` | integer | parsed worklog `started` | absolute instant |
| `durationSeconds` | integer | worklog `timeSpentSeconds` | > 0; shown as logged, never rounded (FR-010) |

Derived (all in the user's time zone):

- `endMs` = `startedMs + durationSeconds × 1000`.
- `startDate` = LocalDate of `startedMs`. An entry belongs to the day it starts on, with its
  full duration, even when it crosses midnight (spec edge case).
- `startLabel`, `endLabel` = `HH:MM`, 24-hour.

Inclusion rule: an entry is kept only when `author.accountId` equals the current user's
`accountId` (FR-001) and `period.startInstant ≤ startedMs < period.endInstant`.

### Ticket

A Jira work item the user logged time on (spec: "Ticket (zgłoszenie)").

| Field | Type | Source |
|-------|------|--------|
| `id` | string | issue `id` |
| `key` | string | issue `key`, for example `AM-12345` |
| `title` | string | issue `fields.summary` (current value, FR-005) |
| `url` | string | `{siteUrl}/browse/{key}` (FR-004) |

### TicketRow

One table row (FR-003). Built by grouping TimeEntry by `issueId`.

| Field | Type | Rule |
|-------|------|------|
| `ticket` | Ticket | |
| `entries` | TimeEntry[] | at least one; sorted by `startedMs` ascending (FR-007) |
| `totalSeconds` | integer | sum of `entries[].durationSeconds` (FR-008) |

Row order: ascending by `entries[0].startedMs` (FR-009). A ticket with no kept entry produces
no row.

### PeriodSummary

The totals and colour state for the header, footer, bar, and launcher (spec: "Period summary").

| Field | Type | Rule |
|-------|------|------|
| `totalSeconds` | integer | sum of all rows' `totalSeconds`; always equals the footer value (FR-014) |
| `progressActive` | boolean | `period.isSingleDay` (FR-019) |
| `normSeconds` | integer | 8h; used only when `progressActive` |
| `maxSeconds` | integer | 24h; used only when `progressActive` |
| `fillFraction` | number 0 to 1 | `min(totalSeconds, maxSeconds) / maxSeconds`; `0` when not `progressActive` |
| `normReached` | boolean | `totalSeconds ≥ normSeconds`; meaningful only when `progressActive` (FR-020) |
| `colour` | colour value or `neutral` | see below (FR-016 to FR-019) |

Colour rule when `progressActive`, with `r = totalSeconds / normSeconds`:

| Range | Colour |
|-------|--------|
| `r = 0` | `neutral` (normal text colour; no progress yet) |
| `0 < r ≤ 1` | interpolated from red (`r → 0`) through yellow (`r = 0.5`) to green (`r = 1`) |
| `1 < r ≤ 3` | interpolated from green (`r → 1`) through blue (`r = 2`) to violet (`r = 3`) |
| `r > 3` | violet |

When not `progressActive` (a period longer than one day): `colour` is `neutral`, and the bar
chart below stands in place of the bar. Nothing is written under the bar (FR-020).

### Chart buckets (FR-076 to FR-079)

Derived from the loaded rows and the period; not stored.

| Field | Meaning |
|-------|---------|
| `granularity` | `day`, `month`, or `year`: what the bar stands for |
| `from`, `to` | first and last day of the bucket, cut to the period |
| `seconds` | sum of the entries that start on those days, in the user's time zone |
| `colour` | the colour rule above applied to `seconds` for a day, and to `seconds` divided by the working days (Monday to Friday) of the bucket for a month or a year |

Rules:

- One bucket per day, month, or year of the period, in order, also with `seconds` 0.
- Default granularity: `day` up to 31 days; `month` when the period touches up to 24 calendar
  months; `year` beyond.
- Zoom levels of a period: `day` always; `month` when it touches more than one month; `year`
  when it touches more than one year.
- Vertical axis: the smallest step of 1, 2, 4, 8, 20, 40, 80, 200, 400, 800, … hours that
  needs at most four steps to reach the tallest bucket; the axis ends on a whole step. With
  nothing logged it runs to 8h.
- Selecting a bucket (FR-080) gives the period from `from` 00:00 to `to` 23:59, except that
  a bucket on the period's first or last day keeps the period's own start or end minute.

A total of zero is shown muted wherever it appears (FR-068).

The same `colour` value is applied to the title total, the footer total, and the launcher. An
active bar always paints the 0-to-8h segment in the red-yellow-green gradient and the part
beyond 8h in the green-blue-violet gradient (spec User Story 2, scenario 3). The launcher shows the period
the panel is on and follows the same colour rule (FR-040).

### UserSettings

The only persisted data (spec: "User settings"), with the panel size and the launcher's place
the user chose.

| Field | Type | Default | Rule |
|-------|------|---------|------|
| `refreshMinutes` | integer | `5` | whole number 0 to 1440; `0` turns auto-refresh off (FR-032) |
| `theme` | `dark` \| `light` | `dark` | (FR-045) |
| `panelHeight` | integer or none | none | px, 440 to 4000; none = 50% of the window; set by dragging the panel's free horizontal edge (FR-059) |
| `panelWidth` | integer or none | none | px, 640 to 4000; none = 800 px; set by dragging the panel's side edge or corner (FR-071) |
| `launcher` | `{ right, bottom }` or none | none | px from the window's right and bottom edges, integers 0 to 10000; none = the default corner; set by dragging the launcher (FR-072) |

Validation: empty, negative, fractional, non-numeric, or above 1440 is rejected with a Polish
message and the stored value is unchanged (spec edge case). A missing or unreadable stored
value falls back to the defaults. Storage location and format: see
[contracts/settings-storage.md](contracts/settings-storage.md).

### Session

Read once when the Jira page loads; not persisted. Without a session (nobody signed in) the
add-on draws nothing.

| Field | Type | Source |
|-------|------|--------|
| `accountId` | string | `GET /rest/api/3/myself` |
| `timeZone` | string (IANA) | the same answer: the user's Jira profile time zone; the browser's zone if absent |
| `siteUrl` | string | the origin of the Jira page |

### AppState

What the add-on shows on the page.

| Field | Type | Rule |
|-------|------|------|
| `open` | boolean | `false` on page load; toggled by the launcher; set to `false` by the close button and Escape |
| `startOnToday` | boolean | `true` on page load and after the close button; `false` once the panel has been opened |
| `launcherSummary` | PeriodSummary and its Period, or none | shown on the launcher: today's while `startOnToday` is `true`, otherwise that of the panel's period; refreshed on page load, at the auto-refresh interval, and by every load of the panel |

Rules:

- Opening the panel selects the `today` preset when `startOnToday` is `true` (FR-049).
  Otherwise the panel was minimised (launcher, Escape): the period is kept and reloaded, and a
  preset is recomputed from the current date (FR-064).
- While the panel is hidden its own auto-refresh is stopped; only the launcher refreshes: it
  loads today while `startOnToday` is `true`, and reloads the panel's kept period otherwise.
- While the panel is open, the launcher does not send its own requests.
- The close button sets `startOnToday`; if the panel was on another period, today is loaded
  for the launcher at once.
- Launcher label (FR-040): `Dziś:` for the `today` preset; the date for any other period that
  is one whole day; `Zakres:` otherwise.

## View state

One state machine drives the panel (FR-034, FR-037).

```text
            open / refresh / period change / auto-refresh tick
   idle ─────────────────────────────────────────────────────► loading
                                                                  │
                       ┌──────────────── success, rows > 0 ───────┤
                       ▼                                          │
                     ready ◄──── success, rows = 0 ──► empty      │
                       ▲                                 ▲        │
                       └──────────── failure ────────────┴──► error
```

| State | Screen |
|-------|--------|
| `loading`, refresh of the same period | earlier rows stay visible under a spinner that covers the table area; loading indication on the refresh button (FR-034, FR-060) |
| `loading`, another period | the same, and the title names the new period with `…` in place of its total; the bar and the total row keep their last values until the load ends |
| `ready` | table, totals, bar |
| `empty` | Polish empty message, totals `0h 00m`, empty bar |
| `error` | Polish error message with a retry action; after a refresh the last loaded data stays visible, after a change of period the rows are removed and the totals are `0h 00m` |

Rules:

- A period change keeps the previous period's rows on screen under the spinner until the new
  rows arrive (FR-060). If the load fails, they are discarded, because they belong to another
  range. A refresh of the same period keeps its rows in both cases.
- The sort order of the table (column and direction) is view state of the table itself: it
  starts as "Czas wpisów" ascending and stays until the page is reloaded (FR-063).
- Only the newest request may update the screen. A response that arrives for an older request
  (the user changed the period meanwhile) is ignored.
- The controller keeps the rows of the last successful load together with its period. A bar
  selected in the chart (FR-081) whose period lies inside that one goes from any state
  straight to `ready` or `empty`: its rows are the kept entries that start inside it, grouped
  and ordered as after a load, and no request is sent. A load on its way is cancelled. Any
  other period, and every refresh, goes through `loading`; a successful load replaces what is
  kept.
- Period buttons (FR-085): the selected button follows the kind of the period (`day`,
  `week`, `month`, `year`, or none), computed from its range alone, not from `preset`. A
  press asks for the preset `today`, `thisWeek`, `thisMonth`, or `thisYear`: equal to the
  period on screen it is loaded; inside the kept load it is served from it; otherwise loaded.
- View history (FR-082, FR-083): the controller keeps a list of views, each a period with
  the rows it showed last (none while it has never loaded), and the position of the one on
  screen. A step of the user to another period cuts the list after the position, appends
  the new view, and drops the oldest when there are more than 11. A load, a refresh, and a
  bar served from kept rows store their rows in the view on screen. Back and forward move
  the position: a view with rows goes straight to `ready` or `empty` and its rows become the
  kept load that bars are served from; a view without rows goes through `loading`. The
  preset name of a restored period is matched again against the current date. A preset
  that follows the calendar to another day replaces the period of its view and is not a
  step. The close button empties the list. Nothing of it is stored.
- Auto-refresh: a timer of `refreshMinutes` restarts after every completed load; it does not
  exist when `refreshMinutes` is `0`. When the selected preset is relative to today, the period
  is recomputed from the current date before each load, so the day rolls over correctly (spec
  edge case).

## Relationships

```text
Session 1 ── 1 UserSettings
Period  1 ── * TicketRow 1 ── 1 Ticket
                   1
                   └── * TimeEntry
Period + TicketRow[] ── 1 PeriodSummary
```
