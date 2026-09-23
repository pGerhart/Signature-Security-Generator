import { defs, goalsData, modelsData, relationsData } from './data.js';
import { state, readHash, commit, onChange } from './state.js';
import { build } from './generator/index.js';
import { renderProse, escapeHtml } from './tex.js';
import { renderNotionBar } from './views/notionbar.js';
import { renderDefinition, renderFigure } from './views/definition.js';
import { renderNotation } from './views/notation.js';
import * as modelfigure from './views/modelfigure.js';
import { renderChains, bindHighlight } from './views/chains.js';
import * as relations from './views/relations.js';
import * as network from './views/network.js';
import { fromState, toSelect, isClassicalCorner, idOf, parseId, flatLabel, allNotions } from './notions.js';
import { initTooltip } from './tooltip.js';
import { initTheme } from './theme.js';
import { initCopy } from './copy.js';
import { renderCount } from './views/counter.js';

const $ = (id) => document.getElementById(id);
const VIEWS = ['visual', 'latex', 'model', 'relations', 'notation'];

const el = {
  frameworkTabs: $('frameworkTabs'),
  workspace: $('workspace'),
  viewTabs: $('viewTabs'),
  graphModes: $('graphModes'),
  classicalControls: $('controls-classical'),
  extendedControls: $('controls-extended'),
  notionMath: $('notionMath'),
  notionChips: $('notionChips'),
  definition: $('definitionRender'),
  figure: $('figureRender'),
  notation: $('notationRender'),
  model: $('modelRender'),
  networkStage: $('relationsNetwork'),
  chainsStage: $('relationsChains'),
  graphLegend: $('graphLegend'),
  trail: $('relationsTrail'),
  steps: $('relationsSteps'),
  selection: $('relationsSelection'),
  search: $('notionSearch'),
  copyStatus: $('globalCopyStatus')
};

const SELECT_FIELDS = {
  classicalGoal: 'classicalGoal',
  classicalModel: 'classicalModel',
  extendedUnforgeability: 'extendedUnforgeability',
  extendedOwnership: 'extendedOwnership',
  messageChoice: 'messageChoice',
  randomnessChoice: 'randomnessChoice'
};

const TOGGLE_FIELDS = {
  extendedMb: 'extendedMB',
  extendedNr: 'extendedNR',
  extendedUke: 'extendedUKE',
  leakageToggle: 'leakage'
};

const validValues = () => ({
  framework: ['classical', 'extended'],
  classicalGoal: Object.keys(defs.classicalGoals),
  classicalModel: Object.keys(defs.classicalModels),
  extendedUnforgeability: goalsData.extendedUnforgeability,
  extendedOwnership: [''].concat(goalsData.extendedOwnership),
  messageChoice: Object.keys(defs.messageChoices),
  randomnessChoice: Object.keys(defs.randomnessChoices),
  view: VIEWS,
  graphMode: ['network', 'chains']
});

function definitionOf(field, value) {
  if (!value) return '';
  if (field === 'classicalGoal') return defs.classicalGoals[value].definition;
  if (field === 'classicalModel') return defs.classicalModels[value].definition;
  if (field === 'extendedUnforgeability' || field === 'extendedOwnership') return defs.extendedGoals[value].definition;
  if (field === 'messageChoice') return defs.messageChoices[value].definition;
  if (field === 'randomnessChoice') return defs.randomnessChoices[value].definition;
  return '';
}

function updateNotes() {
  Object.entries(SELECT_FIELDS).forEach(([id, field]) => {
    const note = $(`${id}-note`);
    if (note) note.innerHTML = renderProse(definitionOf(field, state[field]));
    const face = $(`${id}-face`);
    if (face) {
      const option = $(id).selectedOptions[0];
      face.innerHTML = `<span class="select-key">${escapeHtml(option.dataset.key || '')}</span>`
        + `<span class="select-name">${escapeHtml(option.dataset.name || option.textContent)}</span>`;
    }
  });
  const additional = goalsData.extendedAdditional
    .filter((entry) => state[TOGGLE_FIELDS[entry.control]])
    .map((entry) => `<span class="note-term">${entry.label}.</span> ${renderProse(defs.extendedGoals[entry.key].definition)}`);
  $('extendedAdditional-note').innerHTML = additional.join('<br>');
  $('leakageToggle-note').innerHTML = state.leakage ? renderProse(modelsData.leakage.definition) : '';
}

function syncControls() {
  Object.entries(SELECT_FIELDS).forEach(([id, field]) => { $(id).value = state[field]; });
  Object.entries(TOGGLE_FIELDS).forEach(([id, field]) => { $(id).checked = state[field]; });

  const classical = state.framework === 'classical';
  el.classicalControls.classList.toggle('is-hidden', !classical);
  el.extendedControls.classList.toggle('is-hidden', classical);
  el.frameworkTabs.querySelectorAll('.segment').forEach((btn) => {
    const on = btn.dataset.framework === state.framework;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
    btn.tabIndex = on ? 0 : -1;
  });
  el.viewTabs.querySelectorAll('.viewtab').forEach((btn) => {
    const on = btn.dataset.view === state.view;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
    btn.tabIndex = on ? 0 : -1;
  });
  el.graphModes.querySelectorAll('.segment').forEach((btn) => {
    const on = btn.dataset.mode === state.graphMode;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
    btn.tabIndex = on ? 0 : -1;
  });
  el.networkStage.classList.toggle('is-hidden', state.graphMode !== 'network');
  el.chainsStage.classList.toggle('is-hidden', state.graphMode !== 'chains');
  VIEWS.forEach((view) => $(`panel-${view}`).classList.toggle('is-hidden', view !== state.view));

  el.workspace.dataset.view = state.view;
}

