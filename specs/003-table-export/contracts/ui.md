# Contract: The Export Control and Its Menu

**Feature**: [spec.md](../spec.md) | **Data**: [data-model.md](../data-model.md)

This contract restates the spec for the implementer. The spec is the source; where they
differ, the spec wins. It adds to `specs/001-worktime-panel/contracts/ui.md` (the total row)
and changes one line of it: "Odśwież is disabled while a load is running" becomes
"switched off, and able to hold the keyboard focus" (FR-030).

## Markup

The footer of the table area (`.wt-footer`, 001) gets a left group before its label and
value:

```text
div.wt-footer
├── div.wt-export                         left group; always present, so the row keeps its height
│   ├── div.wt-export__anchor                 the button and its menu: the menu is placed against the button
│   ├── button.wt-button.wt-export__button    (in the anchor) "Eksport"; hidden attribute when the state is "absent"
│   │       type="button" aria-haspopup="menu" aria-expanded="false|true" aria-controls="wt-export-menu"
│   │       aria-disabled="true" + aria-busy="true" while a file is made (never the disabled attribute then: it keeps the focus); disabled while a load runs
│   ├── div.wt-export__menu#wt-export-menu    (in the anchor) role="menu" aria-label="Eksport"; hidden while closed
│   │   ├── button role="menuitem" data-format="csv"   text "*.csv"   aria-label="Eksport do pliku CSV"
│   │   └── button role="menuitem" data-format="xlsx"  text "*.xlsx"  aria-label="Eksport do pliku XLSX"
│   └── span.wt-export__message               role="status" aria-live="polite"; empty or the failure text
├── span.wt-footer__label                 "Suma czasu:" (unchanged)
└── span.wt-footer__value.wt-total        the total (unchanged)
```

## Layout

- `.wt-footer` spreads its two groups: the export group at the left edge, label and value
  together at the right edge (001 FR-062 unchanged). Items are centred on the row's height.
- The footer has a minimum height of one control plus its own padding (`--wt-control`; on
  touch devices and narrow screens `--wt-touch`), with or without the button (FR-001).
- The menu is positioned above the button, its left edge on the button's left edge, with
  the normal gap (`--wt-space-1`), inside the panel. It is as wide as its longest item, at
  least as wide as the button. It lies above the table area (which it may cover) and under
  nothing of the panel.
- The message stands right of the button when it fits on the line of the total (as at
  1280 px); otherwise it wraps under the button and the row grows (as at 320 px). It never
  pushes or cuts the total.
- At 320 px the button, "Suma czasu:", and a total of `999h 59m` fit on one line.
- The same footer and the same place at every width, also where the rows are drawn as
  cards (the narrow layout of 001).

## Look

Only existing tokens; no new colour and no new size token.

| Part | Look |
|------|------|
| Button | as `.wt-button` (the "Spróbuj ponownie" button): border, surface, text colour; hover as the other buttons (001 FR-065); disabled at reduced strength with the default pointer |
| Button, menu open | the look of a pressed or selected control of the panel |
| Menu | raised surface, border, the small radius, the panel's shadow |
| Menu item | text colour; under the pointer or with the focus the hover background; height `--wt-control`, on touch `--wt-touch` |
| Message | the colour of error messages (`--wt-danger`), the small text size |
| Focus | the common focus ring on the button and on each item |

Both appearances follow from the tokens.

## Behaviour

