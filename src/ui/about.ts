// Which add-on this is and which version of it: the name of the panel, and the small line
// at the bottom left of the panel (004 FR-023).
import { el } from './dom';

/** The name of the add-on. It is the name of a product and is not translated. */
export const APP_NAME = 'Jira Custom Tempo';

/** The name with the version of the build, as one quiet line of text. */
export function createAbout(): HTMLElement {
  return el('p', { class: 'wt-app', text: `${APP_NAME} - ${__APP_VERSION__}` });
}
