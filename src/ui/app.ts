// Composes the whole add-on on a Jira page: the launcher and the panel it opens.
import { presetPeriod } from '../domain/period';
import {
  browserStorage,
  readSettings,
  writeSettings,
  type LauncherPosition,
  type SettingsStorage,
  type UserSettings,
} from '../domain/settings';
import { summarise } from '../domain/summary';
import type { JiraGateway, Session } from '../jira/gateway';
import { loadPeriod } from '../jira/worklog-loader';
import { Controller, type Timers } from './controller';
import { el } from './dom';
import { createHeader } from './header';
import { clampLauncher, createLauncher } from './launcher';
import { createPeriodBar } from './period-bar';
import { createProgress } from './progress';
import { createResizeHandles } from './resize';
import { createSettingsPopover } from './settings-popover';
import { createTable } from './table';
import { applyTheme } from './theme';

export interface AppDeps {
  storage?: SettingsStorage | null;
  now?: () => number;
  timers?: Timers;
  /** The document whose visibility pauses background refreshes. */
  doc?: Pick<Document, 'hidden' | 'addEventListener'>;
}

export interface App {
  /** The root element of everything the add-on draws. It carries the theme. */
  root: HTMLElement;
  controller: Controller;
  isOpen(): boolean;
  /** Shows the panel: on the current day after a close, on the kept period after a minimise. */
  open(): Promise<void>;
  /** Hides the panel and forgets the selected period: the next open starts on today. */
  close(): void;
  /** Hides the panel and keeps the selected period for the next open (FR-064). */
  minimise(): void;
}