function refreshGraph() {
  const notion = fromState(state);
  if (state.view !== 'relations') return;
  if (state.graphMode === 'network' && el.networkStage.clientWidth > 0) {
    if (!network.mounted()) network.mount(el.networkStage, { onSelect: applyNotion });
    network.update(notion);
  }
  relations.renderPath(el.trail, network.trail(), idOf(notion));
}

const latexSource = { definitionOutput: '', adminOutput: '', oracleOutput: '' };

function showLatex(id, text) {
  latexSource[id] = text;
  const code = $(id);
  code.textContent = text;
  if (window.Prism) window.Prism.highlightElement(code);
}

function render() {

  syncControls();
  const model = build(state);
  renderNotionBar(el.notionMath, el.notionChips, state, model);
  renderDefinition(el.definition, model);
  renderFigure(el.figure, model);
  showLatex('definitionOutput', model.latex.definition);
  showLatex('adminOutput', model.latex.admin);
  showLatex('oracleOutput', model.latex.oracle);
  renderNotation(el.notation, state);
  modelfigure.renderModel(el.model, state);
  renderChains(el.chainsStage, state);
  relations.renderSelection(el.selection, state);
  relations.renderSteps(el.steps, fromState(state));
  updateNotes();
  refreshGraph();
}

function applyBind(bind) {
  const hasClassical = 'classicalGoal' in bind || 'classicalModel' in bind;
  if (state.framework === 'classical' && !hasClassical) state.framework = 'extended';
  Object.entries(bind).forEach(([field, value]) => { state[field] = value; });
}

function applyNotion(n) {
  const sel = toSelect(n);
  const leavesClassical = !isClassicalCorner(n);
  state.classicalGoal = n.goal;
  state.extendedUnforgeability = n.goal;
  state.classicalModel = n.message;
  state.messageChoice = sel.messageChoice;

  if (leavesClassical || state.framework === 'extended') {
    state.randomnessChoice = sel.randomnessChoice;
    state.leakage = n.exposure === 'ltsk';
  }
  if (leavesClassical) state.framework = 'extended';
  commit();
}

function bindTablist(container, selector, activate) {
  container.addEventListener('click', (ev) => {
    const btn = ev.target.closest(selector);
    if (btn) activate(btn);
  });
  container.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    const tabs = [...container.querySelectorAll(selector)];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    ev.preventDefault();
    const next = tabs[(i + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus();
    activate(next);
  });
}

function fillSearch() {
  const list = $('notionList');
  list.innerHTML = allNotions().map((n) => `<option value="${flatLabel(n)}"></option>`).join('');
}

function boot() {
  readHash(validValues());

  bindTablist(el.frameworkTabs, '.segment', (btn) => { state.framework = btn.dataset.framework; commit(); });
  bindTablist(el.viewTabs, '.viewtab', (btn) => { state.view = btn.dataset.view; commit(); });
  bindTablist(el.graphModes, '.segment', (btn) => { state.graphMode = btn.dataset.mode; commit(); });

  Object.entries(SELECT_FIELDS).forEach(([id, field]) => {
    $(id).addEventListener('change', (ev) => { state[field] = ev.target.value; commit(); });
  });
  Object.entries(TOGGLE_FIELDS).forEach(([id, field]) => {
    $(id).addEventListener('change', (ev) => { state[field] = ev.target.checked; commit(); });
  });

  el.chainsStage.addEventListener('click', (ev) => {
    const node = ev.target.closest('.rg-node');
    if (!node) return;
    applyBind(relationsData.nodes[node.dataset.node].bind);
    commit();
  });
  bindHighlight(el.chainsStage);

  el.steps.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-notion]');
    if (btn) applyNotion(parseId(btn.dataset.notion));
  });
  el.trail.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-notion]');
    if (!btn) return;
    network.truncateTo(btn.dataset.notion);
    applyNotion(parseId(btn.dataset.notion));
  });

  $('graphZoom').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-zoom]');
    if (btn) network.zoomBy(btn.dataset.zoom === 'in' ? 1.25 : 0.8);
  });

  $('graphReset').addEventListener('click', () => {
    network.reset(fromState(state));
    relations.renderPath(el.trail, network.trail(), idOf(fromState(state)));
  });

  const labels = new Map(allNotions().map((n) => [flatLabel(n), n]));
  el.search.addEventListener('change', () => {
    const hit = labels.get(el.search.value.trim());
    if (hit) { el.search.value = ''; applyNotion(hit); }
  });

  fillSearch();
  renderCount($('heroCount'));
  relations.renderStatic({
    intro: $('relationsIntro'),
    closing: $('relationsClosing'),
    theorems: $('relationsTheorems'),
    beyondLead: $('beyondLead'),
    beyondTheorems: $('beyondTheorems')
  });
  relations.renderLegend(el.graphLegend);
  initTheme($('themeToggle'), () => { modelfigure.retheme(); network.retheme(); });
  initCopy($('panel-latex'), el.copyStatus, (id) => latexSource[id]);
  initTooltip(document.body);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (state.view === 'relations' && state.graphMode === 'network') network.refit(fromState(state));
      if (state.view === 'model') modelfigure.refit();
    }, 160);
  });

  window.addEventListener('hashchange', () => { readHash(validValues()); render(); });

  onChange(render);
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
