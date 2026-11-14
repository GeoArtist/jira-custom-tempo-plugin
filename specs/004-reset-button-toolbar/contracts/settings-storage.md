# Contract: Stored Settings (change of one bound)

**Feature**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)

This contract changes one line of
[001 contracts/settings-storage.md](../../001-worktime-panel/contracts/settings-storage.md).
Everything else there, and in the contract of 002, stays: the key `worktime.settings.v1`,
the fields, their defaults, and the rule that a value which cannot be used falls back to its
default field by field.

## `panelHeight`

| | Type | Valid | Default |
|-|------|-------|---------|
| Before | integer or `null` | 440 to 4000 (px) | `null` |
| After | integer or `null` | 592 to 4000 (px) | `null` |

Reading:

| Stored value | Read as | Reason |
|--------------|---------|--------|
| `null`, missing | `null` (half of the window) | unchanged |
| integer 592 to 4000 | itself | unchanged |
| integer 440 to 591 | 592 | a height chosen before this feature; the panel shows it at the new smallest height (FR-008) |
| anything else | `null` | unchanged: invalid values fall back to the default |

Writing: unchanged. The grips never store a height under 592. A value read as 592 is not
written back by the reading; it is stored with the next write of the settings.

No version of the key is needed: an older build that reads a value written by this build
finds a height of 592 or more, which was valid before as well.

## What this feature does not store

"Resetuj" writes nothing (FR-013). The start view is not stored: it is where every newly
loaded page begins (001 FR-049, 002 FR-027).
