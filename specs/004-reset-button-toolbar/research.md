# Research: Reset Button and Two-Row Header

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Decisions taken before the design. The Technical Context of the plan had no open
"NEEDS CLARIFICATION"; the points below are the choices the spec left to the plan. Every one
was checked against the code as it is on the branch `dev` (commit `4ceb6af`).

## R1. The markup of the header

**Decision**: the header keeps one element, `header.wt-header`, with two children in reading
order: `div.wt-header__bar` (the title row) and `div.wt-header__tools` (the toolbar). The
title row holds `div.wt-header__text` (unchanged: the name line and the heading) and
`div.wt-header__window` with "Minimalizuj" and "Zamknij". The toolbar holds "Cofnij",
"Ponów", "Odśwież", "Resetuj", "Ustawienia". The class `wt-header__actions` is removed.

**Rationale**: the order of the elements is the reading order and the keyboard order of
FR-006 with no `tabindex`. Two named groups let the stylesheet and the tests address the
window buttons and the toolbar apart (SC-006 counts 2 and 5). One class for both rows would
need position-based selectors.

**Alternatives considered**:

- Keeping `wt-header__actions` for the toolbar: fewer changed lines in the tests, but the
  name would mean "five of the seven actions", and every test that counts six buttons
  changes anyway.
- `role="toolbar"`: the pattern asks for one Tab stop and arrow keys inside. FR-006 asks for
  Tab through every button, as today. Rejected.
- `role="group"` with a name: a group needs an accessible name, and FR-021 allows one new
  text only. Rejected; the buttons have names of their own.
- A CSS grid on the old flat list of six buttons: the visual order would differ from the
  element order, which breaks the keyboard order.

## R2. Where the state of "Resetuj" is worked out

**Decision**: in the controller. `Controller` gains a private check and reports it to the
header through a new method `Header.setResettable(can)`, at the same places where it reports
the state of "Cofnij" and "Ponów" (`showHistory()`), and at the start of every load. The
rule is FR-015:

```text
canReset = period on screen is not exactly the current day
        OR the person of the loads is not the signed-in user
        OR the list of views has more than one view
```

"Exactly the current day" compares the dates of the period with those of
`presetPeriod('today', timeZone, now())`, not the name of the preset: after midnight a
period may still be called "today" and be yesterday.

**Rationale**: the controller already holds all three facts (`period`, `person`, `history`)
and already tells the header about the history at every change of the view. No second copy
of the rule exists, and the application module stays the only place that knows the user's
choice of a person. Working it out again when a load starts covers the one case where the
view does not change but the calendar did ("Odśwież" by hand after midnight; spec, Edge
Cases).

**Alternatives considered**:

- In `app.ts`, from the controller's state and the choice of the person: the application
  would have to be told about every change of period and history, which it is not today.
- A timer at midnight: more code for a state that the next load corrects.
- `period.preset === 'today'`: wrong after midnight, see above.

## R3. What a press on "Resetuj" does

**Decision**: a new function `reset()` in `src/ui/app.ts`, beside `close()` and
`minimise()`. Both `close()` and `reset()` call one shared function that forgets the person
(the choice goes back to the signed-in user; when another person was shown, the controller
drops their rows at once with `Controller.reset(self)`, the name changes, and the launcher
shows the pending sign for today). After that `close()` hides the panel as today, and
`reset()` closes the settings without saving, closes the export menu, shows the pending sign
for today on the launcher when the period or the person changes (not when only the steps are
forgotten: the launcher then keeps its total, FR-014), and calls `Controller.start()`, which
sets the period to today, empties the list of views, and loads. Closing the settings is the
existing `cancel()` of the settings: it gives up a running check of a person and closes an
open alert (FR-016), as `minimise()` does today.

**Rationale**: FR-011 says "exactly what the close button forgets". One shared function
makes that true by construction, and one test can hold the two against each other.
`Controller.start()` is the function the panel already runs on the opening after a close, so
"Resetuj" gives the same load, the same loading indication, the same error state (FR-019),
and the same restart of the automatic refresh (FR-015) with no new code in the controller.
A load that is still running is given up by the next load, as with every change of period.

**Alternatives considered**:

- `close()` followed by `open()`: the panel would flicker, the focus would go to the
  launcher and back, and the launcher would load today a second time.
- A new controller method that does person and period together: `Controller.reset(person)`
  followed by `Controller.start()` runs in one task with no paint between, so the user sees
  one change; a combined method would repeat both bodies.

## R4. The keyboard focus when "Resetuj" switches off

**Decision**: "Resetuj" is switched off with the `disabled` attribute, like "Cofnij" and
"Ponów". `Header.setResettable(false)` first asks whether the button has the focus, and if
so moves the focus to "Odśwież", then disables the button. "Odśwież" is never `disabled`
(003 FR-030: it uses `aria-disabled` while a load runs), so it can take the focus at the
moment the load of today starts.

