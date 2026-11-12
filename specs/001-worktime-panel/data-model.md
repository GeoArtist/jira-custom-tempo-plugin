# Data Model: Worktime Panel

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-11-12

The app keeps no data of its own except two user settings. Everything else is read from Jira on
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
| `preset` | `today` \| `yesterday` \| `thisWeek` \| `prevWeek` \| `thisMonth` \| `prevMonth` \| `custom` | `custom` when "Od"/"Do" were edited or the range was shifted to a non-preset range |

A preset always runs from 00:00 of its first day to 23:59 of its last day (FR-024). A custom
range can start and end at any minute (FR-023).

Derived:

- `isSingleDay` = `from` and `to` are on the same calendar day (FR-051), whole or partial.
- `isWholeDays` = `from` is at 00:00 and `to` is at 23:59.
- `startInstant` = epoch milliseconds of `from` in the user's time zone.
- `endInstant` = epoch milliseconds of `to` plus one minute (half-open interval; FR-026).

Rules:

- Weeks run Monday to Sunday (FR-026). Months run from day 1 to the last day.
- Shift (FR-025): a full week moves by 7 days; a full calendar month by one calendar month; any
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

The totals and colour state for the header, footer, bar, and gadget (spec: "Period summary").

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
| `0 < r ≤ 1` | interpolated from light blue (`r → 0`) to light green (`r = 1`) |
| `1 < r ≤ 3` | interpolated yellow (`r → 1`) through orange (`r = 2`) to red (`r = 3`) |
| `r > 3` | red |

When not `progressActive` (a period longer than one day): `colour` is `neutral`, the bar is
drawn as an inactive light-gray track with no fill, and the caption shows the total only.

The same `colour` value is applied to the title total, the footer total, and the gadget. An
active bar always paints the 0-to-8h segment in the blue-to-green gradient and the part beyond
8h in the yellow-to-red gradient (spec User Story 2, scenario 3). The gadget always shows
today, so its colour is always active.

### UserSettings

The only persisted data (spec: "User settings").

| Field | Type | Default | Rule |
|-------|------|---------|------|
| `refreshMinutes` | integer | `5` | whole number 0 to 1440; `0` turns auto-refresh off (FR-032) |
| `theme` | `dark` \| `light` | `dark` | (FR-045) |

Validation: empty, negative, fractional, non-numeric, or above 1440 is rejected with a Polish
message and the stored value is unchanged (spec edge case). A missing or unreadable stored
value falls back to the defaults. Storage location and format: see
[contracts/settings-storage.md](contracts/settings-storage.md).

### Session

Read once when the app starts; not persisted.

| Field | Type | Source |
|-------|------|--------|
| `accountId` | string | current user |
| `timeZone` | string (IANA) | user's Jira profile time zone |
| `siteUrl` | string | Jira site base URL |

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
| `loading` with no earlier data | loading indication, no table |
| `loading` with earlier data | earlier data stays visible, loading indication on the refresh button (FR-034) |
| `ready` | table, totals, bar |
| `empty` | Polish empty message, totals `0h 00m`, empty bar |
| `error` | Polish error message with a retry action; the last loaded data stays visible |

Rules:

- A period change discards the previous period's rows before loading (they belong to another
  range); a refresh of the same period keeps them on screen.
- Only the newest request may update the screen. A response that arrives for an older request
  (the user changed the period meanwhile) is ignored.
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