| Event | Result |
|-------|--------|
| Click, tap, Enter, Space, or Arrow Down on the button (menu closed) | the menu opens; the focus goes to "*.csv"; `aria-expanded="true"`; the failure message is cleared |
| Click or tap on the button (menu open) | the menu closes; the focus stays on the button |
| Arrow Down / Arrow Up in the menu | the next / previous item, wrapping round |
| Home / End in the menu | the first / last item |
| Click, tap, Enter, or Space on an item | the menu closes, the focus returns to the button, the export of that format starts |
| Escape while the menu is open | the menu closes, the focus returns to the button; the event goes no further (the panel stays) |
| Tab or Shift+Tab in the menu | the menu closes; the focus moves on as usual |
| Pointer pressed outside the button and the menu | the menu closes |
| A load starts (`showLoading`) | the menu closes; the button is disabled; the failure message is cleared |
| The button is disabled or hidden while it or an item has the focus (FR-030) | the focus goes to "Cofnij"; to "Odśwież" when "Cofnij" is disabled |
| "Odśwież" has the focus, or gets it, while a load runs (FR-030) | it keeps the focus; it looks disabled with its loading sign, carries `aria-disabled="true"` and `aria-busy="true"`, and ignores activation |
| The button is disabled or hidden while the focus is elsewhere | the focus does not move |
| The rows come back after a load | the button is enabled; the focus does not move |
| The panel is minimised or closed | the menu closes |
| A file is being made | the button has `aria-disabled="true"` and `aria-busy="true"`, the label `Tworzenie pliku…` for assistive technology, and ignores activation; it has no `disabled` attribute and keeps the focus |
| The export throws | the message `Nie udało się utworzyć pliku.` appears; the button is enabled again; nothing else changes |
| The export succeeds | no message; the browser shows its download |
| The sort order changes | nothing: an open menu and a shown message stay |

States of the button (absent, disabled, enabled): see the data model.

## Texts

All in `src/i18n/pl.ts` (FR-028).

| Element | Text | Key |
|---------|------|-----|
| Export control | `Eksport` | `exportLabel` |
| Choice 1, visible | `*.csv` | `exportCsv` |
| Choice 1, for assistive technology | `Eksport do pliku CSV` | `exportCsvLabel` |
| Choice 2, visible | `*.xlsx` | `exportXlsx` |
| Choice 2, for assistive technology | `Eksport do pliku XLSX` | `exportXlsxLabel` |
| The control while a file is being made, for assistive technology | `Tworzenie pliku…` | `exportBusy` |
| File could not be made | `Nie udało się utworzyć pliku.` | `exportFailed` |
| Name of the sheet | `Raport` | `exportSheet` |

Reused: `pl.columns.*` (headers of both files) and `pl.total` (`Suma czasu:`).

## Interfaces between the parts

```ts
// src/ui/export-menu.ts
type ExportFormat = 'csv' | 'xlsx';
interface ExportMenu {
  element: HTMLElement;                                   // div.wt-export
  setState(state: 'absent' | 'disabled' | 'enabled'): void;
  close(): void;
}
function createExportMenu(options: {
  onChoose(format: ExportFormat): void;   // may throw: the menu then shows the failure message
  onFocusLost?(): void;                   // the button lost its use while it held the focus (FR-030)
}): ExportMenu;

// src/ui/table.ts
interface ShownView { rows: TicketRow[]; period: Period; timeZone: string; summary: PeriodSummary }
function createTable(options?: {
  onExport?(format: ExportFormat, view: ShownView): void;
  onFocusLost?(): void;                   // handed on to the export menu
}): Table;
// Table gains: closeMenu(): void  (called by app.ts when the panel is hidden)

// src/ui/header.ts
// Header gains: focusFallback(): void  ("Cofnij", or "Odśwież" when "Cofnij" is disabled)
// Header changes: setBusy(true) sets aria-disabled and aria-busy on "Odśwież" and makes its
// click do nothing; it no longer sets the disabled attribute. The disabled look is styled
// on [aria-disabled='true'] as well as on :disabled.

// src/export/index.ts  (the only module of src/export that other code imports)
interface ExportView extends ShownView { personName: string }
interface ReportFile { name: string; mime: string; data: string | Uint8Array }
function buildFile(view: ExportView, format: ExportFormat, now: Date): ReportFile;
function saveFile(file: ReportFile, host: Node): void;    // throws when the file cannot be handed to the browser

// src/ui/app.ts
interface AppDeps { /* … */ saveFile?: typeof saveFile }  // replaced in tests
```
