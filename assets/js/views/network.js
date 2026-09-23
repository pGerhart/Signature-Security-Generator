import { relationsData, defs } from '../data.js';
import {
  idOf, parseId, label, flatLabel, neighbours, cover, separationSuppressed,
  wrapperLift, isAsymmetry, AXIS_TITLE
} from '../notions.js';
import { showTooltip, moveTooltip, hideTooltip } from '../tooltip.js';

const R = relationsData;
const MAX_FIT_ZOOM = 1.05;

const MIN_FIT_ZOOM = 0.62;
const MIN_FIT_ZOOM_NARROW = 0.8;
const NARROW_STAGE = 520;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const readTokens = () => {
  const cs = getComputedStyle(document.documentElement);
  const v = (name) => cs.getPropertyValue(name).trim();
  return {
    ink: v('--ink'),
    ink2: v('--ink-2'),
    surface: v('--surface'),
    surface2: v('--surface-2'),
    line: v('--line-2'),
    accent: v('--accent'),
    accentWash: v('--accent-wash'),
    accentInk: v('--accent-ink'),
    impl: v('--edge-impl'),
    sep: v('--edge-sep'),
    wrap: v('--edge-wrap')
  };
};

const theorem = (id) => R.theorems.find((t) => t.id === id) || { statement: '', note: '' };
const withNote = (t) => [t.statement, t.note].filter(Boolean).join(' ');

export function nodeTip(n) {
  const goal = defs.extendedGoals[n.goal];
  const parts = [
    `${flatLabel(n)}.`,
    `${AXIS_TITLE.goal}: ${goal.label}.`,
    `${AXIS_TITLE.message}: ${R.nodes[n.message].label}.`,
    `${AXIS_TITLE.randomness}: ${R.nodes[n.randomness].label}.`,
    `${AXIS_TITLE.exposure}: ${R.nodes[n.exposure].label}.`,
    goal.definition
  ];
  return parts.join(' ');
}

function chainEdgeText(c, kind) {
  const e = R.edges.find((x) => x.from === c.strong[c.axis] && x.to === c.weak[c.axis]);
  return e ? e[kind] : '';
}

function buildElements(centreId, open, visited) {
  const present = new Map();
  const add = (n) => present.set(idOf(n), n);
  open.forEach((id) => {
    const n = parseId(id);
    add(n);
    neighbours(n).forEach(add);
  });

  const nodes = [...present.entries()].map(([id, n]) => ({
    data: { id, label: label(n), tip: nodeTip(n) },
    classes: [
      id === centreId ? 'is-centre' : '',
      visited.includes(id) && id !== centreId ? 'is-visited' : ''
    ].filter(Boolean).join(' ')
  }));

  const edges = [];
  const ids = [...present.keys()];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = present.get(ids[i]);
      const b = present.get(ids[j]);

      const c = cover(a, b);
      if (c) {
        const s = idOf(c.strong);
        const w = idOf(c.weak);
        const sep = !separationSuppressed(c);
        const impl = chainEdgeText(c, 'impl');
        edges.push({
          data: {
            id: `i:${s}>${w}`,
            source: s,
            target: w,
            tip: sep ? `${impl} ${chainEdgeText(c, 'sep')}` : impl
          },
          classes: sep ? 'impl has-sep' : 'impl'
        });
      }

      const forward = wrapperLift(a, b);
      const backward = wrapperLift(b, a);
      if (forward || backward) {
        const src = forward ? ids[i] : ids[j];
        const dst = forward ? ids[j] : ids[i];
        edges.push({
          data: { id: `w:${src}>${dst}`, source: src, target: dst, label: forward || backward, tip: withNote(theorem('thm:wrappers-closure')) },
          classes: 'wrap'
        });
      }

      if (isAsymmetry(a, b) || isAsymmetry(b, a)) {
        const src = isAsymmetry(a, b) ? ids[i] : ids[j];
        const dst = isAsymmetry(a, b) ? ids[j] : ids[i];
        edges.push({
          data: { id: `a:${src}>${dst}`, source: src, target: dst, tip: withNote(theorem('prop:asymmetry')) },
          classes: 'sep is-named'
        });
      }
    }
  }
  return [...nodes, ...edges];
}

