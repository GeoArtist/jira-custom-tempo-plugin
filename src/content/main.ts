// Content script: runs on Jira Cloud pages and draws the add-on on top of them.
// Everything lives in a shadow root, so Jira's styles and the add-on's styles cannot
// affect each other.
import { createGateway } from '../jira/session-gateway';
import css from '../styles/app.scss?inline';
import { mountApp } from '../ui/app';

const HOST_ID = 'jira-custom-tempo';

function adoptStyles(shadow: ShadowRoot, text: string): void {
  try {
    // Preferred: a constructed stylesheet is not an inline <style>, so the page's content
    // security policy does not apply to it.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    shadow.adoptedStyleSheets = [sheet];
  } catch {
    const style = document.createElement('style');
    style.textContent = text;
    shadow.appendChild(style);
  }
}

// Jira is a single-page app: the script runs once per page load and stays.
if (!document.getElementById(HOST_ID)) {
  const host = document.createElement('div');
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });
  adoptStyles(shadow, css);
  document.documentElement.appendChild(host);
  void mountApp(shadow, createGateway());
}
