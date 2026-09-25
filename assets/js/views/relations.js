import { relationsData, relationGoalOrder, unforgeabilityGoals } from '../data.js';
import { escapeHtml, escapeAttr, renderProse } from '../tex.js';
import {
  idOf, parseId, flatLabel, neighbours, cover, separationSuppressed,
  isAsymmetry, AXIS_TITLE, fromState, goalClosure, effectiveGoals, emptySigningInterface,
  goalRelationTip, isClassical, koaIdentified, compilerMoves
} from '../notions.js';
import { activeNode, nodeFace } from './chains.js';

const R = relationsData;

const allTheorems = () => [
  ...R.theorems,
  ...(R.beyond ? R.beyond.theorems : []),
  ...(R.compilers ? R.compilers.theorems : []),
  ...(R.additional ? R.additional.theorems : [])
];
export const findTheorem = (id) => allTheorems().find((t) => t.id === id) || { name: '', statement: '', note: '' };

export function compilerTip(move) {
  const t = findTheorem(move.rule.theorem);
  return [t.name ? `${t.name}.` : '', move.rule.note || '', t.statement].filter(Boolean).join(' ');
}

const restrictionSuffix = (move) => (move.dir === 'to' && move.rule.restriction ? ` with ${move.rule.restriction}` : '');
export const compilerTarget = (move) => flatLabel(move.notion) + restrictionSuffix(move);

export function renderLegend(target) {
  const l = R.legend;
  const t = R.legendTips;
  target.innerHTML = [
    `<span class="legend-item" role="img" aria-label="${escapeAttr(l.implication)}" data-tip="${escapeAttr(t.implication)}"><span class="legend-glyph is-impl"></span>${escapeHtml(l.implication)}</span>`,
    `<span class="legend-item" role="img" aria-label="${escapeAttr(l.separation)}" data-tip="${escapeAttr(t.separation)}"><span class="legend-glyph is-sep"><i class="rg-cross"></i></span>${escapeHtml(l.separation)}</span>`,
    `<span class="legend-item" role="img" aria-label="${escapeAttr(l.equivalence)}" data-tip="${escapeAttr(t.equivalence)}"><span class="legend-glyph is-equiv"></span>${escapeHtml(l.equivalence)}</span>`,
    l.compiler ? `<span class="legend-item" role="img" aria-label="${escapeAttr(l.compiler)}" data-tip="${escapeAttr(t.compiler)}"><span class="legend-glyph is-compiler"></span>${escapeHtml(l.compiler)}</span>` : ''
  ].join('');
}

const chipsFor = (ids) => ids.map((id) => `<span class="chip chip-plain">${nodeFace(R.nodes[id])}</span>`).join('');

const axisRow = (title, ids) => `<div class="rel-axis">
  <span class="rel-axis-title">${escapeHtml(title)}</span>
  <span class="rel-axis-chips">${chipsFor(ids)}</span>
</div>`;

