import { defs, relationsData, modelsData, figureData } from '../data.js';
import { escapeHtml, escapeAttr } from '../tex.js';

const R = relationsData;

const INACTIVE_NOTE = {
  randomness: figureData.classical.randomnessDetail,
  exposure: figureData.classical.leakageDetail
};

export function activeNode(laneId, state) {
  const classical = state.framework === 'classical';
  if (laneId === 'goal') return classical ? state.classicalGoal : state.extendedUnforgeability;
  if (laneId === 'message') {
    if (classical) return state.classicalModel;
    return { ko: 'koa', km: 'kma', gcm: 'gcma', dcm: 'dcma', acm: 'acma' }[state.messageChoice];
  }
  if (laneId === 'randomness') {
    if (classical) return null;
    return { ko: 'rkoa', kr: 'kra', gcr: 'gcra', dcr: 'dcra', acr: 'acra' }[state.randomnessChoice];
  }
  if (laneId === 'exposure') return classical ? null : (state.leakage ? 'ltsk' : 'empty');
  return null;
}

function nodeDefinition(id) {
  const bind = R.nodes[id].bind;
  if (bind.extendedUnforgeability) return defs.extendedGoals[bind.extendedUnforgeability].definition;
  if (bind.classicalModel) return defs.classicalModels[bind.classicalModel].definition;
  if (bind.randomnessChoice) return defs.randomnessChoices[bind.randomnessChoice].definition;
  if (bind.leakage === true) return modelsData.leakage.definition;
  return '';
}

const edgeText = (from, to) => R.edges.find((e) => e.from === from && e.to === to) || { impl: '', sep: '' };

const EMPTY_SET = '<svg class="rg-emptyset" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><line x1="4.6" y1="15.4" x2="15.4" y2="4.6"/></svg>';

export function nodeFace(meta) {
  if (meta.glyph === 'emptyset') return EMPTY_SET;
  if (meta.sub) return `${escapeHtml(meta.acr)}<sub>${escapeHtml(meta.sub)}</sub>`;
  return escapeHtml(meta.acr);
}

function nodeHtml(id, status) {
  const meta = R.nodes[id];
  const tip = `${meta.label}. ${nodeDefinition(id)}`.trim();
  return `<button type="button" class="rg-node ${status}" data-node="${id}"
    aria-pressed="${status === 'is-selected'}" data-tip="${escapeAttr(tip)}">
    <span class="rg-node-key">${nodeFace(meta)}</span>
  </button>`;
}

function gapHtml(from, to, implLive, sepLive) {
  const e = edgeText(from, to);
  return `<div class="rg-gap" data-from="${from}" data-to="${to}">
    <span class="rg-link is-impl ${implLive ? 'is-live' : ''}" tabindex="0" role="img"
      aria-label="${escapeAttr(R.legend.implication)}" data-tip="${escapeAttr(e.impl)}"></span>
    <span class="rg-link is-sep ${sepLive ? 'is-live' : ''}" tabindex="0" role="img"
      aria-label="${escapeAttr(R.legend.separation)}" data-tip="${escapeAttr(e.sep)}"><i class="rg-cross"></i></span>
  </div>`;
}

function laneHtml(lane, state, wrapperTip) {
  const active = activeNode(lane.id, state);
  const idx = lane.nodes.indexOf(active);
  const inactive = active === null;
  const lift = R.wrapperLifts.find((w) => w.lane === lane.id);

  const row = [];
  lane.nodes.forEach((id, j) => {
    let status = 'is-stronger';
    if (j === idx) status = 'is-selected';
    else if (idx >= 0 && j > idx) status = 'is-implied';
    row.push(nodeHtml(id, status));
    if (j < lane.nodes.length - 1) {
      row.push(gapHtml(lane.nodes[j], lane.nodes[j + 1], idx >= 0 && j >= idx, idx >= 0 && j + 1 === idx));
    }
  });

  const note = inactive ? `<span class="rg-lane-note">${escapeHtml(INACTIVE_NOTE[lane.id] || '')}</span>` : '';
  const bar = lift ? `<div class="rg-wrap-bar" tabindex="0" role="img"
      aria-label="${escapeAttr(R.legend.wrapper)}" data-tip="${escapeAttr(wrapperTip)}">
      <span class="rg-wrap-label">${escapeHtml(lift.label)}</span>
    </div>` : '';

  return `<section class="rg-lane ${inactive ? 'is-inactive' : ''}" data-lane="${lane.id}">
    <header class="rg-lane-head"><h3 class="rg-lane-title">${escapeHtml(lane.title)}</h3>${note}</header>
    ${bar}
    <div class="rg-row">${row.join('')}</div>
  </section>`;
}

export function renderChains(target, state) {
  const closure = R.theorems.find((t) => t.id === 'thm:wrappers-closure');
  const wrapperTip = closure ? [closure.statement, closure.note].filter(Boolean).join(' ') : '';
  target.innerHTML = `<div class="rg">${R.lanes.map((lane) => laneHtml(lane, state, wrapperTip)).join('')}</div>`;
}

export function bindHighlight(root) {
  const clear = () => root.querySelectorAll('.is-probing, .is-hot')
    .forEach((el) => el.classList.remove('is-probing', 'is-hot'));

  const enter = (target) => {
    const node = target.closest ? target.closest('.rg-node') : null;
    if (!node) return;
    clear();
    const lane = node.closest('.rg-lane');
    if (!lane) return;
    lane.classList.add('is-probing');
    const id = node.dataset.node;
    lane.querySelectorAll('.rg-gap').forEach((gap) => {
      if (gap.dataset.from === id || gap.dataset.to === id) gap.classList.add('is-hot');
    });
  };

  root.addEventListener('mouseover', (ev) => enter(ev.target));
  root.addEventListener('focusin', (ev) => enter(ev.target));
  root.addEventListener('mouseleave', clear);
  root.addEventListener('focusout', clear);
}