function buildStyle() {
  const c = readTokens();
  return [
    {
      selector: 'node',
      style: {
        'background-color': c.surface,
        'background-opacity': 1,
        'border-width': 1,
        'border-color': c.line,
        shape: 'round-rectangle',
        'corner-radius': 12,
        label: 'data(label)',
        color: c.ink,
        'font-family': 'Inter, system-ui, sans-serif',
        'font-size': 14.5,
        'font-weight': 600,
        'text-wrap': 'wrap',
        'text-max-width': 158,
        'text-valign': 'center',
        'text-halign': 'center',
        'line-height': 1.45,
        width: 182,
        height: 66,
        'z-index': 10,
        'transition-property': 'background-color, border-color, opacity, border-width',
        'transition-duration': '140ms'
      }
    },
    { selector: 'node.is-visited', style: { 'border-color': c.line, 'border-width': 1.6 } },
    {
      selector: 'node.is-centre',
      style: {
        'background-color': c.accentWash,
        'border-color': c.accent,
        'border-width': 2,
        color: c.accentInk,
        'font-weight': 700,
        'z-index': 20
      }
    },
    {
      selector: 'edge',
      style: {
        width: 2.2,
        'line-color': c.impl,
        'curve-style': 'bezier',
        'control-point-step-size': 46,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': c.impl,
        'arrow-scale': 1.15,
        'target-distance-from-node': 4,
        'source-distance-from-node': 2,
        'overlay-padding': '12px',
        'overlay-opacity': 0,
        'z-index': 1,
        'transition-property': 'opacity',
        'transition-duration': '140ms'
      }
    },
    { selector: 'edge.impl', style: { 'line-color': c.impl, 'target-arrow-color': c.impl } },
    {
      selector: 'edge.has-sep',
      style: {
        'source-arrow-shape': 'triangle-cross',
        'source-arrow-color': c.sep,
        'source-arrow-fill': 'filled',
        'source-distance-from-node': 5
      }
    },
    {
      selector: 'edge.sep',
      style: {
        'line-color': c.sep,
        'target-arrow-color': c.sep,
        'line-style': 'dashed',
        'line-dash-pattern': [7, 5],
        'target-arrow-shape': 'triangle-cross'
      }
    },
    { selector: 'edge.is-named', style: { 'line-dash-pattern': [11, 6] } },
    {
      selector: 'edge.wrap',
      style: {
        'line-color': c.wrap,
        'target-arrow-color': c.wrap,
        'line-style': 'dotted',
        label: 'data(label)',
        color: c.wrap,
        'font-size': 12,
        'font-weight': 700,
        'control-point-step-size': 92,
        'text-background-color': c.surface,
        'text-background-opacity': 1,
        'text-background-padding': 7,
        'text-background-shape': 'roundrectangle',

        'text-margin-y': -16,
        'z-index': 15
      }
    },
    { selector: '.faded', style: { opacity: 0.6 } },
    { selector: 'node.hot', style: { 'border-color': c.accent, 'border-width': 3.5, 'background-color': c.surface2 } },
    {
      selector: 'edge.hot',
      style: { 'overlay-opacity': 0.14, 'overlay-color': c.accent, 'overlay-padding': 6, 'z-index': 30 }
    }
  ];
}

function hopMap(cy, centreId) {
  const hops = {};
  cy.nodes().forEach((n) => { hops[n.id()] = 99; });
  hops[centreId] = 0;
  let frontier = [centreId];
  let d = 0;
  while (frontier.length && d < 6) {
    d += 1;
    const next = [];
    frontier.forEach((id) => {
      cy.$id(id).neighborhood('node').forEach((n) => {
        if (hops[n.id()] > d) { hops[n.id()] = d; next.push(n.id()); }
      });
    });
    frontier = next;
  }
  return hops;
}

const LAYOUT = (cy, centreId) => {
  const hops = hopMap(cy, centreId);
  return {
    name: 'concentric',
    concentric: (node) => 10 - (hops[node.id()] || 0),
    levelWidth: () => 1,
    minNodeSpacing: 46,
    spacingFactor: 1,
    avoidOverlap: true,
    equidistant: false,
    startAngle: (3 / 2) * Math.PI,
    animate: !reducedMotion(),
    animationDuration: 360,
    fit: true,
    padding: 30
  };
};

let cy = null;
let host = null;
let lastW = 0;
let lastH = 0;

const EXPANDED_KEPT = 2;
let expanded = [];
let visited = [];
let onSelect = () => {};

