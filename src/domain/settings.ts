// The user settings, kept in the browser (contracts/settings-storage.md of 001 and 002).
import { isPerson, type Person } from './person';

export type Theme = 'dark' | 'light';

export interface UserSettings {
  /** Whole minutes, 0 to 1440; 0 turns auto-refresh off (FR-032). */
  refreshMinutes: number;
  theme: Theme;
  /** Height of the panel in px, set by dragging its top edge; null = the default (FR-059). */
  panelHeight: number | null;
  /** Width of the panel in px, set by dragging its side edge; null = the default (FR-071). */
  panelWidth: number | null;
  /** Where the user dragged the launcher; null = its default corner (FR-072). */
  launcher: LauncherPosition | null;
  /**
   * The other person saved last. It only fills the name field of the settings in advance;
   * it never decides whose time is shown on start (002 FR-035).
   */
  lastPerson: Person | null;
}

/** The two dimensions of the panel the user can set. */
export interface PanelSize {
  height: number | null;
  width: number | null;
}

/** Distance in px from the window's right and bottom edges to the launcher's own. */
export interface LauncherPosition {
  right: number;
  bottom: number;
}

export const SETTINGS_KEY = 'worktime.settings.v1';
export const MAX_REFRESH_MINUTES = 1440;
/** The lowest panel that still shows one table row; the stylesheet has the same value. */
export const MIN_PANEL_HEIGHT = 592;
/** The lowest height before the header had two rows (004 FR-008). */
const LEGACY_MIN_PANEL_HEIGHT = 440;
export const MAX_PANEL_HEIGHT = 4000;
/** The narrowest panel whose table shows numbers, times, and sums on one line each. */
export const MIN_PANEL_WIDTH = 640;
export const MAX_PANEL_WIDTH = 4000;
const MAX_LAUNCHER_OFFSET = 10_000;
export const DEFAULT_SETTINGS: UserSettings = {
  refreshMinutes: 5,
  theme: 'dark',
  panelHeight: null,
  panelWidth: null,
  launcher: null,
  lastPerson: null,
};

/** The part of the Web Storage API the app uses. */
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isValidInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_REFRESH_MINUTES;
}

export function isValidPanelHeight(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_PANEL_HEIGHT && value <= MAX_PANEL_HEIGHT;
}

export function isValidPanelWidth(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_PANEL_WIDTH && value <= MAX_PANEL_WIDTH;
}

/**
 * A height chosen while the panel could be lower is read as the lowest height of today, so
 * the user keeps a low panel after the update (004 FR-008). Reading stores nothing.
 */
function readPanelHeight(value: unknown): number | null {
  if (isValidPanelHeight(value)) return value;
  const legacy =
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= LEGACY_MIN_PANEL_HEIGHT &&
    value < MIN_PANEL_HEIGHT;
  return legacy ? MIN_PANEL_HEIGHT : DEFAULT_SETTINGS.panelHeight;
}

const isOffset = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_LAUNCHER_OFFSET;

export function isValidLauncherPosition(value: unknown): value is LauncherPosition {
  if (typeof value !== 'object' || value === null) return false;
  const { right, bottom } = value as Record<string, unknown>;
  return isOffset(right) && isOffset(bottom);
}

/** The browser's storage, or null when it is blocked. */
export function browserStorage(): SettingsStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Never throws: anything missing or invalid falls back to its default, field by field. */
export function readSettings(storage: SettingsStorage | null): UserSettings {
  try {
    const stored: unknown = JSON.parse(storage?.getItem(SETTINGS_KEY) ?? 'null');
    if (typeof stored !== 'object' || stored === null) return { ...DEFAULT_SETTINGS };
    const { refreshMinutes, theme, panelHeight, panelWidth, launcher, lastPerson } = stored as Record<string, unknown>;
    return {
      refreshMinutes: isValidInterval(refreshMinutes) ? refreshMinutes : DEFAULT_SETTINGS.refreshMinutes,
      theme: theme === 'dark' || theme === 'light' ? theme : DEFAULT_SETTINGS.theme,
      panelHeight: readPanelHeight(panelHeight),
      panelWidth: isValidPanelWidth(panelWidth) ? panelWidth : DEFAULT_SETTINGS.panelWidth,
      launcher: isValidLauncherPosition(launcher)
        ? { right: launcher.right, bottom: launcher.bottom }
        : DEFAULT_SETTINGS.launcher,
      // Only the two fields: whatever else is stored beside them is left behind.
      lastPerson: isPerson(lastPerson)
        ? { accountId: lastPerson.accountId, displayName: lastPerson.displayName }
        : DEFAULT_SETTINGS.lastPerson,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Returns false when the browser refuses to store the settings. */
export function writeSettings(storage: SettingsStorage | null, settings: UserSettings): boolean {
  try {
    if (!storage) return false;
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** The interval typed by the user as a number, or null when it is not a whole number from 0 to 1440. */
export function validateInterval(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return isValidInterval(value) ? value : null;
}
