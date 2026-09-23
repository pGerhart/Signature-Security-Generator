import { defs, figureData, modelsData } from '../data.js';
import { escapeHtml } from '../tex.js';
import { buildDrawing, SANS, MATH } from './modelgrid.js';

const A11Y = figureData.svgLabel;
const L = figureData.labels;
const T = figureData.tooltips;
const TYPE = figureData.type;
const STROKE = figureData.stroke;

const FAMILY = {
  m: 'algo', det: 'algo', s: 'algo',
  sk: 'supply', genR: 'supply', genTsk: 'supply', genTr: 'supply',
  adv: 'attack'
};

const describeLeakage = (state) =>
  (state.extendedUKE ? modelsData.leakage.figureDetailUke : modelsData.leakage.figureDetail);

export function getModelConfig(state) {
  if (state.framework === 'classical') {
    const meta = defs.classicalModels[state.classicalModel];
    return {
      framework: 'classical',
      showClassic: state.classicalModel !== 'koa',
      showRandom: false,
      showLeakage: false,
      showGenTr: false,
      showGenTsk: false,
      classicLabel: `${meta.acronym} · ${meta.label}`,
      classicDetail: meta.figureDetail,
      randomnessLabel: figureData.classical.randomnessLabel,
      randomnessDetail: figureData.classical.randomnessDetail,
      leakageLabel: figureData.classical.leakageLabel,
      leakageDetail: figureData.classical.leakageDetail,
      attackLabel: `${L.messageAttack} (${meta.acronym})`,
      randomnessAttackLabel: '',
      leakageAttackLabel: '',
      compilerItems: []
    };
  }

  const mc = defs.messageChoices[state.messageChoice];
  const rc = defs.randomnessChoices[state.randomnessChoice];
  const showClassic = state.messageChoice !== 'ko';
  const showRandom = state.randomnessChoice !== 'ko';
  const showLeakage = state.leakage || state.extendedUKE;
  const compilerItems = [];
  if (showRandom) compilerItems.push(figureData.compilerItems.genTr);
  if (showLeakage) compilerItems.push(figureData.compilerItems.genTsk);

  return {
    framework: 'extended',
    showClassic,
    showRandom,
    showLeakage,
    showGenTr: showRandom,
    showGenTsk: showLeakage,
    classicLabel: showClassic ? `${mc.acronym} · ${mc.label}` : figureData.extended.noneLabel,
    classicDetail: mc.figureDetail,
    randomnessLabel: showRandom ? `${rc.acronym} · ${rc.label}` : figureData.extended.noneLabel,
    randomnessDetail: showRandom ? rc.figureDetail : figureData.extended.randomnessDetail,
    leakageLabel: showLeakage
      ? (state.extendedUKE ? figureData.extended.leakageLabelUke : figureData.extended.leakageLabel)
      : figureData.extended.noneLabel,
    leakageDetail: showLeakage ? describeLeakage(state) : figureData.extended.leakageDetail,
    attackLabel: `${L.messageAttack} (${mc.acronym})`,
    randomnessAttackLabel: `${L.randomnessAttack} (${rc.acronym})`,
    leakageAttackLabel: state.extendedUKE ? L.keyExposure : L.leakage,
    compilerItems
  };
}

function buildStatusText(cfg, state) {
  const s = figureData.status;
  if (cfg.framework === 'classical') {
    return cfg.showClassic
      ? `${s.classical}${defs.classicalModels[state.classicalModel].acronym}.`
      : s.classicalKoa;
  }
  if (!cfg.showClassic && !cfg.showRandom && !cfg.showLeakage) return s.trivial;
  const parts = [];
  if (cfg.showClassic) parts.push(`${s.messagePart}${defs.messageChoices[state.messageChoice].acronym}`);
  if (cfg.showRandom) parts.push(`${s.randomnessPart}${defs.randomnessChoices[state.randomnessChoice].acronym}`);
  if (cfg.showLeakage) parts.push(state.extendedUKE ? s.leakagePartUke : s.leakagePart);
  return `${s.activePrefix}${parts.join(', ')}.`;
}

const px = (v) => `${v[0]}px ${v[1]}px`;
const ORIGIN = '0px 0px';

