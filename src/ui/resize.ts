// The grips on the panel's free edges: the user drags them to choose the panel's height,
// its width, or both at the corner (FR-059, FR-071). The panel hangs on the launcher, so
// the edges that move are the ones away from it.
import {
  MAX_PANEL_HEIGHT,
  MAX_PANEL_WIDTH,
  MIN_PANEL_HEIGHT,
  MIN_PANEL_WIDTH,
  type PanelSize,
} from '../domain/settings';
import { pl } from '../i18n/pl';
import { el } from './dom';

export interface ResizeHandlesOptions {
  /** The element whose size is set, through `--wt-panel-height` and `--wt-panel-width`. */
  panel: HTMLElement;
  /** The element the panel hangs on: its place tells which edges of the panel are free. */
  anchor: HTMLElement;
  /** The saved size in px; null for a default dimension. */
  size: PanelSize;
  /** Called with the dimensions the user has just chosen; null means back to the default. */
  onChange(size: Partial<PanelSize>): void;
}

export interface ResizeHandles {
  elements: HTMLElement[];
  /**
   * Chooses the panel's side of the launcher and puts the grips on the edges that are free
   * there. Call it whenever the launcher, the window, or the panel's size has changed.
   */
  sync(): void;
}

type Axis = 'height' | 'width';
type Kind = 'block' | 'inline' | 'corner';

/** One press of an arrow key. */
const KEY_STEP = 16;
/** The room kept between the panel and the window edge while dragging: the stylesheet's edge. */
const WINDOW_MARGIN = 16;

const LIMITS: Record<Axis, { min: number; max: number; property: string }> = {
  height: { min: MIN_PANEL_HEIGHT, max: MAX_PANEL_HEIGHT, property: '--wt-panel-height' },
  width: { min: MIN_PANEL_WIDTH, max: MAX_PANEL_WIDTH, property: '--wt-panel-width' },
};

const AXES: Record<Kind, readonly Axis[]> = {
  block: ['height'],
  inline: ['width'],
  corner: ['height', 'width'],
};

const LABELS: Record<Kind, string> = { block: pl.resize, inline: pl.resizeWidth, corner: pl.resizeBoth };

