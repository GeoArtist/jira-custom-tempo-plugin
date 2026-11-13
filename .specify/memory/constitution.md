<!--
SYNC IMPACT REPORT (temporary review material; remove before commit)

Version change: 2.2.0 → 3.0.0
Bump rationale: MAJOR. The delivery form is redefined: the plugin is a standalone browser
extension, no longer a Jira Cloud app hosted by Atlassian (Forge). Principle VI and two
technical constraints change in a way the previous design does not satisfy.
Previous change: 2.1.0 → 2.2.0 (Vite+ is the mandatory toolchain).

Modified principles:
- I. Minimal Footprint: rationale reworded (the plugin is added to every Jira page). Budget
  unchanged.
- VI. Install-Only Setup: installed as a browser extension through the browser's own
  installation; runs entirely in the user's browser; no server, no hosted app platform, no
  credentials of its own.

Modified sections:
- Technical Constraints: the delivery form is a browser extension for Jira Cloud sites; it
  reads Jira only through the documented REST API with the user's existing session, read-only;
  it requests the smallest set of browser permissions; it must not alter the Jira page beyond
  its own isolated element; the Forge CLI is no longer named as a tool.
- Development Workflow and Quality Gates: gate 5 is now "installed into a clean browser
  profile".

Added sections: none
Removed sections: none

Consistency with existing artifacts (all updated on 2026-11-12):
- specs/001-worktime-panel/spec.md: Clarifications, User Story 5, FR-040 to FR-042, FR-049,
  FR-050, Assumptions.
- specs/001-worktime-panel/plan.md, research.md, quickstart.md, data-model.md, contracts/*:
  rewritten or updated for the extension.
- specs/001-worktime-panel/tasks.md: new Phase 10 records the conversion; Forge-only tasks are
  marked superseded.
- The repository complies: `extension/manifest.json` declares no permission; the content
  script sends only same-origin GET requests; no runtime dependency.

Not changed on purpose:
- .specify/templates/*: generic Spec Kit templates; they read this constitution at run time.

Values chosen by the author of earlier drafts, still unconfirmed (confirm or amend):
- Size budget of 100 KB gzipped for first-render compiled output (Principle I). The extension
  is 12 kB; the budget could be lowered.
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

Rationale: the plugin is added to every Jira page the user opens, and those pages are
already heavy. Every added kilobyte is paid on each page load.

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

- The plugin MUST be delivered as one self-contained browser extension, installed through
  the browser's own extension installation (a browser store, a company policy, or loading the
  unpacked folder).
- After installation the plugin MUST be functional with default settings. Manual
  configuration, file edits, database setup, separate service deployment, and command-line
  steps MUST NOT be required.
- The plugin MUST run entirely in the user's browser. It MUST NOT depend on any server,
  hosted app platform, or service operated by the project, by the user, or by a third party;
  the only system it talks to is the Jira site the user has open.
- The plugin MUST NOT ask the user for a password, a token, or a Jira address. It works with
  the Jira session the user already has in the browser.
- Any required initialization or data migration MUST run automatically on install and on
  upgrade.
- Optional settings MAY exist, but every one MUST have a working default.

Rationale: each extra setup step is a point where an installation is abandoned or
misconfigured; the artifact has to carry everything it needs. Installing must not require a
Jira administrator or a developer account.

## Technical Constraints

- The plugin is a standalone browser extension for Jira Cloud sites. It MUST be built and
  packaged as a standard web extension. Jira Data Center and Jira Server are out of scope and
  MUST NOT shape design decisions. It MUST NOT be built as an app hosted on a Jira app
  platform.
- All front-end application code MUST be written in TypeScript. Hand-written JavaScript source
  files MUST NOT be added; JavaScript exists only as compiler output.
- All styles MUST be written in SCSS. Hand-written CSS source files MUST NOT be added; CSS
  exists only as compiler output.
- The TypeScript and SCSS compilers are development-only dependencies and MUST NOT add
  runtime code to the shipped artifact beyond the compiled output (Principles I and II).
- Vite+ (the `vp` command, package `vite-plus`) is the mandatory development toolchain. It
  MUST be used for installing dependencies, the development server, the production build,
  unit and UI tests, linting, formatting, and type checks. Its configuration lives in one
  file, `vite.config.ts`.
- A second tool for a job that Vite+ covers MUST NOT be added: no separate bundler or build
  script, test runner, linter, or formatter. Tools for jobs that Vite+ does not cover (for
  example browser tests) MAY be used and fall under Principle II.
- Every project task MUST be runnable through `vp` (`vp run <task>` or a built-in `vp`
  command), and documentation MUST show the `vp` form.
- The plugin MUST read Jira only through the officially documented Jira Cloud REST API. It
  MUST NOT read data out of the Jira page's own markup or internal scripts.
- The plugin MUST be read-only towards Jira: it MUST NOT send any request that creates,
  changes, or deletes Jira data.
- On the Jira page the plugin MUST keep to one element of its own, isolated from the page's
  styles and scripts, and MUST NOT change anything else on the page.
- The plugin MUST request the smallest set of browser permissions that its features need,
  and MUST declare only the Jira Cloud addresses it runs on.
- User settings (theme and every other preference) MUST be stored in the user's browser, one
  set per browser. They MUST NOT be stored per account, in Jira, or on any server. A browser
  with no stored settings MUST start with the defaults.
- User and Jira data MUST NOT be sent to any third party.
- The build MUST be reproducible from a clean checkout with one documented command,
  `vp run build`, and MUST produce the installable artifact directly.

## Development Workflow and Quality Gates

Every change MUST pass these gates before merge. Gates 1, 2, 4, and 6 run together with one
command, `vp run check`:

1. Tests: full suite passes (Principle V).
2. Size: artifact size check passes (Principle I).
3. Dependencies: any new dependency carries its written justification (Principle II).
4. Interface: changed screens verified at a mobile and a desktop viewport, in light and dark
   themes (Principles III and IV).
5. Install: before each release, the extension is installed into a clean browser profile,
   a Jira Cloud site is opened while signed in, and the plugin is confirmed working with no
   further steps (Principle VI).
6. Code health: formatting, lint, and type checks pass (`vp check`).

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

**Version**: 3.0.0 | **Ratified**: 2026-11-12 | **Last Amended**: 2026-11-12
