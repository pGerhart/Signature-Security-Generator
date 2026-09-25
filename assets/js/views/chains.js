import { defs, relationsData, modelsData, parseOwnership } from '../data.js';
import { escapeHtml, escapeAttr } from '../tex.js';

const R = relationsData;

const CLASSICAL_LANES = ['goal', 'message'];

export function activeNodes(laneId, state) {
  const classical = state.framework === 'classical';
  if (laneId === 'goal') return [classical ? state.classicalGoal : state.extendedUnforgeability];
  if (laneId.startsWith('ownership')) {
    const ownership = classical ? '' : parseOwnership(state.extendedOwnership);
    return ownership ? [ownership] : [];
  }
  if (laneId === 'message') {
    if (classical) return [state.classicalModel];
    return [{ ko: 'koa', km: 'kma', gcm: 'gcma', dcm: 'dcma', acm: 'acma' }[state.messageChoice]];
  }
  if (laneId === 'randomness') {
    if (classical) return [];
    return [{ ko: 'rkoa', kr: 'kra', gcr: 'gcra', dcr: 'dcra', acr: 'acra' }[state.randomnessChoice]];
  }
  if (laneId === 'exposure') return classical ? [] : [state.leakage ? 'ltsk' : 'empty'];
  return [];
}

export const activeNode = (laneId, state) => activeNodes(laneId, state)[0] || null;

function nodeDefinition(id) {
  if (defs.extendedGoals[id]) return defs.extendedGoals[id].definition;
  const bind = R.nodes[id].bind;
  if (bind.extendedUnforgeability) return defs.extendedGoals[bind.extendedUnforgeability].definition;
  if (bind.classicalModel) return defs.classicalModels[bind.classicalModel].definition;
  if (bind.randomnessChoice) return defs.randomnessChoices[bind.randomnessChoice].definition;
  if (bind.leakage === true) return modelsData.leakage.definition;
  return '';
}

const edgeText = (from, to) => R.edges.find((e) => e.from === from && e.to === to)
  || (R.goalImplications.some((e) => e.from === from && e.to === to)
    ? { impl: R.selection.setRule, sep: R.selection.noStrongerNote }
    : { impl: '', sep: '' });

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

function gapHtml(from, to, implLive, sepLive, equal = false) {
  const e = edgeText(from, to);
  if (equal) return `<div class="rg-gap" data-from="${from}" data-to="${to}">
    <span class="rg-link is-equiv is-live" tabindex="0" role="img"
      aria-label="${escapeAttr(R.legend.equivalence)}" data-tip="${escapeAttr(R.legendTips.equivalence)}"><i class="rg-equiv-back"></i></span>
  </div>`;
  return `<div class="rg-gap" data-from="${from}" data-to="${to}">
    <span class="rg-link is-impl ${implLive ? 'is-live' : ''}" tabindex="0" role="img"
      aria-label="${escapeAttr(R.legend.implication)}" data-tip="${escapeAttr(e.impl)}"></span>
    <span class="rg-link is-sep ${sepLive ? 'is-live' : ''}" tabindex="0" role="img"
      aria-label="${escapeAttr(R.legend.separation)}" data-tip="${escapeAttr(e.sep)}"><i class="rg-cross"></i></span>
  </div>`;
}

function laneHtml(lane, state) {
  const active = activeNodes(lane.id, state).filter((id) => lane.nodes.includes(id));
  const indices = active.map((id) => lane.nodes.indexOf(id));
  const inactive = active.length === 0;
  const emptySigning = state.framework === 'classical'
    ? state.classicalModel === 'koa'
    : state.messageChoice === 'ko' && state.randomnessChoice === 'ko';

  const row = [];
  lane.nodes.forEach((id, j) => {
    let status = 'is-stronger';
    if (active.includes(id)) status = 'is-selected';
    else if (indices.some((idx) => j > idx)) status = 'is-implied';
    row.push(nodeHtml(id, status));
    if (j < lane.nodes.length - 1) {

      const nr = state.framework !== 'classical' && state.extendedNR;
      const goalEqual = lane.id === 'goal' && (j === 0 || (j === 1 && !nr));
      const equal = emptySigning && (goalEqual || lane.id === 'exposure');
      row.push(gapHtml(
        lane.nodes[j], lane.nodes[j + 1],
        indices.some((idx) => j >= idx), indices.some((idx) => j + 1 === idx), equal
      ));
    }
  });

  return `<section class="rg-lane ${inactive ? 'is-inactive' : ''}" data-lane="${lane.id}">
    <header class="rg-lane-head"><h3 class="rg-lane-title">${escapeHtml(lane.title)}</h3></header>
    <div class="rg-row">${row.join('')}</div>
  </section>`;
}

export function renderChains(target, state) {
  const lanes = state.framework === 'classical'
    ? R.lanes.filter((lane) => CLASSICAL_LANES.includes(lane.id))
    : R.lanes.concat(R.goalLanes || []);
  target.innerHTML = `<div class="rg">${lanes.map((lane) => laneHtml(lane, state)).join('')}</div>`;
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