export function renderSelection(target, state) {
  const classical = isClassical(state.framework);

  const rule = classical
    ? R.classical.rule
    : R.theorems.find((t) => t.id === 'thm:sec_defs_relations').statement;
  const goalOrder = classical
    ? relationGoalOrder.filter((g) => unforgeabilityGoals.includes(g))
    : relationGoalOrder;
  const implies = [];
  const notImplies = [];
  const notion = fromState(state);
  const selectedGoals = new Set(notion.goals);
  const closure = new Set(goalClosure(effectiveGoals(notion)));
  if (emptySigningInterface(notion)) {
    const same = koaIdentified(notion);
    if (notion.goals.some((g) => same.includes(g))) same.forEach((g) => closure.add(g));
    ['sueo', 'wueo', 'sceo', 'wceo', 'sdeo', 'wdeo'].forEach((g) => closure.add(g));
  }
  const impliedGoals = goalOrder.filter((g) => closure.has(g) && !selectedGoals.has(g));
  const independentGoals = goalOrder.filter((g) => !closure.has(g));
  if (impliedGoals.length) implies.push(axisRow(AXIS_TITLE.goals, impliedGoals));
  if (independentGoals.length) notImplies.push(axisRow(AXIS_TITLE.goals, independentGoals));

  R.lanes.forEach((lane) => {
    if (lane.axis === 'goal') return;

    if (lane.axis === 'exposure' && emptySigningInterface(notion)) return;
    const active = activeNode(lane.id, state);
    if (active === null) return;
    const idx = lane.nodes.indexOf(active);
    const weaker = lane.nodes.slice(idx + 1);
    const stronger = lane.nodes.slice(0, idx);
    if (weaker.length) implies.push(axisRow(lane.title, weaker));
    if (stronger.length) notImplies.push(axisRow(lane.title, stronger));
  });

  const empty = (text) => `<p class="rel-empty prose">${renderProse(text)}</p>`;
  const fallback = classical ? R.classical : R.selection;

  const S = R.selection;
  const notes = [];
  const note = (text, cls = 'rel-note') => notes.push(`<p class="prose ${cls}">${renderProse(text)}</p>`);
  if (emptySigningInterface(notion)) {
    note(classical ? R.classical.koaNote : S.koaNote, 'rel-warn');
    if (!classical && notion.goals.includes('nr') && S.koaNrNote) note(S.koaNrNote, 'rel-warn');
  }
  if (!classical) {
    if (notion.goals.some((g) => ['msueo', 'mb'].includes(g)) && S.modelFreeNote) note(S.modelFreeNote);
    if (notion.goals.includes('nr') && S.nrSetNote) note(S.nrSetNote);
    if (notion.message === 'koa' && notion.randomness === 'kra' && notion.exposure === 'empty' && S.hiddenNote) note(S.hiddenNote);
    if (state.extendedUKE) note(S.ukeNote);
  }

  const moves = compilerMoves(notion, state.framework);
  const C = R.compilers || {};
  const compilerRow = (title, list) => (list.length ? `<div class="rel-axis">
    <span class="rel-axis-title">${escapeHtml(title)}</span>
    <span class="rel-axis-chips">${list.map((m) => `<span class="chip chip-plain" data-tip="${escapeAttr(compilerTip(m))}">${escapeHtml(m.rule.compiler)}: ${escapeHtml(compilerTarget(m))}</span>`).join('')}</span>
  </div>` : '');
  const compilers = moves.length ? `<div class="rel-compilers">
      <p class="eyebrow">${escapeHtml(R.legend.compiler)}</p>
      ${compilerRow(C.compilesTo, moves.filter((m) => m.dir === 'to'))}
      ${compilerRow(C.compiledFrom, moves.filter((m) => m.dir === 'from'))}
    </div>` : '';
  target.innerHTML = `<div class="rel-selection">
    <div class="rel-columns">
      <div class="rel-col is-implies">
        <p class="eyebrow">${escapeHtml(R.selection.implies)}</p>
        ${implies.length ? implies.join('') : empty(fallback.chainNote)}
      </div>
      <div class="rel-col is-not">
        <p class="eyebrow">${escapeHtml(R.selection.notImplies)}</p>
        ${notImplies.length ? notImplies.join('') : empty(fallback.noStrongerNote)}
      </div>
    </div>
    ${compilers}
    <p class="prose rel-rule">${renderProse(rule)}</p>
    ${notes.join('')}
  </div>`;
}

const theoremCard = (t) => `<article class="theorem">
  <h3 class="theorem-name">${escapeHtml(t.name)}</h3>
  <p class="theorem-statement prose">${renderProse(t.statement)}</p>
  ${t.note ? `<p class="theorem-note prose">${renderProse(t.note)}</p>` : ''}
</article>`;

