// View state, loading, and auto-refresh for the panel (data-model.md, "View state").
import type { Person } from '../domain/person';
import { contains, matchPreset, presetPeriod, shift, type Period, type PresetName } from '../domain/period';
import { summarise, type PeriodSummary } from '../domain/summary';
import { filterRows, type TicketRow } from '../domain/worklog';
import type { JiraGateway, Session } from '../jira/gateway';
import { AbortedError } from '../jira/request-pool';
import { loadPeriod } from '../jira/worklog-loader';
import type { Header } from './header';
import type { PeriodBar } from './period-bar';
import type { Progress } from './progress';
import type { Table } from './table';

export type ViewState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/** How many views the user can go back through (FR-082). */
export const MAX_BACK_STEPS = 10;

/** A period the user was on, with the rows it showed last; null when it never loaded. */
interface View {
  period: Period;
  rows: TicketRow[] | null;
}

/** The same dates and times; the name of the preset does not count. */
export const samePeriod = (a: Period, b: Period): boolean =>
  JSON.stringify([a.from, a.to]) === JSON.stringify([b.from, b.to]);

/** The timer functions the controller needs; injectable for tests. */
export interface Timers {
  setTimeout(handler: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface ControllerOptions {
  gateway: JiraGateway;
  session: Session;
  /** Whose time is shown; the signed-in user when left out (002 FR-001). */
  person?: Person;
  header: Header;
  table: Table;
  progress: Progress;
  periodBar: PeriodBar;
  /** Auto-refresh interval in minutes; 0 turns it off (FR-032). */
  refreshMinutes: number;
  now?: () => number;
  timers?: Timers;
  /** The document whose visibility pauses auto-refresh. */
  doc?: Pick<Document, 'hidden' | 'addEventListener'>;
  /** Called after every successful load with the period and its totals. */
  onLoaded?(period: Period, summary: PeriodSummary): void;
  /** Called when a load of the period failed. */
  onFailed?(period: Period): void;
}

const browserTimers: Timers = {
  setTimeout: (handler, ms) => globalThis.setTimeout(handler, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class Controller {
  state: ViewState = 'idle';
  period: Period;

  private readonly options: ControllerOptions;
  private readonly now: () => number;
  private readonly timers: Timers;
  private readonly doc: Pick<Document, 'hidden' | 'addEventListener'>;

  /** The person every load is for (002 FR-038). */
  private person: Person;
  private rows: TicketRow[] = [];
  /** What Jira returned last, and for which period: the parts of it need no new request. */
  private loaded: { period: Period; rows: TicketRow[] } | null = null;
  /** The views the user went through, oldest first; `history[position]` is on screen. */
  private history: View[];
  private position = 0;
  private refreshMinutes: number;
  /** Identifies the newest load; results of older loads are ignored. */
  private loadId = 0;
  private abort: AbortController | null = null;
  private timer: unknown = null;
  /** An auto-refresh came due while the tab was hidden. */
  private missedTick = false;
  /** False while the panel is closed: nothing is refreshed in the background. */
  private active = true;

  constructor(options: ControllerOptions) {
    this.options = options;
    this.now = options.now ?? Date.now;
    this.timers = options.timers ?? browserTimers;
    this.doc = options.doc ?? document;
    this.refreshMinutes = options.refreshMinutes;
    this.person = options.person ?? {
      accountId: options.session.accountId,
      displayName: options.session.displayName,
    };
    this.period = presetPeriod('today', options.session.timeZone, this.now());
    this.history = [{ period: this.period, rows: null }];
    this.showHistory();
    this.doc.addEventListener('visibilitychange', () => this.onVisibilityChange());
  }

  /** Shows today and loads it, with nothing to go back to (FR-021, FR-028, FR-082). */
  start(): Promise<void> {
    this.period = presetPeriod('today', this.options.session.timeZone, this.now());
    this.history = [{ period: this.period, rows: null }];
    this.position = 0;
    this.showHistory();
    return this.load(false);
  }

  /**
   * Another person from now on. Everything held for the previous one goes at once and
   * nothing is loaded: the rows on screen, the last load, and the views of back and
   * forward. Rows of one person never stand under the name of another (002 FR-003,
   * FR-004). The period, the sort order, and the zoom of the chart stay (002 FR-037).
   */
  reset(person: Person): void {
    const { header, table, progress, periodBar, session } = this.options;
    this.abort?.abort();
    this.abort = null;
    this.loadId += 1;
    this.cancelTimer();
    this.person = person;
    this.rows = [];
    this.loaded = null;
    this.history = [{ period: this.period, rows: null }];
    this.position = 0;
    this.state = 'idle';
    this.showHistory();
    header.setBusy(false);
    // The total is not known yet; the bar or the chart is drawn without any time.
    header.update(this.period, null);
    progress.update(summarise([], this.period), this.period, [], session.timeZone);
    periodBar.update(this.period);
    table.clear();
  }

  /** Shows the period on screen for another person (002 FR-003). */
  setPerson(person: Person): Promise<void> {
    this.reset(person);
    return this.load(false);
  }

  /** The view before the current one (FR-082). */
  back(): Promise<void> {
    return this.go(-1);
  }

  /** The view the user went back from (FR-082). */
  forward(): Promise<void> {
    return this.go(1);
  }

  /**
   * The current day, week, month, or year. Chosen while it is already on screen it is
   * loaded again; otherwise it is taken from the last load when it lies inside it (FR-085).
   */
  selectPreset(preset: PresetName): Promise<void> {
    const period = presetPeriod(preset, this.options.session.timeZone, this.now());
    return samePeriod(period, this.period) ? this.showPeriod(period) : this.selectPart(period);
  }

  shiftPeriod(direction: -1 | 1): Promise<void> {
    return this.showPeriod(shift(this.period, direction, this.options.session.timeZone, this.now()));
  }

  selectCustom(period: Period): Promise<void> {
    const preset = matchPreset(period, this.options.session.timeZone, this.now());
    return this.showPeriod({ ...period, preset });
  }

  /**
   * A bar of the chart was chosen (or a preset): its part of the period. It lies inside the period that
   * was loaded last, so its rows are picked from that load and Jira is not asked (FR-080,
   * FR-081). Without such a load the period is loaded like any other.
   */
  selectPart(period: Period): Promise<void> {
    const { session } = this.options;
    const part = { ...period, preset: matchPreset(period, session.timeZone, this.now()) };
    const loaded = this.loaded;
    if (!loaded || !contains(loaded.period, part)) return this.showPeriod(part);

    this.enter(part, true);
    this.present(filterRows(loaded.rows, part, session.timeZone));
    return Promise.resolve();
  }

  /** Shows rows that are already here as the current period, without asking Jira. */
  private present(rows: TicketRow[]): void {
    // A load still on its way belongs to the period the user has just left.
    this.abort?.abort();
    this.abort = null;
    this.loadId += 1;
    this.rows = rows;
    this.view().rows = rows;
    this.state = rows.length > 0 ? 'ready' : 'empty';
    this.options.header.setBusy(false);
    this.render();
    this.options.onLoaded?.(this.period, summarise(rows, this.period));
    this.schedule();
  }

  private view(): View {
    return this.history[this.position] as View;
  }

  private showHistory(): void {
    this.options.header.setHistory(this.position > 0, this.position < this.history.length - 1);
    this.showReset();
  }

  /**
   * Whether the view differs from the one a newly loaded page starts on: another period,
   * another person, or a step to go back or forward to (004 FR-015). The dates are compared,
   * not the name of the preset: after midnight a period is still called today and is not.
   */
  private canReset(): boolean {
    const { session } = this.options;
    const today = presetPeriod('today', session.timeZone, this.now());
    return !samePeriod(this.period, today) || this.person.accountId !== session.accountId || this.history.length > 1;
  }

  private showReset(): void {
    this.options.header.setResettable(this.canReset());
  }

  /**
   * Makes `period` the current one. A step of the user to another period is remembered:
   * the views after the current one are dropped, and only the newest steps are kept.
   */
  private enter(period: Period, remember: boolean): void {
    if (remember && !samePeriod(period, this.period)) {
      this.history.length = this.position + 1;
      this.history.push({ period, rows: null });
      if (this.history.length > MAX_BACK_STEPS + 1) this.history.shift();
      this.position = this.history.length - 1;
    } else {
      // The same view: reloaded, or a preset that followed the calendar to another day.
      const view = this.view();
      if (!samePeriod(period, view.period)) view.rows = null;
      view.period = period;
    }
    this.period = period;
    this.showHistory();
  }

  /** Moves through the remembered views. One that was loaded is shown as it was (FR-083). */
  private go(step: -1 | 1): Promise<void> {
    const view = this.history[this.position + step];
    if (!view) return Promise.resolve();
    this.position += step;
    const { timeZone } = this.options.session;
    // A range that was "this week" when it was shown may not be now.
    view.period = { ...view.period, preset: matchPreset(view.period, timeZone, this.now()) };
    this.period = view.period;
    this.showHistory();
    if (!view.rows) return this.load(false);
    this.loaded = { period: view.period, rows: view.rows };
    this.present(view.rows);
    return Promise.resolve();
  }

  /** Reloads the current period, keeping the data on screen until new data arrives (FR-029, FR-034). */
  refresh(): Promise<void> {
    return this.load(true);
  }

  setRefreshMinutes(minutes: number): void {
    this.refreshMinutes = minutes;
    this.schedule();
  }

  /** The panel was opened (true) or closed (false). A closed panel does not refresh itself. */
  setActive(active: boolean): void {
    this.active = active;
    if (active) return;
    this.missedTick = false;
    this.cancelTimer();
  }

  /**
   * The panel is shown again after being minimised: the period stays (FR-064). A preset
   * follows the calendar; the data is reloaded with the old rows on screen.
   */
  resume(): Promise<void> {
    return this.autoRefresh();
  }

  /** A different period. The old rows stay on screen under the spinner until it has loaded. */
  private showPeriod(period: Period, remember = true): Promise<void> {
    this.enter(period, remember);
    return this.load(false);
  }

  /** Draws the loaded rows of the current period everywhere. */
  private render(): void {
    const { header, table, progress, periodBar, session } = this.options;
    const summary = summarise(this.rows, this.period);
    header.update(this.period, summary);
    progress.update(summary, this.period, this.rows, session.timeZone);
    periodBar.update(this.period);
    // After an error the table shows the message; see load().
    if (this.state === 'ready' || this.state === 'empty') {
      table.render(this.rows, this.period, session.timeZone, summary);
    }
  }

  private async load(keepRows: boolean): Promise<void> {
    const { gateway, session, header, table, periodBar } = this.options;
    this.abort?.abort();
    const abort = new AbortController();
    this.abort = abort;
    const id = (this.loadId += 1);
    const period = this.period;
    const view = this.view();

    this.cancelTimer();
    this.state = 'loading';
    // The calendar may have moved on since the view last changed (004 FR-015).
    this.showReset();
    header.setBusy(true);
    periodBar.update(period);
    // The rows on screen belong to another period: name the new one, its total is not known yet.
    if (!keepRows) header.update(period, null);
    table.showLoading();

    try {
      const rows = await loadPeriod(gateway, session, period, {
        signal: abort.signal,
        authorId: this.person.accountId,
      });
      if (id !== this.loadId) return;
      this.rows = rows;
      view.rows = rows;
      this.loaded = { period, rows };
      this.state = rows.length > 0 ? 'ready' : 'empty';
      this.render();
      this.options.onLoaded?.(period, summarise(rows, period));
    } catch (error) {
      if (id !== this.loadId || error instanceof AbortedError) return;
      this.state = 'error';
      if (!keepRows) {
        // Nothing of this period was loaded: the rows of the previous one must not pass for it.
        this.rows = [];
        this.render();
      }
      // After a refresh the last loaded data stays visible; the user can retry (FR-037).
      table.showError(() => void this.refresh(), keepRows);
      this.options.onFailed?.(period);
    } finally {
      if (id === this.loadId) {
        header.setBusy(false);
        this.schedule();
      }
    }
  }

  private cancelTimer(): void {
    if (this.timer !== null) this.timers.clearTimeout(this.timer);
    this.timer = null;
  }

  /** Restarts the auto-refresh timer; it does not exist when the interval is 0. */
  private schedule(): void {
    this.cancelTimer();
    if (!this.active || this.refreshMinutes <= 0) return;
    this.timer = this.timers.setTimeout(() => this.onTick(), this.refreshMinutes * 60_000);
  }

  private onTick(): void {
    this.timer = null;
    if (this.doc.hidden) {
      // Nobody is looking: skip the request and catch up when the tab is shown again.
      this.missedTick = true;
      return;
    }
    void this.autoRefresh();
  }

  private onVisibilityChange(): void {
    if (this.doc.hidden || !this.missedTick || !this.active) return;
    this.missedTick = false;
    void this.autoRefresh();
  }

  private autoRefresh(): Promise<void> {
    const { preset } = this.period;
    if (preset !== 'custom') {
      // A preset is relative to the current day: follow the calendar when the date has changed.
      const current = presetPeriod(preset, this.options.session.timeZone, this.now());
      const moved =
        JSON.stringify(current.from) !== JSON.stringify(this.period.from) ||
        JSON.stringify(current.to) !== JSON.stringify(this.period.to);
      if (moved) return this.showPeriod(current, false);
    }
    return this.refresh();
  }
}
