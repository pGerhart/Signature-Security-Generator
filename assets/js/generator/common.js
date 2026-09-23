import { defs } from '../data.js';
import { inlineMath } from '../tex.js';

export const raw = String.raw;

export const line = (tex, indent = 0, phase = '') => ({ tex, indent, phase });
export const sample = (lhs, rhs) => raw`${lhs} \gets_\$ ${rhs}`;
export const assign = (lhs, rhs) => raw`${lhs} \gets ${rhs}`;
export const ret = (expr) => raw`\mathbf{return}\ ${expr}`;
export const ifThen = (cond, stmt) => raw`\mathbf{if}\ ${cond}\ \mathbf{then}\ ${stmt}`;

export function tupleOrSingle(items) {
  const xs = items.filter(Boolean);
  if (!xs.length) return raw``;
  return xs.length === 1 ? xs[0] : raw`(${xs.join(', ')})`;
}

export function joinWithAnd(arr) {
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

export const goalDisplay = (meta) => `${meta.label} ${inlineMath(raw`\left(\mathrm{${meta.acronym}}\right)`)}`;
export const modelDisplay = goalDisplay;
export const plainGoalLatex = (meta) => `${meta.label} $(\\mathrm{${meta.acronym}})$`;

export function experimentLabelClassical(goal, model) {
  return raw`(\mathrm{${defs.classicalGoals[goal].acronym}}\text{-}\mathrm{${defs.classicalModels[model].acronym}})^{\mathcal{A}}_{\Sigma}(\lambda)`;
}

export function experimentLabelExtended(goals, mc, rc, leakage) {
  const gtxt = goals.map((g) => raw`\mathrm{${defs.extendedGoals[g].acronym}}`).join(',');
  const parts = [raw`\mathrm{${defs.messageChoices[mc].acronym}}`, raw`\mathrm{${defs.randomnessChoices[rc].acronym}}`];
  if (leakage) parts.push(raw`L_{\mathsf{tsk}}^{m,\sigma}`);
  return raw`((${gtxt})\text{-}(${parts.join(',')}))^{\mathcal{A}}_{\Sigma}(\lambda)`;
}

export function probabilityLabelClassical(goal, model) {
  return raw`\Pr\!\left[${experimentLabelClassical(goal, model)}=1\right] \leq \mathrm{negl}(\lambda)`;
}

export function probabilityLabelExtended(goals, mc, rc, leakage) {
  return raw`\Pr\!\left[${experimentLabelExtended(goals, mc, rc, leakage)}=1\right] \leq \mathrm{negl}(\lambda)`;
}

export function definitionSentenceClassical(goal, model) {
  return `A signature scheme ${inlineMath(raw`\Sigma=(\mathsf{Gen},\mathsf{Sign},\mathsf{Vrfy})`)} achieves security goal ${goalDisplay(defs.classicalGoals[goal])} under an adversary with ${modelDisplay(defs.classicalModels[model])} if for all ${inlineMath(raw`\mathsf{PPT}`)} adversaries ${inlineMath(raw`\mathcal{A}`)} it holds`;
}

export function definitionSentenceExtended(goals, mc, rc, leakage) {
  const goalsText = joinWithAnd(goals.map((g) => goalDisplay(defs.extendedGoals[g])));
  const parts = [modelDisplay(defs.messageChoices[mc]), modelDisplay(defs.randomnessChoices[rc])];
  if (leakage) parts.push(`leakage function ${inlineMath(raw`L_{\mathsf{tsk}}^{m,\sigma}`)}`);
  const noun = goals.length === 1 ? 'security goal' : 'security goals';
  return `A signature scheme ${inlineMath(raw`\Sigma=(\mathsf{Gen},\mathsf{Sign},\mathsf{Vrfy})`)} achieves ${noun} ${goalsText} under an adversary with ${joinWithAnd(parts)} if for all ${inlineMath(raw`\mathsf{PPT}`)} adversaries ${inlineMath(raw`\mathcal{A}`)} it holds`;
}

export function definitionTail() {
  return `where ${inlineMath(raw`\mathrm{negl}`)} is a negligible function and the probability is taken over the randomness used by ${inlineMath(raw`\mathcal{A}`)} and the randomness used in the experiment.`;
}

export const normalizeChoices = (mc, rc) => ({
  mc: mc === 'gcm' ? 'dcm' : mc,
  rc: rc === 'gcr' ? 'dcr' : rc
});