function emitRoute(r, nodes, edges, tip) {
  const cls = `mf-wire fam-${r.family}`;
  const inner = r.pts.slice(1, -1);
  const ids = inner.map((p, i) => {
    const id = `w:${r.id}:${i}`;
    nodes.push({ data: { id, w: 1, h: 1, label: '', tip: '' }, position: { x: p.x, y: p.y }, classes: 'mf-waypoint', locked: true });
    return id;
  });
  const stops = [r.from, ...ids, r.to];
  for (let i = 0; i < stops.length - 1; i += 1) {
    const first = i === 0;
    const last = i === stops.length - 2;
    edges.push({
      data: { id: `${r.id}:${i}`, source: stops[i], target: stops[i + 1], tip },
      classes: cls,
      style: {
        'curve-style': 'straight',
        'source-endpoint': first ? px(r.sep) : ORIGIN,
        'target-endpoint': last ? px(r.tep) : ORIGIN,
        'source-arrow-shape': first && r.both ? 'triangle' : 'none',
        'target-arrow-shape': last ? 'triangle' : 'none'
      }
    });
  }
}

function buildElements(drawing, cfg, state) {
  const tips = cfg.framework === 'classical' ? T.classical : T.extended;
  const reached = new Set(drawing.reached);
  const nodes = [];
  const edges = [];
  const at = (x, y) => ({ x, y });

  drawing.regions.forEach((r) => nodes.push({
    data: { id: r.id, w: r.w, h: r.h, label: '', tip: '' },
    position: at(r.x, r.y),
    classes: `mf-region mf-${r.id}${reached.has(r.id) ? ' is-reached' : ''}`,
    locked: true
  }));

  drawing.boxes.forEach((b) => {
    const fam = FAMILY[b.id] || 'supply';
    const cls = b.font === 'anchor'
      ? 'mf-anchor'
      : `mf-${b.id === 'adv' ? 'adv' : 'box'} fam-${fam} font-${b.font}${reached.has(b.id) ? ' is-reached' : ''}`;
    const skTip = b.id === 'sk' && cfg.showGenTsk && tips.skProtected ? tips.skProtected : null;
    nodes.push({
      data: { id: b.id, w: b.w, h: b.h, label: b.label, tip: skTip || tips[b.id] || '' },
      position: at(b.x, b.y),
      classes: cls,
      locked: true
    });
  });

  drawing.texts.forEach((t) => nodes.push({
    data: { id: t.id, w: 1, h: 1, label: t.text, tip: '' },
    position: at(t.x, t.y),
    classes: `mf-name is-${t.family}${t.of && reached.has(t.of) ? ' is-reached' : ''}`,
    locked: true
  }));

  drawing.ports.forEach((p) => nodes.push({
    data: { id: p.id, w: drawing.port, h: drawing.port, label: '', tip: '' },
    position: at(p.x, p.y),
    classes: 'mf-port',
    locked: true
  }));

  drawing.plates.forEach((p) => nodes.push({
    data: { id: p.id, w: p.w, h: p.h, label: p.text, tip: p.tip || '' },
    position: at(p.x, p.y),
    classes: `mf-plate${p.kind === 'reach' ? ' is-reach' : ''}`,
    locked: true
  }));

  drawing.routes.forEach((r) => {
    emitRoute(r, nodes, edges, r.family === 'attack' ? reachTip(r.id, cfg, state) : '');
  });

  return [...nodes, ...edges];
}

function reachTip(id, cfg, state) {
  if (id === 'R3') return describeLeakage(state);
  if (id === 'R4') return cfg.randomnessDetail;
  return cfg.classicDetail;
}

const readTokens = () => {
  const s = getComputedStyle(document.documentElement);
  const v = (name) => s.getPropertyValue(name).trim();
  return {
    algo: v('--fig-algo'),
    supply: v('--fig-supply'),
    attack: v('--fig-attack'),
    flow: v('--fig-flow'),
    surface: v('--fig-surface'),
    ink: v('--ink'),
    ink2: v('--ink-2'),
    accent: v('--accent')
  };
};

