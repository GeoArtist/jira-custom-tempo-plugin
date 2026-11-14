# Contract: The Header in Two Rows, the Reset Button, and the Total Row

**Feature**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)

This contract replaces item 1 of "Panel layout, top to bottom" in
[001 contracts/ui.md](../../001-worktime-panel/contracts/ui.md) and adds the reset button.
Everything else of the contracts of 001, 002, and 003 stays.

## Markup

```text
header.wt-header
├── div.wt-header__bar                     the title row
│   ├── div.wt-header__text                unchanged
│   │   ├── p.wt-person                    002 FR-006
│   │   └── h1.wt-title                    001 FR-012, FR-013
│   └── div.wt-header__window
│       ├── button  "Minimalizuj"          icon; aria-label and title
│       └── button  "Zamknij"              icon; aria-label
└── div.wt-header__tools                   the toolbar
    ├── button  "Cofnij"                   icon; aria-label and title; disabled with no step
    ├── button  "Ponów"                    icon; aria-label and title; disabled with no step
    ├── button  "Odśwież"                  icon and label; aria-disabled while a load runs
    ├── button  "Resetuj"                  icon and label; title; disabled on the start view
    └── button  "Ustawienia"               icon; aria-label; aria-haspopup="dialog"; aria-expanded

div.wt-footer                              the total row, at the foot of the panel
├── p.wt-app                               "Jira Custom Tempo - " and the version (FR-023)
├── div.wt-export                          the export control of 003, unchanged inside
└── div.wt-footer__total
    ├── span.wt-footer__label              "Suma czasu:"
    └── span.wt-footer__value.wt-total     the total
```

- The order of the elements is the reading order and the Tab order (FR-006). No `tabindex`.
- The groups are plain `div` elements: no role and no name ([research.md](../research.md) R1).
- `p.wt-app` is a paragraph: not a heading, not a control. Its text is the name of the
  product, a hyphen between two spaces, and the version of `package.json`, which the build
  puts into the script and a test holds equal to the version of the manifest. It stands
  once in the panel, in the total row, and not in the header.
- The label and the value of the total have a group of their own, `div.wt-footer__total`,
  so the row has three parts.
- The class `wt-header__actions` no longer exists.
- Every button is `type="button"` and has the class `wt-button`; a button with an icon only
  also has `wt-button--icon`.
- "Resetuj": `button.wt-button.wt-button--reset`, the icon `home`, and a `span` with the
  text. Its accessible name comes from the text, so it has no `aria-label`, like "Odśwież".

## Layout

| | Wider than 600 px | 600 px and narrower |
|-|-------------------|---------------------|
| Header | a column of two rows; 8 px between the rows; padding 16 / 20 / 8 px (top / sides / bottom) as today | the same column; padding 12 / 12 / 8 px as today |
| Title row | text at the left, takes the room that is left; window buttons at the right, aligned to the top; 12 px between them | the same |
| Window buttons | 34 × 34 px, 8 px apart | 44 × 44 px, 8 px apart |
| Toolbar | centred; 8 px between buttons; one line; 32 px of margin above it (twice the spacing of 16 px), besides the gap of 8 px (FR-024) | the same |
| Toolbar buttons | 34 px high; "Odśwież" and "Resetuj" with their labels | 44 × 44 px; "Odśwież" and "Resetuj" show the icon only, the label stays for assistive technology |
| Period box | 8 px under the header, as today | as today |
| Progress bar or chart | 16 px of margin above and below its part of the panel (the spacing of 16 px), besides the padding it has today (FR-024) | the same |
| Total row | three columns: the name of the plugin at the left edge, the export control in the middle, the total at the right edge; the two side columns are equal, so the middle of the control is the middle of the row; a side that needs more than its half takes it from the middle (FR-023, FR-025) | two columns: the export control at the left edge and the total at the right edge, as in 003; the name of the plugin on a line of its own below, at the left |
| Name of the plugin | 11 px (the smallest text size of the panel), slanted, not bold, the muted grey of the theme; one line, cut with an ellipsis; at mid-height of the row, level with the button and the total | the same look; a line of text under the other two parts |

- The heading wraps inside its room and the name is cut with an ellipsis, as today; neither
  moves or covers the window buttons (FR-003).
- The smallest height of the panel is 592 px (FR-008): with the two rows, the two margins,
  and the chart of a longer period, a lower panel would scroll as a whole.
- The total row keeps its height in a wide window; the menu of the export control still
  opens above its button, and its failure message stands beside the button or under it
  (003 FR-005, FR-009).
