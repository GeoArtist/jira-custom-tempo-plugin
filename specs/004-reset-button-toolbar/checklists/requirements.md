# Specification Quality Checklist: Reset Button and Two-Row Header

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-14
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Validation run 1 (2026-11-14): all items pass. No [NEEDS CLARIFICATION] marker was
  needed: the request ties the reset to "tak jak teraz działa przycisk X", and what the
  close button does today is fixed by 001 FR-049, FR-082 and 002 FR-028.
- The spec names sizes in px (320, 600, 44 x 44) and exact Polish texts. They are what the
  user sees and what the constitution fixes (Principle III), as in the specs of 001 to 003;
  the spec names no language, framework, library, or API.
- Four defaults are worth a look by the requester before planning, because each changes
  what the user sees (they can be changed with `/speckit-clarify`):
  - "Resetuj" resets the view only (today, signed-in user, no steps back); the stored
    settings (theme, interval, panel size, launcher place) stay;
  - the button is named "Resetuj" (Polish imperative), not "Reset" as in the request;
  - "Resetuj" has a written label beside its sign, like "Odśwież";
  - the toolbar is aligned to the left edge, under the title.
- Clarification session 2026-11-14: the requester answered four questions. Two defaults are
  confirmed (the reset covers the view only; the button shows a sign and the label
  "Resetuj"). Two changed: the toolbar is centred, not aligned to the left; "Resetuj" is
  disabled on the start view (FR-004, FR-007, FR-015, FR-018; new SC-011, SC-012).
- Validation run 2 (2026-11-14), after the clarifications: all items pass.
- Plan, 2026-11-14: the spec gained two exact rules from the design. FR-008 names the new
  smallest height of the panel (484 px in place of 440 px; a stored 440 to 483 is read as
  484), and the edge case about midnight says when the state of "Resetuj" is worked out.
- Checklist `header.md` resolved on 2026-11-14 (45 items): the spec gained SC-013 and SC-014,
  two acceptance scenarios, five edge cases, and exact rules where it had "next to", "the
  usual gap", or "clearly different" (the place of the window buttons and of the settings,
  the sign of "Resetuj", the focus after a pointer press, the launcher, the moments at which
  the state of the button is worked out).
- Validation run 3 (2026-11-14), after that: all items pass.
- Second clarification session, 2026-11-14, after the requester saw the built plugin: the
  header has three rows (the name of the plugin with its version in the bar, the title
  below, the toolbar), the toolbar and the progress bar have more room, and the smallest
  height of the panel was 640 px then (FR-001 to FR-003, FR-007, FR-008, FR-022, new FR-023 and
  FR-024, SC-014, new SC-015 and SC-016). The resolutions in `header.md` that speak of the
  "title row" and of 484 px describe the spec before this session.
- Validation run 4 (2026-11-14), after that: all items pass.
- Third clarification session, 2026-11-14: the name of the plugin with its version stands
  in the total row, at the bottom left; the title is back in the first row of the header;
  the export control stands in the middle of the total row; the smallest height is 592 px
  (FR-001 to FR-003, FR-007, FR-008, FR-023, new FR-025, SC-014, SC-015, new SC-017).
- Validation run 5 (2026-11-14), after that: all items pass.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
