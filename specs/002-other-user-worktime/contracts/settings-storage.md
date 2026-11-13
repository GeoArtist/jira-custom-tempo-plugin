# Contract: Settings Storage, addition for the remembered person

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) (R6) |
**Data model**: [../data-model.md](../data-model.md) (UserSettings, Person)

Extends [the contract of 001](../../001-worktime-panel/contracts/settings-storage.md).
Location, key, read rules, and write rules there are unchanged unless stated here.

## Key and value

The key stays `worktime.settings.v1`. One field is added:

```json
{
  "refreshMinutes": 5,
  "theme": "dark",
  "panelHeight": null,
  "panelWidth": null,
  "launcher": null,
  "lastPerson": { "accountId": "712020:0f3c9a1e-7b2d-4c55-9a10-2f6d8e4b1c77", "displayName": "Anna Nowak" }
}
```

| Field | Type | Allowed | Default |
|-------|------|---------|---------|
| `lastPerson` | object or `null` | `{ "accountId": s, "displayName": s }`: `accountId` matches `^[A-Za-z0-9:_-]{1,128}$`; `displayName` has 1 to 255 characters; `null` = nobody remembered | `null` |

## Not stored

Whose time the add-on shows (`current` or `other`, and the person in effect) is never
written anywhere. It lives in the running page only (FR-032).

## Read rules (additions)

- `lastPerson` missing, not an object, or with a missing or invalid `accountId` or
  `displayName`: counts as `null`; the other fields keep their values.
- `lastPerson` is read to fill the name field in advance (FR-036). It never selects the
  person on start (FR-027).
- A value written by the previous version (without the field) is read as `lastPerson: null`.

## Write rules (additions)

- "Zapisz" with "Inny użytkownik" and a successful check writes the checked person as
  `lastPerson`, with the name as Jira has it, together with the other fields.
- "Zapisz" with "Obecny użytkownik" keeps the stored `lastPerson`.
- A check that finds the signed-in user themself keeps the stored `lastPerson` too
  (FR-035).
- A failed check, the list, "Anuluj", and closing the settings write nothing (FR-014,
  FR-021).
- Changing the panel size or moving the launcher keeps the stored `lastPerson`.
- If writing throws, the person still takes effect on this page; the settings show the
  existing notice that they could not be saved, and nothing is remembered.

## Versioning

The field is additive, so the format version stays `v1` and no migration exists. The
previous version of the add-on ignores the unknown field.

## Scope of the data (changed)

- The value now can contain one person's Jira account ID and display name. It holds no
  other personal data and no worklog data.
- It is never sent anywhere. The account ID is used only in requests to the same Jira site.
- It is stored in the Jira site's own `localStorage`, which the Jira page can read; Jira
  already knows this person.
- The add-on still reads and writes this one key only.
