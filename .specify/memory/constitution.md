<!--
SYNC IMPACT REPORT (temporary review material; remove before commit)

Version change: 2.0.0 → 2.1.0
Bump rationale: MINOR. One rule is reworded and one constraint is added: settings are
remembered per browser, not per account. No principle is removed or reversed. A per-browser
design was arguably already allowed by 2.0.0's wording "for that user"; 2.1.0 makes it the
only allowed design, which is new guidance, hence MINOR and not PATCH.
Previous change: 1.1.0 → 2.0.0 (Jira Cloud target; theme chosen by a user switch, default dark).

Modified principles:
- IV. Modern, Consistent User Interface: the theme is "remembered between sessions in the
  browser where it was chosen" (was: "remembered for that user between sessions"). Title
  unchanged.

Modified sections:
- Technical Constraints: new rule. User settings are stored in the user's browser, one set per
  browser; never per account, in Jira, or on a server; a browser with no stored settings
  starts with the defaults.

Added sections: none
Removed sections: none

Consistency with existing artifacts:
- specs/001-worktime-panel/spec.md (FR-033, FR-047, FR-050, Clarifications 2026-11-12): now
  consistent. This resolves finding C1 of the 2026-11-12 analysis.
- specs/001-worktime-panel/plan.md, research.md (R5), contracts/settings-storage.md, tasks.md
  (T040, T052): consistent; no change needed.
- specs/001-worktime-panel/spec.md Assumptions still contain the note "Conflict to resolve
  before planning" about Principle IV. It has been obsolete since 2.0.0 and can be removed.
- research.md R5 names Jira user properties as the fallback if browser storage proves unstable
  (spike check S4). Under 2.1.0 that fallback would need a constitution amendment first.

Values chosen by the author of earlier drafts, still unconfirmed (confirm or amend):
- Size budget of 100 KB gzipped for first-render compiled output (Principle I)
- Viewport range 320 px to 1920 px and 44 px touch targets (Principle III)
- WCAG 2.1 AA contrast and keyboard operability (Principle IV)

Follow-up TODOs: none
-->

# Jira Custom Tempo Constitution

## Core Principles

### I. Minimal Footprint

The plugin MUST stay small enough to load fast inside Jira on a mobile connection.

- The compiled output of the TypeScript and SCSS sources required for the first render MUST
  total at most 100 KB gzipped.
- The size of the shipped artifact MUST be measured on every build and the build MUST fail
  when the budget is exceeded.
- Code, assets, and fonts that no shipped feature uses MUST NOT be included in the artifact.
- Images and icons MUST be vector (SVG) or compressed raster; no unoptimized media.

Rationale: the plugin runs inside a host page that is already heavy. Every added kilobyte
slows each Jira page that embeds the plugin, for every user.

### II. Minimal Dependencies

Platform and standard-library capabilities MUST be preferred over third-party packages.

- A runtime dependency MAY be added only with a written justification in the feature plan that
  states: what it replaces, its size cost, and why platform APIs are insufficient.
- A dependency MUST NOT be added for functionality that takes under roughly 50 lines to
  implement in project code.
- All dependencies MUST be pinned to exact versions through a lock file.
- Development-only dependencies (test, build, lint) MUST NOT reach the shipped artifact.

Rationale: each dependency adds size, security exposure, and upgrade work, and directly
conflicts with Principle I.

### III. Responsive on Mobile and Desktop

Every screen MUST be fully usable on both mobile and desktop from a single code base.

- Layouts MUST work at viewport widths from 320 px to 1920 px without horizontal scrolling of
  the page.
- Every feature MUST be reachable and operable by touch and by mouse plus keyboard; no
  feature may depend on hover alone.
- Interactive touch targets MUST be at least 44 x 44 CSS pixels.
- Separate mobile-only and desktop-only implementations of the same screen MUST NOT exist.

Rationale: users log and review work from phones as well as desktops; a screen that works on
one form factor only is an incomplete feature.

### IV. Modern, Consistent User Interface

The interface MUST look current, behave consistently, and fit visually inside Jira.

- Colors, spacing, typography, and radii MUST come from one shared set of design tokens;
  hard-coded one-off values in components MUST NOT be used.
- Light and dark themes MUST both be supported. The active theme MUST be chosen by the user
  with a switch in the plugin settings, MUST default to dark, and MUST be remembered between
  sessions in the browser where it was chosen. The plugin MUST NOT change theme automatically
  to follow Jira or the device.
