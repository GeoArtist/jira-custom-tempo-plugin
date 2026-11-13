// Hands a finished file to the browser as a download (specs/003-table-export/research.md,
// R7). No extension permission and no extension API is needed: a link to the file in
// memory, with the name of the file, is clicked and removed again. The link lives inside
// the add-on's own element, so nothing else on the Jira page is touched.
import type { ReportFile } from './index';

/** The browser has started the download long before this; then the memory is given back. */
const RELEASE_AFTER_MS = 10_000;

/** Throws when the file cannot be handed over; nothing is left behind then. */
export function saveFile(file: ReportFile, host: Node): void {
  const blob = new Blob([file.data as BlobPart], { type: file.mime });
  const address = URL.createObjectURL(blob);
  const link = (host.ownerDocument ?? document).createElement('a');
  link.href = address;
  link.download = file.name;
  link.hidden = true;
  try {
    host.appendChild(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(address), RELEASE_AFTER_MS);
  }
}
