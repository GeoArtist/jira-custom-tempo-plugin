# jira-custom-tempo

Browser extension (Manifest V3, content script on `*.atlassian.net`). Install guide: [BrowserInstallation.md](BrowserInstallation.md).

## Browser support policy

Used by the `modern-web-guidance` skill and in code review.

- Targets: current stable Chrome and Edge (also Brave, Opera, Vivaldi) and current stable Firefox (temporary load).
- Baseline **Newly available** features are allowed without a fallback.
- Chromium-only features (not in Baseline) need a fallback that keeps the extension working in Firefox.
