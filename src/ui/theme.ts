// Applies a theme. Both themes are plain token sets selected by one attribute on the
// app's root element (constitution, Principle IV). The Jira page itself is never touched.
import type { Theme } from '../domain/settings';

export function applyTheme(theme: Theme, target: Element = document.documentElement): void {
  target.setAttribute('data-theme', theme);
}
