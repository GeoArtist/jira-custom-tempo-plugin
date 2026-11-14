// Small element-building helpers. No framework (constitution, Principle II).
import type { PeriodSummary, ToneMix } from '../domain/summary';

type Child = Node | string | null | undefined | false;

export interface ElementProps {
  class?: string;
  text?: string;
  /** Attributes set with setAttribute; false or undefined leaves the attribute out. */
  attrs?: Record<string, string | boolean | undefined>;
  on?: Partial<{ [K in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[K]) => void }>;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.class) node.className = props.class;
  if (props.text !== undefined) node.textContent = props.text;
  for (const [name, value] of Object.entries(props.attrs ?? {})) {
    if (value === undefined || value === false) continue;
    node.setAttribute(name, value === true ? '' : value);
  }
  for (const [type, handler] of Object.entries(props.on ?? {})) {
    node.addEventListener(type, handler as EventListener);
  }
  append(node, children);
  return node;
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Icon outlines on a 24 × 24 grid, drawn with the current text colour. */
const ICON_PATHS = {
  refresh: ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 4v7h-7'],
  gear: [
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    'M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.5z',
  ],
  // A house, the sign of the start view: a roof, walls, and a door. It has no arrow and no
  // curve, so it cannot be taken for refresh or undo (004 FR-009).
  home: ['M3 11.5 12 4l9 7.5', 'M5.5 9.5V20h13V9.5', 'M10 20v-6h4v6'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  // A line at the foot of the box, as on a window's title bar.
  minimise: ['M6 18h12'],
  undo: ['M9 14L4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  redo: ['M15 14l5-5-5-5', 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  chevronLeft: ['M15 5l-7 7 7 7'],
  chevronRight: ['M9 5l7 7-7 7'],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2v2',
    'M12 20v2',
    'M4.9 4.9l1.4 1.4',
    'M17.7 17.7l1.4 1.4',
    'M2 12h2',
    'M20 12h2',
    'M4.9 19.1l1.4-1.4',
    'M17.7 6.3l1.4-1.4',
  ],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'wt-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const d of ICON_PATHS[name]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

/**
 * Gives a total the colour of the progress bar (FR-018). The stylesheet mixes two theme
 * tokens; only the token names and the mix ratio are set here, through the style object
 * (no inline style attribute is written in markup; research R7).
 */
export function applyToneMix(node: HTMLElement, colour: ToneMix | null): void {
  if (!colour) {
    node.style.removeProperty('--wt-total-from');
    node.style.removeProperty('--wt-total-to');
    node.style.removeProperty('--wt-total-pct');
    node.removeAttribute('data-tone');
    return;
  }
  node.style.setProperty('--wt-total-from', `var(--wt-tone-${colour.from})`);
  node.style.setProperty('--wt-total-to', `var(--wt-tone-${colour.to})`);
  node.style.setProperty('--wt-total-pct', `${Math.round(colour.ratio * 100)}%`);
  node.setAttribute('data-tone', colour.ratio >= 0.5 ? colour.to : colour.from);
}

/**
 * Colours a total: the progress colour for a single day with logged time, the normal text
 * colour for a longer period, and the muted colour when nothing is logged (FR-068). A null
 * summary means the total is not known yet.
 */
export function applyTotal(node: HTMLElement, summary: PeriodSummary | null): void {
  applyToneMix(node, summary?.colour ?? null);
  if (summary && summary.totalSeconds === 0) node.setAttribute('data-zero', '');
  else node.removeAttribute('data-zero');
}
