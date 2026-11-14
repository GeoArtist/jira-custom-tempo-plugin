# Contract: Settings Storage

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) (R5) |
**Data model**: [../data-model.md](../data-model.md) (UserSettings)

## Location

The browser's `localStorage` of the Jira site the add-on runs on. The content script shares
that storage with the Jira page, so the key is namespaced. No extension storage and no
extension permission is used.

Consequence: the settings are kept per browser and per Jira site. A second browser, a second
device, or a second Jira site starts with the defaults.

## Key and value

| Key | Value |
|-----|-------|
| `worktime.settings.v1` | JSON text of the object below |

```json
{ "refreshMinutes": 5, "theme": "dark", "panelHeight": null, "panelWidth": null, "launcher": null }
```

| Field | Type | Allowed | Default |
|-------|------|---------|---------|
| `refreshMinutes` | integer | 0 to 1440; `0` = auto-refresh off | `5` |
| `theme` | string | `"dark"` or `"light"` | `"dark"` |
| `panelHeight` | integer or `null` | 592 to 4000 (px); a stored 440 to 591 is read as 592 (004 FR-008); `null` = the default height, 50% of the window | `null` |
| `panelWidth` | integer or `null` | 640 to 4000 (px); `null` = the default width, 800 px | `null` |
| `launcher` | object or `null` | `{ "right": n, "bottom": n }`, integers 0 to 10000: px from the window's right and bottom edges to the launcher's own; `null` = the default corner | `null` |

## Read rules

- Read once, synchronously, before the add-on draws anything, so the saved theme is applied
  from the first moment (FR-047).
- Missing key, unparsable JSON, or storage that throws: use all defaults.
- A field that is missing or outside its allowed values: use that field's default; keep the
  other fields.
- A stored `panelHeight` or `panelWidth` larger than the current window is kept; the panel is
  drawn as large as the window allows.
- A stored `launcher` that would be outside the current window is kept; the launcher is drawn
  at the nearest place wholly inside the window.
- A `launcher` object with a missing or invalid offset counts as `null`.
- Unknown extra fields are ignored.

## Write rules

- Written when the user presses "Zapisz" in settings, with all fields, after validation.
  "Zapisz" keeps the stored `panelHeight`, `panelWidth`, and `launcher`.
- Written when the user has set the panel's size: at the end of a drag of a free edge or the
  corner, on an arrow key on one of them, and on a reset to the default (FR-059, FR-071).
- Written when the user has moved the launcher: at the end of a drag, and on Shift with an
  arrow key (FR-072).
- In both cases the other fields keep their saved values.
- "Anuluj", or closing the settings in any other way, writes nothing (FR-046).
- If writing throws (storage blocked or full), the new settings stay in effect until the page
  is left and the settings show a Polish notice that they could not be saved.

## Versioning

The `v1` suffix is the format version. A future incompatible format uses a new key and reads
the old key once to migrate. No migration exists in this version.

## Scope of the data

- Contains no Jira data. Since feature 002 it can hold the account ID and the name of one
  other person, the one whose time was shown last (`lastPerson`); see
  [the storage contract of 002](../../002-other-user-worktime/contracts/settings-storage.md).
- Never sent anywhere.
- The add-on reads and writes this one key only; it does not touch anything else in the Jira
  site's storage.
