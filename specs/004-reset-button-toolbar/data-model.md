# Data Model: Reset Button and Two-Row Header

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

The feature adds no stored data and no new kind of data from Jira. It adds one derived
state (whether there is something to reset), one transition of the view state that already
exists, and it raises one bound of a stored value.

## View state (in `src/ui/controller.ts`, unchanged in shape)

| Part | Meaning | Start view |
|------|---------|------------|
| `period` | The period on screen | Exactly the current day in the user's time zone |
| `person` | Whose time every load is for (002) | The signed-in user of the session |
| `history`, `position` | The views of "Cofnij" and "Ponów" (001 FR-082) | One view, position 0 |

The **start view** of the spec is the state where all three parts have the value of the
right column. Whether the day has loaded, is loading, or failed (`state`) is not part of it.

## Resettable (derived, never stored)

Worked out by the controller from the view state ([research.md](research.md) R2):

```text
resettable = NOT samePeriod(period, today(now))
          OR person.accountId != session.accountId
          OR history.length > 1
```

| Rule | Source |
|------|--------|
| `today(now)` is the whole current day in the session's time zone at the moment of the check | FR-015; spec, Edge Cases (midnight) |
| The dates are compared, not the name of the preset | [research.md](research.md) R2 |
| `history.length > 1` is the same as "Cofnij or Ponów has a step to go to" | 001 FR-082 |
| Worked out at every change of `period`, `person`, or `history`, and at the start of every load | FR-015 |
| Not changed by the result of a load | FR-015, FR-019 |

It is shown by the header: `Header.setResettable(resettable)` sets the `disabled` attribute
of "Resetuj" to its opposite ([contracts/ui.md](contracts/ui.md)).

### Cases

| View | `resettable` |
|------|--------------|
| A newly loaded page, panel opened | false |
| Start view, load of today running or failed | false |
| Another day, a week, a range | true |
| Today, another person | true |
| Today, signed-in user, came back with "Cofnij" ("Ponów" enabled) | true |
| Today selected by hand after another period ("Cofnij" enabled) | true |
| The whole current day typed into "Od:" and "Do:" on the start view (no step: the same period) | false |
| Yesterday's "today" after midnight, after "Odśwież" by hand | true |
| The same, after an automatic refresh (the view follows the calendar, 001) | false |

## Transition: reset (in `src/ui/app.ts`)

Allowed only while the panel is open and `resettable` is true (the button is disabled
otherwise).

| Before | After | Requirement |
|--------|-------|-------------|
| `period` = any | the current day at the moment of the press | FR-010 |
| `person` = any | the signed-in user | FR-010, FR-012 |
| `history` = up to 11 views | one view, position 0 | FR-011 |
| rows, chart, totals of another person | removed at once, before the load | FR-012 |
| a load that is running | given up; its result is ignored | FR-015 |
| settings open | closed without saving; a running check of a person given up; an open alert closed | FR-016 |
| export menu open | closed | FR-016 |
| launcher, period or person changes | "Dziś:" with the pending sign, then the total of the load | FR-014 |
| launcher, only the steps are forgotten | keeps its total, then the total of the load | FR-014 |
| `resettable` = true | false; the focus from "Resetuj", when it holds it, to "Odśwież" | FR-015, FR-018 |
| panel open | panel open | FR-010 |
| stored settings | byte for byte the same | FR-013 |
| sort order of the table | the same | FR-013 |
| timer of the automatic refresh | restarted by the load, with the stored interval | FR-015 |

Then one load of today for the signed-in user, with the usual states (loading, rows, empty,
error with "Spróbuj ponownie").

### Against the close button

| | Close button (unchanged) | "Resetuj" |
|-|--------------------------|-----------|
| Period back to today | at the next opening | at once |
| Person back to the signed-in user | at once | at once |
| Steps forgotten | at the next opening | at once |
| Panel | hidden; focus to the launcher | stays open; focus to "Odśwież" |
| Load of today | by the launcher now, by the panel at the next opening | by the panel now |
| Stored settings, sort order | kept | kept |

The part both share (the person and what is shown of them) is one function
([research.md](research.md) R3).

## Stored settings (in `src/domain/settings.ts`)

No field is added, removed, or renamed, and the storage key stays `worktime.settings.v1`.
One bound changes ([contracts/settings-storage.md](contracts/settings-storage.md)):

| Field | Before | After |
|-------|--------|-------|
| `panelHeight` | integer 440 to 4000, or `null` | integer 592 to 4000, or `null`; a stored 440 to 591 is read as 592 |

Nothing in this feature writes to the storage. A height read as 592 is written back only
when the user changes a setting or the size, as every value is.

## Version (build time, never stored)

| Name | Value | Use |
|------|-------|-----|
| `__APP_VERSION__` | the `version` of `package.json`, put into the script by the build | The total row: "Jira Custom Tempo - " and this value, at the bottom left of the panel (FR-023) |

| Rule | Source |
|------|--------|
| Three numbers divided by dots | the package's own format |
| Equal to the `version` of `extension/manifest.json` and of `package-lock.json` | FR-023; `tests/unit/version.test.ts` |

## Texts (in `src/i18n/pl.ts`)

| Key | Text | Use |
|-----|------|-----|
| `reset` | `Resetuj` | Label, accessible name, and tooltip of the reset button (FR-009, FR-021) |