const browserTimers: Timers = {
  setTimeout: (handler, ms) => globalThis.setTimeout(handler, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Builds the launcher and the panel inside `container` and loads today's total.
 * Resolves with null, drawing nothing, when nobody is signed in to Jira on this page.
 */
export async function mountApp(
  container: HTMLElement | ShadowRoot,
  gateway: JiraGateway,
  deps: AppDeps = {},
): Promise<App | null> {
  const storage = deps.storage === undefined ? browserStorage() : deps.storage;
  const now = deps.now ?? Date.now;
  const timers = deps.timers ?? browserTimers;
  const doc = deps.doc ?? document;

  let session: Session;
  try {
    session = await gateway.getSession();
  } catch {
    // A login page, or a page of another Atlassian product: stay out of the way.
    return null;
  }

  let settings: UserSettings = readSettings(storage);
  const root = el('div', { class: 'wt-root' });
  applyTheme(settings.theme, root);

  // The components and the controller refer to each other; the controller is created last.
  const refs: { controller: Controller | null } = { controller: null };
  const controller = (): Controller => refs.controller as Controller;

  const header = createHeader({
    onBack: () => void controller().back(),
    onForward: () => void controller().forward(),
    onRefresh: () => void controller().refresh(),
    onSettings: () => popover.toggle(),
    onClose: () => close(),
  });
  const popover = createSettingsPopover({
    anchor: header.settingsButton,
    scope: root,
    themeTarget: root,
    getSettings: () => settings,
    onSave: (next) => {
      // The size and the launcher's place are not edited in the pop-over: keep the newest.
      settings = { ...settings, refreshMinutes: next.refreshMinutes, theme: next.theme };
      applyTheme(next.theme, root);
      controller().setRefreshMinutes(next.refreshMinutes);
      scheduleLauncher();
      return writeSettings(storage, settings);
    },
  });
  const periodBar = createPeriodBar({
    onPreset: (preset) => void controller().selectPreset(preset),
    onShift: (direction) => void controller().shiftPeriod(direction),
    onCustom: (period) => void controller().selectCustom(period),
  });
  const progress = createProgress({ onSelect: (period) => void controller().selectPart(period) });
  const table = createTable();

  const panel = el(
    'section',
    { class: 'wt-panel', attrs: { role: 'dialog', 'aria-label': 'Jira Custom Tempo', hidden: true } },
    [header.element, popover.element, periodBar.element, progress.element, table.element],
  );
  const launcher = createLauncher({
    onToggle: () => (isOpen() ? minimise() : void open()),
    onMove: (position, done) => {
      placeLauncher(position);
      // The panel follows at once: it may have to change its side of the launcher.
      if (isOpen()) resize.sync();
      if (!done) return;
      settings = { ...settings, launcher: position };
      writeSettings(storage, settings);
    },
  });
  // The user drags the free edges to choose the size; it is remembered like the settings.
  const resize = createResizeHandles({
    panel,
    anchor: launcher.element,
    size: { height: settings.panelHeight, width: settings.panelWidth },
    onChange: (size) => {
      settings = {
        ...settings,
        panelHeight: size.height === undefined ? settings.panelHeight : size.height,
        panelWidth: size.width === undefined ? settings.panelWidth : size.width,
      };
      writeSettings(storage, settings);
    },
  });
  panel.prepend(...resize.elements);

  /** The stylesheet reads the launcher's place from these two properties on the root. */
  function placeLauncher(position: LauncherPosition): void {
    root.style.setProperty('--wt-launcher-right', `${position.right}px`);
    root.style.setProperty('--wt-launcher-bottom', `${position.bottom}px`);
  }
  if (settings.launcher) placeLauncher(settings.launcher);

  // The launcher comes first: the panel is positioned against it, and an anchor has to
  // precede the element that hangs on it.
  root.append(launcher.element, panel);

  // Jira has single-key shortcuts ("c" creates a work item). Keys typed into the add-on's
  // fields must not reach them.
  for (const type of ['keydown', 'keyup', 'keypress'] as const) {
    root.addEventListener(type, (event) => event.stopPropagation());
  }
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen() && !popover.isOpen()) minimise();
  });

  refs.controller = new Controller({
    gateway,
    session,
    header,
    table,
    progress,
    periodBar,
    refreshMinutes: settings.refreshMinutes,
    now,
    timers,
    doc,
    // The launcher shows the period the panel is on, from the panel's own loads (FR-040).
    onLoaded: (period, summary) => launcher.show(summary, period),
    onFailed: (period) => launcher.showError(period),
  });
  controller().setActive(false);

  function isOpen(): boolean {
    return !panel.hidden;
  }

  // Only the close button forgets the period; the launcher and Escape minimise (FR-064).
  let startOnToday = true;

  async function open(): Promise<void> {
    panel.hidden = false;
    launcher.setExpanded(true);
    controller().setActive(true);
    resize.sync();
    header.focus();
    if (startOnToday) {
      startOnToday = false;
      await controller().start();
    } else {
      await controller().resume();
    }
  }

  function minimise(): void {
    if (!isOpen()) return;
    popover.cancel();
    panel.hidden = true;
    launcher.setExpanded(false);
    controller().setActive(false);
    launcher.element.focus();
  }

  function close(): void {
    if (!isOpen()) return;
    const wasToday = controller().period.preset === 'today';
    minimise();
    startOnToday = true;
    // The launcher goes back to today with the panel's period forgotten.
    if (!wasToday) void loadToday();
  }

  // ------------------------------------------------- the total on the launcher

  let launcherTimer: unknown = null;
  let missedTick = false;

  function scheduleLauncher(): void {
    if (launcherTimer !== null) timers.clearTimeout(launcherTimer);
    launcherTimer = null;
    // The launcher shares the panel's interval; 0 means no automatic refresh (FR-032).
    if (settings.refreshMinutes <= 0) return;
    launcherTimer = timers.setTimeout(() => {
      launcherTimer = null;
      void tickLauncher();
    }, settings.refreshMinutes * 60_000);
  }

  async function loadToday(): Promise<void> {
    // Always "today" as of now, so the launcher follows the calendar.
    const period = presetPeriod('today', session.timeZone, now());
    try {
      const summary = summarise(await loadPeriod(gateway, session, period), period);
      // The user may have opened the panel meanwhile: its period wins.
      if (startOnToday) launcher.show(summary, period);
    } catch {
      if (startOnToday) launcher.showError(period);
    }
    scheduleLauncher();
  }

  async function tickLauncher(): Promise<void> {
    if (doc.hidden) {
      // Nobody is looking: skip the request and catch up when the tab is shown again.
      missedTick = true;
      return;
    }
    if (isOpen()) {
      // The open panel refreshes its data itself and passes the total on.
      scheduleLauncher();
      return;
    }
    if (!startOnToday) {
      // Minimised on a period the user selected: the launcher keeps following that period.
      await controller().resume();
      scheduleLauncher();
      return;
    }
    await loadToday();
  }

  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden || !missedTick) return;
    missedTick = false;
    void tickLauncher();
  });

  container.appendChild(root);

  // A smaller window must not leave a moved launcher outside it.
  function keepLauncherInside(): void {
    if (settings.launcher) placeLauncher(clampLauncher(settings.launcher, launcher.element));
    if (isOpen()) resize.sync();
  }
  keepLauncherInside();
  globalThis.addEventListener?.('resize', keepLauncherInside);
  await loadToday();

  return { root, controller: controller(), isOpen, open, close, minimise };
}