- At a window of 320 px the toolbar is 252 px wide in a room of 280 px.
- With touch input on a wide screen the buttons are 44 px as well (the existing rule for
  coarse pointers).

## The settings

- Across, wider than 600 px: centred in the panel, 320 px wide as today. At 600 px and
  narrower: from 8 px to 8 px of the panel's sides, as today.
- Down: directly under the toolbar; they cover no header button (FR-005). The top is the
  custom property `--wt-popover-top`. The application sets it to the height of the header
  each time the settings open, and again while they are open when the window changes size
  and when a load ends. The stylesheet has a default (136 px; 144 px at 600 px and
  narrower) for a page that cannot be measured.
- Greatest height: unchanged, `100cqh − top − 8 px`, so the settings end inside the panel.

## Look

- "Resetuj" looks like "Odśwież": the same border, background, text size, and hover
  (001 FR-065), from the same tokens. No new token.
- Disabled, "Resetuj" looks like "Cofnij" and "Ponów" with nowhere to go: 40% opacity,
  default cursor, no reaction to the pointer.
- The icon `home`: an outline on the 24 × 24 grid, drawn with the current text colour at
  18 px: a roof, walls, and a door ([research.md](../research.md) R8).
- Both themes follow from the tokens.

## Behaviour

- "Resetuj" is enabled exactly when the view is not the start view
  ([data-model.md](../data-model.md), "Resettable"). The state changes at once with the
  view, before any load has finished.
- A press goes to the start view and keeps the panel open
  ([data-model.md](../data-model.md), "Transition: reset"): today, the signed-in user, no
  steps; the rows of another person disappear at once; the settings close without saving
  (a running check of a person is given up, an open alert closes with them); the export
  menu closes; the launcher shows "Dziś:", with the pending sign when the period or the
  person changed and with the total it has when only the steps were forgotten (FR-014).
- The button is then disabled. When it holds the focus at that moment, from the keyboard,
  the mouse, or touch, the focus is on "Odśwież" (FR-018). The same holds when "Resetuj"
  becomes disabled while it holds the focus for any other reason.
- No confirmation is asked (FR-017).
- Enter and Space activate the button; while disabled it is skipped by Tab and announced as
  unavailable.
- "Zamknij", "Minimalizuj", the launcher, and Escape behave as before (FR-020). On opening,
  the focus goes to "Zamknij".
- The rule of 003 FR-030 is unchanged: a control that lost its use hands the focus to
  "Cofnij", or to "Odśwież" when "Cofnij" is disabled.

## Texts

| Element | Text |
|---------|------|
| Reset button (label, accessible name, tooltip) | `Resetuj` |

No other Polish text is added or changed. The total row also shows the name of the product
and the version, "Jira Custom Tempo - 0.5.0" for version 0.5.0 (FR-023); it is not
translated and does not come from the text module.

## Interfaces between the parts

```ts
// src/ui/about.ts
/** The name of the add-on: the accessible name of the panel, and the start of the line below. */
export const APP_NAME = 'Jira Custom Tempo';
/** `p.wt-app`: the name with the version of the build. The table puts it into the total row. */
export function createAbout(): HTMLElement;
```

```ts
// src/ui/header.ts
interface HeaderOptions {
  onBack(): void;
  onForward(): void;
  onRefresh(): void;
  /** Back to the start view; the panel stays open (004 FR-010). */
  onReset(): void;
  onSettings(): void;
  onMinimise(): void;
  onClose(): void;
}

interface Header {
  // unchanged: element, settingsButton, update, setPerson, setBusy, focusFallback,
  // setHistory, focus
  /**
   * Whether there is something to reset. Switched off under the keyboard focus, the
   * button hands the focus to "Odśwież" first (004 FR-015, FR-018).
   */
  setResettable(can: boolean): void;
}
```

```ts
// src/ui/controller.ts
class Controller {
  // unchanged public members
  // private: canReset(), reported with header.setResettable() from showHistory() and load()
}
```

```ts
// src/ui/app.ts
interface App {
  // unchanged: root, controller, isOpen, open, close, minimise
  /** Back to the start view with the panel open; does nothing while the panel is hidden. */
  reset(): void;
}
```

```ts
// src/ui/dom.ts
type IconName = /* the existing names */ | 'home';
```

```ts
// src/domain/settings.ts
export const MIN_PANEL_HEIGHT = 592; // was 440
// readSettings: an integer height from 440 to 591 is read as MIN_PANEL_HEIGHT
```

```ts
// src/types.d.ts; the value comes from `define` in vite.config.ts
declare const __APP_VERSION__: string; // the version of package.json
```