**Rationale**: the answer of the requester (2026-11-14) is "disabled, like Cofnij". A
disabled button that keeps the focus drops it to the page in every browser; the header has
the same guard for "Cofnij" and "Ponów". "Odśwież" is the nearest button to the left that is
always there, and it is the fallback 003 FR-030 already uses.

**Alternatives considered**:

- `aria-disabled` on "Resetuj", keeping the focus on it: it would stay in the Tab order
  while switched off, unlike "Cofnij"; FR-015 says "skipped by the Tab key".
- Focus to "Ustawienia": to the right of the button, but it opens a dialog on Enter; a
  second Enter after "Resetuj" would open the settings by accident. "Odśwież" on a second
  Enter does nothing while the load runs.

## R5. The layout of the two rows

**Decision**: `wt-header` becomes a column with the usual small gap between the rows. The
title row is a flex row: the text takes the room that is left and may shrink
(`min-width: 0`), the window buttons do not shrink and are aligned to the top. The toolbar
is a flex row, centred, with the usual gap between buttons, at every width. At 600 px and
narrower nothing wraps any more: the rule that gave the six buttons a line of their own, the
negative margin, and the narrower gap are removed. The rule that hides the written label of
a header button on a narrow screen now applies to the toolbar and covers "Resetuj" with no
further line.

Widths at the narrowest window (320 px, panel 304 px, padding 12 px at each side, room
280 px): the toolbar needs 5 × 44 + 4 × 8 = 252 px; the title row gives the title
280 − (2 × 44 + 8) − 12 = 172 px, where the heading wraps and the name is cut with an
ellipsis, as both do today.

**Rationale**: aligned to the top, the window buttons do not move when the heading wraps to
a second line (FR-003, SC-008). Every value is an existing token; no new colour, size, or
breakpoint (constitution, Principle IV).

**Alternatives considered**:

- Buttons spread over the width on a phone: the requester chose "centred"; one rule for all
  widths is simpler.
- A grid with named areas: no gain over two flex rows for two rows.

## R6. Where the settings open

**Decision**: the settings stay an element of the panel, placed absolutely, as today. Two
things change. Across: on screens wider than 600 px they are centred in the panel (insets of
zero at both sides and automatic side margins), no longer at the right edge; at 600 px and
narrower they keep the full width they have today. Down: the top is no longer a fixed
number. The application sets the custom property `--wt-popover-top` to the measured height
of the header each time the settings open, and again while they are open whenever that
height can change: when the window changes size and when a load ends (the two callbacks the
application already gets from the controller, for a load that succeeded and one that
failed). The stylesheet keeps a default for the property.

**Rationale**: the toolbar is centred and about as wide as the settings (334 px against
320 px), so centred settings stand under the whole toolbar with the gear above their right
part, as FR-005 asks. The height of the header is not a
constant any more: a heading that wraps adds a line. A measured top keeps the settings under
the toolbar for every title, and the existing rule for their greatest height
(`100cqh − top − gap`) keeps working with the measured value, so they stay inside the panel.
Setting a custom property through the style object is the way the launcher's place is
already passed to the stylesheet; no inline style in markup.

**Alternatives considered**:

- New fixed numbers (104 px and 112 px): wrong as soon as the heading wraps; on a phone the
  settings would cover the toolbar.
- Measuring only on opening: the settings would stand one line off after a load that makes
  the title wrap differently; FR-005 asks them to follow the header.
- A `ResizeObserver` on the header: exact, but the header changes its height only at the
  three moments named above, and the test environment has no layout to observe.
- CSS anchor positioning on the gear: places the top, but the greatest height still needs
  the distance to the foot of the panel, and the fallback for browsers without it would be
  the fixed numbers above.
- Moving the settings into a wrapper around everything under the header: a pure stylesheet
  solution, but it changes the flex layout of the whole panel and the way a low panel
  scrolls.

## R7. The smallest height of the panel

Changed on 2026-11-14: the number is 640 px now, see R12. The reasoning below is the one of
the first design, with the header in two rows.

**Decision**: the smallest height rises from 440 px to 484 px: the token
`--wt-panel-min-height` and the constant `MIN_PANEL_HEIGHT`. A stored height from 440 to 483
is read as 484. The lower bound of the storage contract changes with it
([contracts/settings-storage.md](contracts/settings-storage.md)).

**Rationale**: on screens 600 px and wider the header grows by one control (34 px) and one
gap (8 px), 42 px together. At 440 px the table area would keep about 4 px under the column
headers; the existing browser test asks for 46 px (one row). 440 + 42 = 482; 484 is the next
multiple of 4 and leaves 2 px for rounding. Reading 440 to 483 as 484 is the automatic
migration the constitution asks for (Principle VI): without it such a height would count as
invalid and the panel would jump back to half of the window. Below 600 px nothing changes:
there the whole panel scrolls and the header had two lines already.

