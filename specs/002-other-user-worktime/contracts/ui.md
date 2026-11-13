# Contract: User Interface, additions for another user

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) (R7 to R10) |
**Data model**: [../data-model.md](../data-model.md)

Extends [the UI contract of 001](../../001-worktime-panel/contracts/ui.md). Everything not
named here is unchanged. All texts live in `src/i18n/pl.ts`, as before.

The spec is the source of every rule in this file (spec, Clarifications 2026-11-13). This
contract repeats them in the form the implementer needs; where the two differ, the spec
wins and this file is corrected.

## Header

Top to bottom inside the text part of the header:

1. **Name line** (new): the selected person's display name, one line.
2. Title line: unchanged (`Piątek 13-11-2026 · 0h 00m`).

| Rule | Detail |
|------|--------|
| Element | a paragraph above the `h1`; it is not part of the heading |
| Colour | token `--wt-person` (FR-007) |
| Size and weight | `--wt-text-sm`, `--wt-weight-medium` |
| Overflow | one line, cut with an ellipsis; the full name as the element's tip (FR-009) |
| Always present | also for the signed-in user (FR-006); keeps its line height when empty (FR-010) |
| Changes | at the same moment as the table is emptied for the new person (SC-002) |

The header buttons keep their place and size at every width; in a narrow window the name
line and the title share the line above the buttons that the title already has in 001.

## Launcher

| Selected person | Launcher reads |
|-----------------|----------------|
| the signed-in user (also when chosen by typing their own name) | as in 001: `Dziś: 10h 10m` |
| another person | `Anna Nowak · Dziś: 6h 00m` |

| Rule | Detail |
|------|--------|
| Name | before the label, colour `--wt-person` (FR-033) |
| Separator | a middle dot with a space on each side, in the muted colour |
| Long name | the name alone is limited to `--wt-launcher-name-max` (24ch) and cut with an ellipsis; the full name is the launcher's tip; label and total are never cut (FR-034) |
| One line | at every width from 320 px |
| After a change of person | `–` in place of the total until the new person's total has loaded, and after a failed load; never the previous person's total (FR-041) |
| Placement | unchanged rules of 001 (FR-072, FR-075): the wider launcher stays wholly inside the window; a stored place is clamped again when the name appears or disappears |
| Accessible name | the visible text: name, label, total |

## Settings pop-over

Top to bottom (new parts in bold):

1. Title `Ustawienia`
2. Dividing line
3. Interval row and its error line
4. Theme row `Tryb ciemny`
5. **Dividing line**
6. **Person options**: two radio buttons in a group named `Użytkownik`
7. **Name row** (only while "Inny użytkownik" is selected): label, text field
8. **Field message** (only when there is one)
9. **Candidate list** (only after a check that found several people)
10. Notice line (settings not saved), as in 001
11. Buttons `Anuluj`, `Zapisz`

### Person options (FR-011, FR-012, FR-015)

| Rule | Detail |
|------|--------|
| Control | native radio inputs with labels, one group; arrow keys move between them |
| On open | the option in effect is selected (FR-013) |
| Selecting "Inny użytkownik" | shows the name row and moves the focus into the field; the text is selected |
| Selecting "Obecny użytkownik" | hides the name row, the field message, and the list; the typed text is kept until the settings close |
| Touch | each option is at least 44 px high on touch devices and narrow screens |

### Name field

| Rule | Detail |
|------|--------|
| Type | text, `autocomplete="off"`, `spellcheck="false"`, at most 255 characters |
| Filled once, on open | with the person in effect when it is another person; otherwise with the remembered person; otherwise empty. Switching between the options does not change the text (FR-013, FR-036) |
| Enter in the field | the same as "Zapisz" |
| Editing | hides the field message and the list; drops the pick when the text no longer matches it (FR-031) |

### "Zapisz" while a check runs (FR-019)

- "Zapisz" cannot be used: it carries `aria-disabled="true"` and `aria-busy="true"`, is named
  "Sprawdzanie…" for assistive technology, and shows the spinner of the refresh button. It is
  not given the `disabled` attribute, so the keyboard focus stays on it.
- The options and the field are read-only until the check ends.
- "Anuluj", Escape, and a click outside close the settings and discard the result.
- A check without an answer after 15 seconds is abandoned and counts as a check that
  could not be made (FR-045).

### Candidate list (FR-026, FR-030, FR-031)

| Rule | Detail |
|------|--------|
| Heading line | `Znaleziono kilka osób. Wybierz jedną:` |
| Entries | at most 10 buttons, one per person: display name; under it the e-mail address when Jira returns it |
| Order | by display name (Polish collation), then by account ID |
| More than 10 | a line under the list: `Pokazano 10 pierwszych osób. Wpisz dokładniejsze imię i nazwisko.` |
| After the check | the focus moves to the first entry; the list is announced as a group named by its heading line |
| Room | while the list is shown, the interval row, the theme row, the second dividing line, and the two options are hidden; they keep their values and return when the list closes (FR-030) |
| Picking | writes the person's name into the field, hides the list, moves the focus to "Zapisz" |
| Keyboard | Tab and Shift+Tab move through the entries; Enter or Space picks |
| Height | at most `--wt-list-max-height` (220 px, about five entries); a longer list scrolls inside the pop-over; the buttons stay visible |