function buildStyle(corner, plateRadius) {
  const c = readTokens();
  const fam = { algo: c.algo, supply: c.supply, attack: c.attack };
  const famNode = Object.keys(fam).map((k) => ({ selector: `node.fam-${k}`, style: { 'border-color': fam[k] } }));
  const famEdge = Object.keys(fam).map((k) => ({
    selector: `edge.fam-${k}`,
    style: { 'line-color': fam[k], 'target-arrow-color': fam[k], 'source-arrow-color': fam[k] }
  }));

  return [
    {
      selector: 'node',
      style: {
        shape: 'round-rectangle',
        width: 'data(w)',
        height: 'data(h)',
        'background-color': c.surface,
        'background-opacity': 1,
        'border-width': STROKE.box,
        label: 'data(label)',
        color: c.ink,
        'font-family': SANS,
        'font-size': TYPE.box.size,
        'font-weight': TYPE.box.weight,
        'text-valign': 'center',
        'text-halign': 'center',
        'corner-radius': corner,
        'z-index-compare': 'manual',
        'z-index': 2,
        'transition-property': 'border-color, color',
        'transition-duration': '140ms'
      }
    },
    ...famNode,
    { selector: 'node.font-math', style: { 'font-family': MATH, 'font-style': 'italic', 'font-size': TYPE.math.size, 'font-weight': TYPE.math.weight } },
    {
      selector: 'node.mf-region',
      style: {
        'background-opacity': 0,
        'border-width': STROKE.region,
        'border-color': c.supply,
        label: '',
        'z-index': 0
      }
    },
    {
      selector: 'node.mf-sign',
      style: { 'border-width': STROKE.boundary, 'border-color': c.algo, 'background-color': c.algo, 'background-opacity': 0.06 }
    },
    { selector: 'node.is-reached', style: { 'border-color': c.attack, 'border-width': STROKE.reached } },
    {
      selector: 'node.mf-adv',
      style: {
        'background-color': c.attack,
        'background-opacity': 0.08,
        'border-color': c.attack,
        'border-width': STROKE.adv,
        'border-style': 'dashed',
        color: c.attack,
        'font-family': MATH,
        'font-style': 'italic',
        'font-size': TYPE.adv.size,
        'z-index': 1
      }
    },
    { selector: 'node.mf-waypoint', style: { 'background-opacity': 0, 'border-width': 0, label: '', events: 'no', 'z-index': 1 } },
    { selector: 'node.mf-anchor', style: { 'background-opacity': 0, 'border-width': 0, label: '', events: 'no', 'z-index': 0 } },
    {
      selector: 'node.mf-name',
      style: {
        'background-opacity': 0,
        'border-width': 0,
        width: 1,
        height: 1,
        'text-halign': 'right',
        'font-size': TYPE.region.size,
        'font-weight': TYPE.region.weight,
        color: c.supply,
        events: 'no',
        'z-index': 4
      }
    },
    { selector: 'node.mf-name.is-boundary', style: { color: c.algo } },
    { selector: 'node.mf-name.is-reached', style: { color: c.attack } },
    {
      selector: 'node.mf-port',
      style: {
        shape: 'ellipse',
        'background-color': c.flow,
        'border-width': STROKE.port,
        'border-color': c.surface,
        label: '',
        events: 'no',
        'z-index': 3
      }
    },
    {
      selector: 'node.mf-plate',
      style: {
        shape: 'round-rectangle',
        'corner-radius': plateRadius,
        'background-color': c.surface,
        'border-width': 0,
        'font-size': TYPE.edge.size,
        'font-weight': TYPE.edge.weight,
        color: c.ink2,
        events: 'no',
        'z-index': 4
      }
    },
    { selector: 'node.mf-plate.is-reach', style: { color: c.attack, events: 'yes' } },
    {
      selector: 'edge',
      style: {
        width: STROKE.edge,
        'target-arrow-shape': 'triangle',
        'arrow-scale': STROKE.arrow,
        'line-cap': 'round',
        'overlay-padding': 4,
        'overlay-opacity': 0,
        'overlay-color': c.accent,
        'z-index-compare': 'manual',
        'z-index': 1
      }
    },
    ...famEdge,
    { selector: 'edge.fam-attack', style: { 'line-style': 'dashed', 'line-dash-pattern': [6, 5] } },
    { selector: 'node.mf-hot', style: { 'outline-width': STROKE.hover, 'outline-color': c.accent, 'outline-offset': 2 } },
    { selector: 'edge.mf-hot', style: { 'overlay-opacity': 0.18 } }
  ];
}

const item = (label, detail) => `<li><strong>${escapeHtml(label)}.</strong> ${escapeHtml(detail)}</li>`;

let cy = null;
let host = null;
let scroll = null;
let detail = null;
let lastW = 0;
let lastNarrow = null;
let lastShape = null;
let lastTarget = null;
let lastState = null;