**Alternatives considered**:

- Keeping 440 px with tighter spacing in the header: 42 px cannot be saved there.
- Keeping 440 px and letting the lowest panel scroll: breaks 001 FR-059 and FR-061 (the
  total row stays in view).
- Rejecting stored heights under 484: a silent loss of a size the user chose.

## R8. The sign of "Resetuj"

**Decision**: a house, drawn as an outline on the 24 × 24 grid like the other signs: a roof,
walls, and a door. One new entry `home` in the table of icon outlines in `src/ui/dom.ts`.

**Rationale**: FR-009 asks for a sign that cannot be taken for the sign of "Odśwież" or of
"Cofnij", and names the house after this decision. The usual
sign for a reset is an arrow running round against the clock. On a phone the label is
hidden, and that arrow would stand directly beside the arrow of "Odśwież" that runs round
with the clock: two signs that differ only in direction. A house is the common sign for
"back to the start view", which is what the button does, and shares no shape with the two
arrows. On a wide screen the label "Resetuj" stands beside it.

**Alternatives considered**:

- An arrow round against the clock: see above.
- A calendar with a dot ("today"): says nothing about the person and the steps; small
  details at 18 px.
- A "skip to start" sign (a bar and a triangle): reads as media control.

## R10. The name of the plugin with its version (added 2026-11-14)

Changed on the same day: the name stands in the total row now, not in the header, and the
title is back in the first row; see R13. How the version reaches the script is unchanged.

**Decision**: the bar of the header shows `Jira Custom Tempo - <version>` in a paragraph
`p.wt-app` at its left; the title (the name of the person and the heading) moves into a row
of its own below the bar. The version is the `version` of `package.json`, put into the
script at build time through `define` in `vite.config.ts` as the constant
`__APP_VERSION__`. A unit test holds it equal to the versions of the manifest and of the
lock file. The name is the constant `APP_NAME` of the header, which the panel's accessible
name uses as well. This replaces the part of R1 and R5 that put the title into the bar.

**Rationale**: the requester asked for it after seeing the built plugin (spec,
Clarifications). `package.json` is where the version is set for every build; `define` works
the same in the extension build, the size build, the demo build, and the tests, and costs a
few bytes. The paragraph uses the smallest text size (11 px; the requester asked for
"smaller than 13 px, for example 10 px", and 11 px is the smallest size the panel has) and
the muted colour the panel has
already; only "slanted" is new, and it is not a token.

**Alternatives considered**:

- `chrome.runtime.getManifest().version`: exact for an installed extension, but there is no
  extension API on the stand-in page and in the tests, and the content script uses none
  today.
- Importing `package.json` into the script: the whole file would travel into the bundle
  unless the bundler removes the rest.
- Reading the version of the manifest at build time: the manifest is copied as it is; the
  package is the one place the build tools read.

## R11. More room above the toolbar and around the bar (added 2026-11-14)

**Decision**: `.wt-header__tools` gets `margin-block-start: calc(var(--wt-space-4) * 2)`
(32 px) and `.wt-progress` gets `margin-block: var(--wt-space-4)` (16 px).