function highlight(el) {
  const near = el.isNode()
    ? el.connectedEdges().union(el.connectedEdges().connectedNodes())
    : el.connectedNodes();
  cy.elements().addClass('faded');
  near.removeClass('faded');
  el.removeClass('faded').addClass('hot');
  if (el.isNode()) el.connectedEdges().removeClass('faded').addClass('hot');
}

const clearHighlight = () => cy && cy.elements().removeClass('faded hot');

export const mounted = () => cy !== null;
export const trail = () => visited.slice();

export function mount(container, handlers) {
  if (cy || !window.cytoscape) return;
  host = container;
  onSelect = handlers.onSelect;

  cy = window.cytoscape({
    container,
    elements: [],
    style: buildStyle(),
    minZoom: 0.35,
    maxZoom: 2.5,
    wheelSensitivity: 0.25,
    boxSelectionEnabled: false,
    userPanningEnabled: true,
    userZoomingEnabled: true
  });

  const pointer = (ev) => {
    const box = container.getBoundingClientRect();
    return { x: box.left + ev.renderedPosition.x, y: box.top + ev.renderedPosition.y };
  };

  cy.on('mouseover', 'node, edge', (ev) => {
    highlight(ev.target);
    const p = pointer(ev);
    showTooltip(ev.target.data('tip'), p.x, p.y);
    container.style.cursor = ev.target.isNode() ? 'pointer' : 'help';
  });
  cy.on('mousemove', (ev) => { const p = pointer(ev); moveTooltip(p.x, p.y); });
  const release = () => {
    clearHighlight();
    hideTooltip();
    container.style.cursor = '';
  };
  cy.on('mouseout', 'node, edge', release);
  container.addEventListener('mouseleave', release);
  window.addEventListener('blur', release);
  cy.on('tap', 'node', (ev) => {
    hideTooltip();
    onSelect(parseId(ev.target.id()));
  });
  cy.on('tap', (ev) => { if (ev.target === cy) clearHighlight(); });
}

export function update(notion, refit = false) {
  if (!cy) return;

  const w = host.clientWidth;
  const h = host.clientHeight;
  const resized = w !== lastW || h !== lastH;
  cy.resize();
  lastW = w;
  lastH = h;

  const id = idOf(notion);
  const grew = !expanded.includes(id);
  expanded = expanded.filter((x) => x !== id).concat(id).slice(-EXPANDED_KEPT);
  if (!visited.includes(id)) visited.push(id);

  const next = buildElements(id, expanded, visited);
  const wanted = new Set(next.map((e) => e.data.id));
  const known = new Set(cy.elements().map((e) => e.id()));
  const fresh = known.size === 0;
  const added = next.filter((e) => !known.has(e.data.id));

  cy.batch(() => {
    cy.elements().filter((e) => !wanted.has(e.id())).remove();
    if (added.length) cy.add(added);
    next.forEach((e) => {
      const el = cy.$id(e.data.id);
      if (el.length) el.classes(e.classes || '');
    });
  });

  if (grew || refit || added.length || resized) {
    const run = cy.layout(LAYOUT(cy, id));
    run.one('layoutstop', () => settle(id));
    run.run();
  } else {
    settle(id);
  }
}

function settle(id) {
  if (!cy || cy.nodes().length === 0) return;
  const floor = (host && host.clientWidth < NARROW_STAGE) ? MIN_FIT_ZOOM_NARROW : MIN_FIT_ZOOM;
  cy.fit(undefined, 30);
  const z = cy.zoom();
  if (z > MAX_FIT_ZOOM || z < floor) {
    cy.zoom(Math.min(MAX_FIT_ZOOM, Math.max(floor, z)));
    cy.center(cy.$id(id));
  }
}

export function retheme() {
  if (cy) cy.style(buildStyle());
}

export function zoomBy(factor) {
  if (!cy) return;
  const next = Math.min(2.5, Math.max(0.35, cy.zoom() * factor));
  cy.zoom({ level: next, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
}

export function refit(notion) {
  if (!cy || !host) return;
  const w = host.clientWidth;
  const h = host.clientHeight;
  if (!w || !h) return;
  cy.resize();
  lastW = w;
  lastH = h;
  settle(idOf(notion));
}

export function truncateTo(id) {
  const i = visited.indexOf(id);
  if (i >= 0) visited = visited.slice(0, i + 1);
}

export function reset(notion) {
  expanded = [];
  visited = [];
  if (cy) cy.elements().remove();
  update(notion, true);
}

export function focusHost() {
  if (host) host.focus();
}