No pictures are shown, and deactivated accounts are never in the list
([research.md](../research.md) R2, R8).

### Alert window (FR-020, FR-022)

| Rule | Detail |
|------|--------|
| Shown when | a check finds nobody, or the remembered person no longer exists |
| Form | a small box centred over the settings pop-over, `--wt-alert-width` (280 px) wide and never wider than the pop-over, on a dimmed layer that covers the pop-over only |
| Role | `alertdialog`, `aria-modal="true"`, described by its text |
| Content | the text, its second sentence on a line of its own (`white-space: pre-line`), and one primary button `OK` |
| Focus | on `OK` when shown |
| Settings under it | `inert`: no pointer, no keyboard, hidden from screen readers |
| Closing | `OK`, Enter, or Escape close the alert only; the settings stay open. A click elsewhere does not close it. Closing or minimising the panel closes the alert and the settings without saving (FR-047) |
| After closing | the focus is in the name field, its text selected; option, name, interval, and theme switch are as the user left them |
| Page under the add-on | not blocked, not changed |

Escape order with the alert open: the alert closes; the settings and the panel stay. Without
the alert, Escape closes the settings as in 001; without the settings, it minimises the panel.

### Field messages

Shown under the name field with `role="alert"`, in the danger colour, like the interval
error of 001. They need no window to close. The "could not be checked" message stays until the field is
edited, the other option is selected, or "Zapisz" is pressed again (FR-023).

## Texts (additions)

| Element | Text |
|---------|------|
| Group of the two options (accessible name) | `Użytkownik` |
| Option 1 | `Obecny użytkownik` |
| Option 2 | `Inny użytkownik` |
| Name field label | `Imię i nazwisko` |
| Empty name (FR-018) | `Podaj imię i nazwisko.` |
| Alert, nobody found (FR-020), on two lines (`\n` is the line break) | `Nie znaleziono użytkownika.\nNie można zapisać ustawień.` |
| Alert button | `OK` |
| Check failed (FR-023) | `Nie udało się sprawdzić użytkownika w Jirze. Ustawienia nie zostały zapisane.` |
| "Zapisz" while checking (accessible text) | `Sprawdzanie…` |
| List heading | `Znaleziono kilka osób. Wybierz jedną:` |
| More than 10 matches | `Pokazano 10 pierwszych osób. Wpisz dokładniejsze imię i nazwisko.` |

## Colour tokens (additions; both themes define them)

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--wt-person` | `#ff6c00` | `#b84e00` | the person's name in the header and on the launcher; the light value is a darker shade of the dark one |
| `--wt-scrim` | `rgb(0 0 0 / 55%)` | `rgb(23 32 51 / 35%)` | the dimmed layer under the alert window |

## Size tokens (additions; the same in both themes)

| Token | Value | Use |
|-------|-------|-----|
| `--wt-launcher-name-max` | `24ch` | the widest name on the launcher before the ellipsis (FR-034) |
| `--wt-alert-width` | `280px` | the alert window (FR-020) |
| `--wt-list-max-height` | `220px` | the list of people before it scrolls (FR-044) |

No component writes these values itself (constitution, Principle IV).

`--wt-person` must reach at least 4.5:1 against `--wt-surface` and `--wt-surface-raised` in
its theme (constitution, Principle IV).

## Interaction rules (additions)

- A change of person removes, at once, everything of the previous person: the rows, the
  row sums, the fill of the progress bar or the bars of the chart; the totals show `…`.
  Only the loading state is in the table area until the new person's data has arrived
  (FR-003). This replaces, for a change of person, the rule of 001 that old rows stay
  under the spinner (001 FR-060).
- A change of person keeps the period, the sort order, the zoom of the chart, the panel
  size, and the launcher's place; it empties back and forward, whose buttons become disabled.
- The close button returns to the signed-in user and to today; minimising keeps the person.
- Every new control has a visible focus state and works by keyboard and by touch.
- Nothing new depends on hover: the full name behind an ellipsis is also in the settings
  field (another person) or is the user's own.
- Layout holds from 320 px to 1920 px: the pop-over never causes horizontal scrolling of the
  page, and the candidate list scrolls inside it.
- The pop-over is never taller than the room the panel has under its header (the panel is
  the size container: `100cqh` less the pop-over's top). The list shrinks first, down to
  one entry; then the content of the pop-over scrolls, with "Anuluj" and "Zapisz" held at
  its foot (FR-044).
- The two options are native radio inputs laid over their whole line and drawn as a ring:
  the line is the touch target, and the keyboard meets a native control.
