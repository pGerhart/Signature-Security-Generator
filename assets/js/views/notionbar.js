import { defs, leakageMeta } from '../data.js';
import { renderMath, escapeHtml } from '../tex.js';

const chip = (axis, keyHtml, label) => `<span class="chip chip-${axis}">
  <span class="chip-key">${keyHtml}</span><span class="chip-label">${escapeHtml(label)}</span></span>`;

const textChip = (axis, meta) => chip(axis, escapeHtml(meta.acronym), meta.label);

export function renderNotionBar(mathTarget, chipTarget, state, model) {
  mathTarget.innerHTML = renderMath(model.experimentLabel, true);

  const chips = [];
  if (state.framework === 'classical') {
    chips.push(textChip('goal', defs.classicalGoals[state.classicalGoal]));
    chips.push(textChip('message', defs.classicalModels[state.classicalModel]));
  } else {
    model.goals.forEach((key) => chips.push(textChip(key === 'uke' ? 'restriction' : 'goal', defs.extendedGoals[key])));
    chips.push(textChip('message', defs.messageChoices[state.messageChoice]));
    chips.push(textChip('randomness', defs.randomnessChoices[state.randomnessChoice]));
    if (state.leakage) chips.push(chip('exposure', renderMath(leakageMeta.tex), leakageMeta.label));
  }
  chipTarget.innerHTML = chips.join('');
}