export function createResizeHandles(options: ResizeHandlesOptions): ResizeHandles {
  const { panel, anchor } = options;

  /** The size last chosen, for a page that has no layout to measure. */
  const chosen: PanelSize = { ...options.size };

  /** The stylesheet has the last word: it keeps the panel inside the window. */
  function apply(axis: Axis, value: number | null): void {
    if (value === null) panel.style.removeProperty(LIMITS[axis].property);
    else panel.style.setProperty(LIMITS[axis].property, `${value}px`);
  }

  const clamp = (axis: Axis, value: number, room = Infinity): number =>
    Math.round(Math.max(Math.min(value, LIMITS[axis].max, room), LIMITS[axis].min));

  const measure = (axis: Axis): number => panel.getBoundingClientRect()[axis];

  /**
   * Decides on which side of the launcher the panel stands (FR-075), from where the launcher
   * is now. The stylesheet places the panel there with anchor positioning; deciding here,
   * afresh on every call, keeps the panel from staying on a side it took in a window of
   * another size.
   */
  function place(): { block: 'above' | 'below'; inline: 'end' | 'start' | 'pinned' } {
    const box = panel.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) return { block: 'above', inline: 'end' };
    const hook = anchor.getBoundingClientRect();
    const view = panel.ownerDocument.documentElement;
    const style = getComputedStyle(panel);
    const edge = Number.parseFloat(style.getPropertyValue('--wt-edge')) || WINDOW_MARGIN;
    const gap = Number.parseFloat(style.getPropertyValue('--wt-panel-gap')) || 0;

    // The size of the panel does not depend on its side, so it can be measured first.
    const above = hook.top - gap - edge;
    const below = view.clientHeight - hook.bottom - gap - edge;
    const fits = (room: number): boolean => box.height <= room + 0.5;
    const block = fits(above) ? 'above' : fits(below) ? 'below' : above >= below ? 'above' : 'below';

    let inline: 'end' | 'start' | 'pinned' = 'pinned';
    if (hook.right - box.width >= edge - 0.5) inline = 'end';
    else if (hook.left + box.width <= view.clientWidth - edge + 0.5) inline = 'start';
    return { block, inline };
  }

  /** Which edges move: the ones on the far side from the launcher. */
  function freeSides(): { block: 'top' | 'bottom'; inline: 'left' | 'right' } {
    return {
      block: panel.dataset.placeBlock === 'below' ? 'bottom' : 'top',
      inline: panel.dataset.placeInline === 'start' ? 'right' : 'left',
    };
  }

  function sync(): void {
    const placed = place();
    panel.dataset.placeBlock = placed.block;
    panel.dataset.placeInline = placed.inline;
    const free = freeSides();
    panel.dataset.freeBlock = free.block;
    panel.dataset.freeInline = free.inline;
  }

  /** Stores the size the panel really has, which the window may have limited. */
  function commit(axes: readonly Axis[]): void {
    const change: Partial<PanelSize> = {};
    for (const axis of axes) {
      const shown = measure(axis);
      const value = clamp(
        axis,
        shown > 0 ? shown : Number.parseFloat(panel.style.getPropertyValue(LIMITS[axis].property)) || LIMITS[axis].min,
      );
      chosen[axis] = value;
      apply(axis, value);
      change[axis] = value;
    }
    options.onChange(change);
    sync();
  }

  function reset(axes: readonly Axis[]): void {
    const change: Partial<PanelSize> = {};
    for (const axis of axes) {
      chosen[axis] = null;
      apply(axis, null);
      change[axis] = null;
    }
    options.onChange(change);
    sync();
  }

  function handle(kind: Kind): HTMLElement {
    const axes = AXES[kind];
    const attrs: Record<string, string> = { role: 'separator', 'aria-label': LABELS[kind], tabindex: '0' };
    if (kind !== 'corner') attrs['aria-orientation'] = kind === 'block' ? 'horizontal' : 'vertical';
    const element = el('div', { class: `wt-resize wt-resize--${kind}`, attrs }, [
      el('span', { class: 'wt-resize__grip', attrs: { 'aria-hidden': 'true' } }),
    ]);
    element.title = LABELS[kind];

    let drag: {
      pointerId: number;
      x: number;
      y: number;
      start: Record<Axis, number>;
      room: Record<Axis, number>;
      sign: Record<Axis, number>;
    } | null = null;

    element.addEventListener('pointerdown', (event) => {
      sync();
      const box = panel.getBoundingClientRect();
      const free = freeSides();
      const view = panel.ownerDocument.documentElement;
      drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        start: { height: box.height, width: box.width },
        // The panel may grow up to the window edge on its free side, no further: growing
        // past it would make the panel jump to the other side of the launcher.
        room: {
          height: (free.block === 'top' ? box.bottom : view.clientHeight - box.top) - WINDOW_MARGIN,
          width: (free.inline === 'left' ? box.right : view.clientWidth - box.left) - WINDOW_MARGIN,
        },
        sign: { height: free.block === 'top' ? -1 : 1, width: free.inline === 'left' ? -1 : 1 },
      };
      element.setPointerCapture?.(event.pointerId);
      element.classList.add('wt-resize--active');
      event.preventDefault();
    });
    element.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      for (const axis of axes) {
        const moved = axis === 'height' ? event.clientY - drag.y : event.clientX - drag.x;
        const room = drag.room[axis] > 0 ? drag.room[axis] : Infinity;
        apply(axis, clamp(axis, drag.start[axis] + drag.sign[axis] * moved, room));
      }
    });
    const endDrag = (event: PointerEvent): void => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const moved = event.clientY !== drag.y || event.clientX !== drag.x;
      drag = null;
      element.classList.remove('wt-resize--active');
      if (moved) commit(axes);
    };
    element.addEventListener('pointerup', endDrag);
    element.addEventListener('pointercancel', endDrag);
    element.addEventListener('dblclick', () => reset(axes));

    element.addEventListener('keydown', (event) => {
      if (event.key === 'Home') {
        reset(axes);
        event.preventDefault();
        return;
      }
      // An arrow moves the free edge the way it points.
      const free = freeSides();
      const steps: Partial<Record<string, [Axis, number]>> = {
        ArrowUp: ['height', free.block === 'top' ? 1 : -1],
        ArrowDown: ['height', free.block === 'top' ? -1 : 1],
        ArrowLeft: ['width', free.inline === 'left' ? 1 : -1],
        ArrowRight: ['width', free.inline === 'left' ? -1 : 1],
      };
      const step = steps[event.key];
      if (!step || !axes.includes(step[0])) return;
      const [axis, direction] = step;
      const current = measure(axis) || chosen[axis] || LIMITS[axis].min;
      apply(axis, clamp(axis, current + direction * KEY_STEP));
      commit([axis]);
      event.preventDefault();
    });

    return element;
  }

  apply('height', chosen.height);
  apply('width', chosen.width);
  panel.dataset.freeBlock = 'top';
  panel.dataset.freeInline = 'left';

  return { elements: [handle('block'), handle('inline'), handle('corner')], sync };
}