**Rationale**: the requester first gave the two distances as `2em` and `1em` (30 px and
15 px with the panel's text of 15 px) and then said they need not be in em and should agree
with the rest of the panel. The shared spacings go from 4 px to 20 px; the stylesheet
already doubles one where it needs more (`calc(var(--wt-space-3) * 2)` in the same part of
the panel). Twice 16 px and 16 px are the nearest to what was asked. The margin of the
progress part is the same above and below, so the bar stays midway between the period box
and the table (001 FR-066). No exception to "no new spacing" (FR-022) is left.

**Alternatives considered**:

- `2em` and `1em` as first written: values of their own beside the tokens.
- New spacing tokens of 32 px: one token for one use; doubling an existing one is the way
  the stylesheet has.
- A larger gap for the whole header: it would also move the title away from the bar.

## R12. The smallest height after the changes of 2026-11-14

Changed on the same day: with the header back in two rows the number is 592 px, see R13.
The reasoning below is the one for the header in three rows.

**Decision**: 640 px in place of the 484 px of R7. A stored height from 440 to 639 is read
as 640.

**Rationale**: measured in the browser at 1280 px. The header is 74 px higher than in R7
(the bar of 34 px with its gap of 8 px, and the margin of 32 px) and the progress part
32 px, 106 px together. The view with the chart is higher than the view of a day, and the
chart grows with the panel (14.5% of its height), so it decides. With the chart, a panel of
632 px leaves 42.6 px under the column headers, one of 636 px exactly 46.0 px, and one of
640 px 49.4 px; none of the three scrolls as a whole. A table row of one or two lines needs
46 px (the existing browser test), and 636 px meets that with nothing to spare, so the
number is 640 px. In the view of a day the same panel leaves about 110 px. R7 looked at the
view of a day only; with the old distances the chart overflowed the lowest panel by so
little that the total row stayed in view, which the browser test of the large month checks.
With the new distances it would not.

A consequence the requester should know: the default height is half of the window, so in a
window lower than 1280 px the panel opens at 640 px; and in a window lower than about
740 px the panel has no room for 640 px, becomes lower by itself, and scrolls as a whole
(001 FR-075).

**Alternatives considered**:

- A height that is enough for the view of a day only (about 580 px): the chart views would
  push the total row and the export control out of sight in the lowest panel.
- 636 px: the row fits to the tenth of a pixel; a rounding in another browser would cut it.
- A lower chart in a low panel: the chart is 64 px at its lowest already.
- Smaller margins than asked: not the plan's choice to make.

## R13. The name in the total row, the export control in the middle (added 2026-11-14)

**Decision**: after a second look at the plugin the requester moved three things. The name
of the plugin with its version stands at the left of the total row, the bottom left corner
of the panel. The title is back in the first row of the header, beside the window buttons,
as in R1 and R5. The export control of 003 stands in the middle of the total row.

The total row becomes a grid of three columns, `minmax(0, 1fr) auto minmax(max-content,
1fr)`: the name, the control, the total. The label and the value of the total get a group
of their own, `div.wt-footer__total`, so the row has three parts. The paragraph `p.wt-app`
and the constant `APP_NAME` move into a small module of their own, `src/ui/about.ts`; the
table, which owns the total row, puts the paragraph there, and the application takes the
name of the panel from the same module. At 600 px and narrower the grid has two columns:
the control at the left and the total at the right, as in 003, and the name on a line below.

The smallest height of the panel is 592 px, and a stored height from 440 to 591 is read as
592.

**Rationale**: two equal side columns put the middle of the control on the middle of the
row without measuring anything, and the right column never gets narrower than the total,
so a long total pushes the control aside and is not covered. The name is the part that
gives way: it may shrink to nothing and is cut with an ellipsis. On a phone the row is
280 px wide, the total up to about 170 px, and the control 75 px: the total reaches past
the middle, so the control cannot stand there; it keeps the left edge it has in 003, and
the name, which would have 20 px left, takes a line of its own at the bottom left.

The height: measured in the browser at 1280 px, with the chart of a week. A panel of
592 px leaves 50.4 px under the column headers, one of 596 px 53.8 px; none scrolls as a
whole. A row of one or two lines needs 46 px, which a panel of about 587 px would give;
592 keeps the few pixels of reserve that 640 kept for the header in three rows (R12). The
default height is half of the window, so in a window lower than 1184 px the panel opens at
592 px; in a window lower than about 690 px it has no room for 592 px and scrolls as a
whole (001 FR-075).

**Alternatives considered**:

- The control centred in the room between the name and the total (a flex row): it would
  move with the length of the total, and stand left of the middle for a long one.
- The control centred on a phone as well: it would overlap the total, see above.
- The name of the plugin kept in the header as well: the requester moved it, and one place
  is enough.
- The paragraph built inside `table.ts`: the name of the panel in `app.ts` would then come
  from the table or be written twice.

## R9. Tests

**Decision**: the three kinds of tests the project has.

- UI tests (`vp test`, `happy-dom`): the header (two groups, their order, "Resetuj" with
  label, name, and tooltip; `setResettable` and the focus), the controller's rule through
  the application (each of the three reasons alone, the state at once and during a load,
  after a failed load, after midnight with a moved clock), the reset itself (period, person,
  steps, launcher, stored settings byte for byte, settings and export menu closed, a running
  load given up), `close()` against `reset()`.
- Unit tests: the text "Resetuj"; a stored height of 440 to 483 read as 484.
- Browser tests (Playwright) at 320 px with touch and at 1280 px, in both themes: the two
  rows, the counts 2 and 5, every button inside the panel and 44 × 44 px on touch, the
  window buttons at the same place for a short and a long title, the centred toolbar, the
  keyboard order, the settings under the toolbar and inside the panel, the lowest panel at
  484 px with one row, the reset flow and its focus, and one pass with the built extension.

**Rationale**: constitution, Principle V: every behaviour has a test in the same change, and
responsive behaviour is tested at one phone and one desktop width. Jira is faked in all of
them, as before. `happy-dom` has no layout, so everything about places and sizes is a
browser test.

**Alternatives considered**: none; the kinds of tests are fixed by the project.
