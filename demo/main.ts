// The demo page loads the same content script that the extension injects into Jira.
// In demo builds the Jira session is replaced by a fake (see vite.config.ts).
import '../src/content/main';

// Counts the keys that reach the page, so tests can prove that typing in the add-on does
// not trigger Jira's keyboard shortcuts.
declare global {
  interface Window {
    __pageKeys: string[];
  }
}
window.__pageKeys = [];
document.addEventListener('keydown', (event) => window.__pageKeys.push(event.key));