export function renderStatic(nodes, state) {
  const classical = isClassical(state.framework);
  const source = classical ? R.classical : { ...R.chainsSection, intro: R.intro };
  nodes.intro.innerHTML = source.intro.map((p) => `<p>${renderProse(p)}</p>`).join('')
    + `<p>${renderProse(source.lead)}</p>`;
  nodes.closing.innerHTML = renderProse(source.closing);
  nodes.theorems.innerHTML = (classical ? R.classical.theorems : R.theorems).map(theoremCard).join('');
  nodes.beyondCard.classList.toggle('is-hidden', classical);
  if (nodes.compilersCard) nodes.compilersCard.classList.toggle('is-hidden', classical || !R.compilers);
  if (nodes.additionalCard) nodes.additionalCard.classList.toggle('is-hidden', classical || !R.additional);
  if (classical) return;
  nodes.beyondLead.innerHTML = `<p>${renderProse(R.beyond.lead)}</p>`;
  nodes.beyondTheorems.innerHTML = R.beyond.theorems.map(theoremCard).join('');
  if (R.compilers && nodes.compilersLead) {
    nodes.compilersLead.innerHTML = `<p>${renderProse(R.compilers.lead)}</p><p>${renderProse(R.compilers.explain)}</p>`;
    nodes.compilersTheorems.innerHTML = R.compilers.theorems.map(theoremCard).join('');
  }
  if (R.additional && nodes.additionalLead) {
    nodes.additionalLead.innerHTML = `<p>${renderProse(R.additional.lead)}</p>`;
    nodes.additionalTheorems.innerHTML = R.additional.theorems.map(theoremCard).join('');
  }
}

const withNote = (t) => [t.statement, t.note].filter(Boolean).join(' ');

export function renderSteps(target, notion, framework) {
  const groups = { impl: [], sep: [], equiv: [], compilerTo: [], compilerFrom: [] };

  neighbours(notion, framework).forEach((other) => {
    const c = cover(notion, other);
    if (c) {
      const strongIsCentre = idOf(c.strong) === idOf(notion);
      const e = c.axis === 'goals'
        ? { impl: goalRelationTip(c), sep: R.selection.setRule }
        : (R.edges.find((x) => x.from === c.strong[c.axis] && x.to === c.weak[c.axis]) || {});
      const kind = c.equal ? 'equiv' : (strongIsCentre ? 'impl' : 'sep');
      groups[kind].push({
        notion: other,
        axis: AXIS_TITLE[c.axis],
        tip: c.equal ? goalRelationTip(c) : ((strongIsCentre ? e.impl : e.sep) || ''),
        blocked: !c.equal && !strongIsCentre && separationSuppressed(c)
      });
    }
    if (isAsymmetry(notion, other) || isAsymmetry(other, notion)) {
      groups.sep.push({ notion: other, axis: findTheorem('ex:schnorr-kra').name, tip: withNote(findTheorem('ex:schnorr-kra')) });
    }
  });

  compilerMoves(notion, framework).forEach((move) => {
    (move.dir === 'to' ? groups.compilerTo : groups.compilerFrom).push({
      notion: move.notion,
      axis: move.rule.compiler,
      tip: compilerTip(move),
      suffix: restrictionSuffix(move)
    });
  });

  const group = (kind, title, items) => (items.length ? `<div class="rel-step-group is-${kind}">
    <span class="eyebrow">${escapeHtml(title)}</span>
    <div class="rel-step-list">${items.filter((i) => !i.blocked).map((i) => `
      <button type="button" class="rel-step" data-notion="${idOf(i.notion)}" data-tip="${escapeAttr(i.tip)}">
        <span class="rel-step-axis">${escapeHtml(i.axis)}</span>
        <span class="rel-step-label">${escapeHtml(flatLabel(i.notion) + (i.suffix || ''))}</span>
      </button>`).join('')}</div>
  </div>` : '');

  const C = R.compilers || {};
  target.innerHTML = group('impl', R.legend.implication, groups.impl)
    + group('sep', R.legend.separation, groups.sep)
    + group('equiv', R.legend.equivalence, groups.equiv)
    + group('compiler', C.compilesTo || '', groups.compilerTo)
    + group('compiler', C.compiledFrom || '', groups.compilerFrom);
}

export function renderPath(target, entries) {
  const last = entries.length - 1;
  const crumbs = entries.map((entry, index) => `<button type="button" class="rel-crumb ${index === last ? 'is-current' : ''}"
    data-trail-index="${index}">${escapeHtml(flatLabel(parseId(entry.id)))}</button>`).join('<span class="rel-crumb-sep" aria-hidden="true">&rsaquo;</span>');
  const back = entries.length > 1
    ? `<button type="button" class="btn btn-back" data-trail-index="${last - 1}">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>Back</button>`
    : '';
  target.innerHTML = back + crumbs;
}