function settle(stage) {
  if (!cy) return;
  host.style.width = `${stage.w}px`;
  host.style.height = `${stage.h}px`;
  cy.resize();
  cy.zoom(1);
  cy.pan({ x: 0, y: 0 });
}

function bindEvents(container) {

  cy.on('mouseover', 'node, edge', (ev) => {
    const el = ev.target;
    if (!el.data('tip')) return;
    el.addClass('mf-hot');
    if (detail) detail.textContent = el.data('tip');
    container.style.cursor = 'help';
  });
  const release = () => {
    cy.elements().removeClass('mf-hot');
    if (detail) detail.textContent = detail.dataset.rest || '';
    container.style.cursor = '';
  };
  cy.on('mouseout', 'node, edge', release);
  container.addEventListener('mouseleave', release);
  window.addEventListener('blur', release);
}

export function renderModel(target, state) {
  lastTarget = target;
  lastState = state;
  const cfg = getModelConfig(state);
  const I = figureData.items;
  const active = [
    item(I.classic, cfg.showClassic ? `${cfg.classicLabel}. ${cfg.classicDetail}` : cfg.classicDetail),
    item(I.randomness, cfg.showRandom ? `${cfg.randomnessLabel}. ${cfg.randomnessDetail}` : cfg.randomnessDetail),
    item(I.leakage, cfg.showLeakage ? `${cfg.leakageLabel}. ${cfg.leakageDetail}` : cfg.leakageDetail)
  ].join('');
  const compilers = cfg.compilerItems.length
    ? cfg.compilerItems.map((c) => item(c.name, c.detail)).join('')
    : item(I.compilers, figureData.empty.noCompilers);

  if (!target.querySelector('.model-stage')) {
    target.innerHTML = `<div class="model-wrap">
      <div class="model-scroll"><div class="model-stage" id="modelStage" role="img"></div></div>
      <p class="model-detail" aria-live="polite"></p>
      <div class="model-summary">
        <div class="model-card">
          <h3 class="model-card-title">${figureData.cards.attacks}</h3>
          <ul class="model-list" data-slot="attacks"></ul>
        </div>
        <div class="model-card">
          <h3 class="model-card-title">${figureData.cards.compilers}</h3>
          <ul class="model-list" data-slot="compilers"></ul>
        </div>
      </div>
    </div>`;
    cy = null;
  }
  target.querySelector('[data-slot="attacks"]').innerHTML = active;
  target.querySelector('[data-slot="compilers"]').innerHTML = compilers;
  detail = target.querySelector('.model-detail');
  detail.dataset.rest = buildStatusText(cfg, state);
  detail.textContent = detail.dataset.rest;

  host = target.querySelector('#modelStage');
  scroll = target.querySelector('.model-scroll');
  host.setAttribute('aria-label', cfg.framework === 'classical' ? A11Y.classical : A11Y.extended);
  if (!window.cytoscape || !scroll.clientWidth) return;

  const narrow = scroll.clientWidth < figureData.narrowBelow;
  target.querySelector('.model-wrap').classList.toggle('is-narrow', narrow);
  if (cy && narrow !== lastNarrow) { cy.destroy(); cy = null; }
  lastNarrow = narrow;

  const drawing = buildDrawing(cfg, narrow);
  lastShape = drawing;
  const built = buildElements(drawing, cfg, state);
  if (!cy) {
    cy = window.cytoscape({
      container: host,
      elements: built,
      style: buildStyle(drawing.corner, drawing.plateRadius),
      layout: { name: 'preset' },
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      autoungrabify: true,
      autounselectify: true,
      autolock: true
    });
    bindEvents(host);
  } else {
    cy.json({ elements: built });
    cy.style(buildStyle(drawing.corner, drawing.plateRadius));
    cy.layout({ name: 'preset' }).run();
  }
  built.forEach((el) => { if (el.style) cy.$id(el.data.id).style(el.style); });
  settle(drawing.stage);
  lastW = scroll.clientWidth;
}

export function retheme() {
  if (cy) cy.style(buildStyle(drawing.corner, drawing.plateRadius));
}

export function refit() {

  if (!cy || !scroll || !lastTarget) return;
  if (scroll.clientWidth === lastW) return;
  renderModel(lastTarget, lastState);
}

export const mounted = () => cy !== null;
