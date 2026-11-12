# Contract: Settings Storage

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) (R5) |
**Data model**: [../data-model.md](../data-model.md) (UserSettings)

## Location

Browser `localStorage` of the app's Custom UI frame. The panel page and the dashboard gadget
are served from the same app origin and share it.

## Key and value

| Key | Value |
|-----|-------|
| `worktime.settings.v1` | JSON text of the object below |

```json
{ "refreshMinutes": 5, "theme": "dark" }
```

| Field | Type | Allowed | Default |
|-------|------|---------|---------|
| `refreshMinutes` | integer | 0 to 1440; `0` = auto-refresh off | `5` |
| `theme` | string | `"dark"` or `"light"` | `"dark"` |

## Read rules

- Read once, synchronously, before the first render, so the saved theme is applied from the
  first paint (FR-047).
- Missing key, unparsable JSON, or storage that throws: use both defaults.
- A field that is missing or outside its allowed values: use that field's default; keep the
  other field.
- Unknown extra fields are ignored.

## Write rules

- Written only when the user presses "Zapisz" in settings, with both fields, after validation.
- "Anuluj", or closing the settings in any other way, writes nothing (FR-046).
- If writing throws (storage blocked or full), the new settings stay in effect for the current
  session and the settings show a Polish notice that they could not be saved.

## Versioning

The `v1` suffix is the format version. A future incompatible format uses a new key and reads
the old key once to migrate. No migration exists in this version.

## Scope of the data

- Per browser profile, not per Jira account: a second device or browser starts with defaults.
- Contains no personal data and no Jira data.
- Never sent anywhere.
