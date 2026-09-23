import { relationsData, notationData, figureData } from '../data.js';
import { escapeHtml, escapeAttr, renderProse } from '../tex.js';
import {
  idOf, parseId, flatLabel, neighbours, cover, separationSuppressed, wrapperLift,
  isAsymmetry, AXIS_TITLE
} from '../notions.js';
import { activeNode, nodeFace } from './chains.js';

const R = relationsData;

export function wrapperTip() {
  const closure = R.theorems.find((t) => t.id === 'thm:wrappers-closure');
  const procs = notationData.extendedAlgorithms
    .map((a) => `${a.tex.replace(/\\mathsf\{|\}/g, '')} is the ${a.description}.`);
  const compilers = [figureData.compilerItems.genTr.detail, figureData.compilerItems.genTsk.detail];
  return [...procs, ...compilers, closure.statement].join(' ');
}

export function renderLegend(target) {
  const l = R.legend;
  const t = R.legendTips;
  target.innerHTML = [
    `<span class="legend-item" role="img" aria-label="${escapeAttr(l.implication)}" data-tip="${escapeAttr(t.implication)}"><span class="legend-glyph is-impl"></span>${escapeHtml(l.implication)}</span>`,
    `<span class="legend-item" role="img" aria-label="${escapeAttr(l.separation)}" data-tip="${escapeAttr(t.separation)}"><span class="legend-glyph is-sep"><i class="rg-cross"></i></span>${escapeHtml(l.separation)}</span>`,
    `<span class="legend-item" role="img" aria-label="${escapeAttr(l.wrapper)}" data-tip="${escapeAttr(wrapperTip())}"><span class="legend-glyph is-wrap"></span>${escapeHtml(l.wrapper)}</span>`
  ].join('');
}

const chipsFor = (ids) => ids.map((id) => `<span class="chip chip-plain">${nodeFace(R.nodes[id])}</span>`).join('');

const axisRow = (title, ids) => `<div class="rel-axis">
  <span class="rel-axis-title">${escapeHtml(title)}</span>
  <span class="rel-axis-chips">${chipsFor(ids)}</span>
</div>`;

export function renderSelection(target, state) {
  const productOrder = R.theorems.find((t) => t.id === 'thm:product-order');
  const implies = [];
  const notImplies = [];
  let koaActive = false;

  R.lanes.forEach((lane) => {
    const active = activeNode(lane.id, state);
    if (active === null) return;
    const idx = lane.nodes.indexOf(active);
    const weaker = lane.nodes.slice(idx + 1);
    const stronger = lane.nodes.slice(0, idx);
    if (weaker.length) implies.push(axisRow(lane.title, weaker));
    if (stronger.length) notImplies.push(axisRow(lane.title, stronger));
    if (lane.id === 'message' && active === 'koa') koaActive = true;
  });

  const empty = (text) => `<p class="rel-empty prose">${renderProse(text)}</p>`;
  target.innerHTML = `<div class="rel-selection">
    <div class="rel-columns">
      <div class="rel-col is-implies">
        <p class="eyebrow">${escapeHtml(R.selection.implies)}</p>
        ${implies.length ? implies.join('') : empty(R.selection.chainNote)}
      </div>
      <div class="rel-col is-not">
        <p class="eyebrow">${escapeHtml(R.selection.notImplies)}</p>
        ${notImplies.length ? notImplies.join('') : empty(R.selection.noStrongerNote)}
      </div>
    </div>
    <p class="prose rel-rule">${renderProse(productOrder.statement)}</p>
    ${koaActive ? `<p class="prose rel-warn">${renderProse(R.selection.koaNote)}</p>` : ''}
  </div>`;
}

const theoremCard = (t) => `<article class="theorem">
  <h3 class="theorem-name">${escapeHtml(t.name)}</h3>
  <p class="theorem-statement prose">${renderProse(t.statement)}</p>
  ${t.note ? `<p class="theorem-note prose">${renderProse(t.note)}</p>` : ''}
</article>`;

export function renderStatic(nodes) {
  nodes.intro.innerHTML = R.intro.map((p) => `<p>${renderProse(p)}</p>`).join('')
    + `<p>${renderProse(R.chainsSection.lead)}</p>`;
  nodes.closing.innerHTML = renderProse(R.chainsSection.closing);
  nodes.theorems.innerHTML = R.theorems.map(theoremCard).join('');
  nodes.beyondLead.innerHTML = `<p>${renderProse(R.beyond.lead)}</p>`;
  nodes.beyondTheorems.innerHTML = R.beyond.theorems.map(theoremCard).join('');
}

const theorem = (id) => R.theorems.find((t) => t.id === id) || { statement: '', note: '' };
const withNote = (t) => [t.statement, t.note].filter(Boolean).join(' ');

export function renderSteps(target, notion) {
  const groups = { impl: [], sep: [], wrap: [] };

  neighbours(notion).forEach((other) => {
    const c = cover(notion, other);
    if (c) {
      const strongIsCentre = idOf(c.strong) === idOf(notion);
      const e = R.edges.find((x) => x.from === c.strong[c.axis] && x.to === c.weak[c.axis]) || {};
      groups[strongIsCentre ? 'impl' : 'sep'].push({
        notion: other,
        axis: AXIS_TITLE[c.axis],
        tip: (strongIsCentre ? e.impl : e.sep) || '',
        blocked: !strongIsCentre && separationSuppressed(c)
      });
    }
    const lift = wrapperLift(notion, other) || wrapperLift(other, notion);
    if (lift) groups.wrap.push({ notion: other, axis: lift, tip: withNote(theorem('thm:wrappers-closure')) });
    if (isAsymmetry(notion, other) || isAsymmetry(other, notion)) {
      groups.sep.push({ notion: other, axis: theorem('prop:asymmetry').name, tip: withNote(theorem('prop:asymmetry')) });
    }
  });

  const group = (kind, title, items) => (items.length ? `<div class="rel-step-group is-${kind}">
    <span class="eyebrow">${escapeHtml(title)}</span>
    <div class="rel-step-list">${items.filter((i) => !i.blocked).map((i) => `
      <button type="button" class="rel-step" data-notion="${idOf(i.notion)}" data-tip="${escapeAttr(i.tip)}">
        <span class="rel-step-axis">${escapeHtml(i.axis)}</span>
        <span class="rel-step-label">${escapeHtml(flatLabel(i.notion))}</span>
      </button>`).join('')}</div>
  </div>` : '');

  target.innerHTML = group('impl', R.legend.implication, groups.impl)
    + group('sep', R.legend.separation, groups.sep)
    + group('wrap', R.legend.wrapper, groups.wrap);
}

export function renderPath(target, ids, currentId) {
  const crumbs = ids.map((id) => `<button type="button" class="rel-crumb ${id === currentId ? 'is-current' : ''}"
    data-notion="${id}">${escapeHtml(flatLabel(parseId(id)))}</button>`).join('<span class="rel-crumb-sep" aria-hidden="true">&rsaquo;</span>');
  const back = ids.length > 1
    ? `<button type="button" class="btn btn-back" data-notion="${ids[ids.length - 2]}">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>Back</button>`
    : '';
  target.innerHTML = back + crumbs;
}