- Both themes MUST be defined through the same design tokens, so that a theme differs only in
  token values and never in component code.
- Text and interactive elements MUST meet WCAG 2.1 AA contrast, and every interactive element
  MUST be operable by keyboard with a visible focus state.
- Every asynchronous action MUST show loading, empty, and error states; the interface MUST
  NOT show a blank area or fail silently.

Rationale: a consistent token-driven interface is what makes a UI read as modern, and it keeps
visual changes cheap and small in size.

### V. Tested Behavior

Every shipped behavior MUST be covered by automated tests.

- A change that adds or alters behavior MUST include tests for that behavior in the same
  change.
- A bug fix MUST include a test that fails without the fix.
- The full test suite MUST pass before a change is merged; failing or skipped tests MUST NOT
  be merged without a linked, documented reason.
- Tests MUST run with a single command and MUST NOT require a live Jira instance; integration
  with Jira is exercised against recorded or mocked responses.
- Responsive behavior (Principle III) MUST be tested at one mobile and one desktop viewport at
  minimum.

Rationale: the plugin runs inside customer Jira instances where a regression is hard to
diagnose remotely; tests are the only reliable guard.

### VI. Install-Only Setup

Installing the plugin MUST be the only action a user performs to make it work.

- The plugin MUST be delivered as one self-contained Jira Cloud app, installed through the
  standard Jira Cloud app installation mechanism.
- After installation the plugin MUST be functional with default settings. Manual
  configuration, file edits, database setup, separate service deployment, and command-line
  steps MUST NOT be required.
- The plugin MUST run entirely on Jira Cloud and on the infrastructure Atlassian hosts for
  Jira Cloud apps. It MUST NOT depend on any server or service operated by the project or by
  the user.
- Any required initialization or data migration MUST run automatically on install and on
  upgrade.
- Optional settings MAY exist, but every one MUST have a working default.

Rationale: each extra setup step is a point where an installation is abandoned or
misconfigured; the artifact has to carry everything it needs.

## Technical Constraints

- The target platform is Jira Cloud. The plugin MUST be built, packaged, and installed as a
  Jira Cloud app. Jira Data Center and Jira Server are out of scope and MUST NOT shape design
  decisions.
- All front-end application code MUST be written in TypeScript. Hand-written JavaScript source
  files MUST NOT be added; JavaScript exists only as compiler output.
- All styles MUST be written in SCSS. Hand-written CSS source files MUST NOT be added; CSS
  exists only as compiler output.
- The TypeScript and SCSS compilers are development-only dependencies and MUST NOT add
  runtime code to the shipped artifact beyond the compiled output (Principles I and II).
- The plugin MUST use only officially documented Jira extension points and APIs.
- The plugin MUST request the smallest set of Jira permissions that its features need.
- User settings (theme and every other preference) MUST be stored in the user's browser, one
  set per browser. They MUST NOT be stored per account, in Jira, or on any server. A browser
  with no stored settings MUST start with the defaults.
- User and Jira data MUST NOT be sent to any third party.
- The build MUST be reproducible from a clean checkout with one documented command and MUST
  produce the installable artifact directly.

## Development Workflow and Quality Gates

Every change MUST pass these gates before merge:

1. Tests: full suite passes (Principle V).
2. Size: artifact size check passes (Principle I).
3. Dependencies: any new dependency carries its written justification (Principle II).
4. Interface: changed screens verified at a mobile and a desktop viewport, in light and dark
   themes (Principles III and IV).
5. Install: before each release, the app is installed on a clean Jira Cloud site and
   confirmed working with no further steps (Principle VI).

Each feature plan MUST include a Constitution Check that states how the feature satisfies each
principle. A deviation MUST be recorded in the plan with its justification and the simpler
alternative that was rejected.

## Governance

This constitution supersedes other project practices and conventions where they conflict.

- Amendment procedure: an amendment is proposed as a change to this file, states the reason
  and the effect on existing features, and takes effect when approved by the project owner.
- Versioning policy: the constitution uses semantic versioning. MAJOR for removing or
  redefining a principle in a backward-incompatible way; MINOR for adding a principle or
  section or materially expanding guidance; PATCH for clarifications and wording fixes.
- Compliance review: every change is reviewed against the principles and quality gates above.
  A change that violates a principle without a recorded justification MUST NOT be merged.
- Numeric budgets in this document (size, viewport range, touch target size) are changed
  only through the amendment procedure.

**Version**: 2.1.0 | **Ratified**: 2026-11-12 | **Last Amended**: 2026-11-12
