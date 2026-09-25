import { defs } from '../data.js';
import {
  raw, joinWithAnd, plainGoalLatex,
  probabilityLabelClassical, probabilityLabelExtended
} from './common.js';

const phaseRgb = { init: '0.08,0.33,0.18', learn: '0.12,0.23,0.54', eval: '0.60,0.11,0.11' };
const phaseWrap = (tex, phase) => raw`{\color[rgb]{${phaseRgb[phase]}} ${tex}}`;

export function procedureToLatex(proc, withColor = false) {
  const arr = [raw`\[`, raw`\begin{array}{@{}l@{}}`, proc.name + raw`\\`];
  proc.lines.forEach((ln) => {
    const indent = raw`\qquad `.repeat(ln.indent || 0);
    const tex = withColor && ln.phase ? phaseWrap(ln.tex, ln.phase) : ln.tex;
    arr.push(indent + tex + raw`\\`);
  });
  arr.push(raw`\end{array}`, raw`\]`);
  return arr.join('\n');
}

export const proceduresToLatex = (procs, withColor = false) =>
  procs.map((proc) => procedureToLatex(proc, withColor)).join('\n\n');

export function classicalDefinitionLatex(goal, model) {
  return `\\begin{definition}
A signature scheme $\\Sigma=(\\mathsf{Gen},\\mathsf{Sign},\\mathsf{Vrfy})$ achieves security goal ${plainGoalLatex(defs.classicalGoals[goal])} under an adversary with ${plainGoalLatex(defs.classicalModels[model])} if for all $\\mathsf{PPT}$ adversaries $\\mathcal{A}$ it holds
\\[
${probabilityLabelClassical(goal, model)}
\\]
where $\\mathrm{negl}$ is a negligible function and the probability is taken over the randomness used by $\\mathcal{A}$ and the randomness used in the experiment.
\\end{definition}`;
}

export function extendedDefinitionLatex(goals, mc, rc, leakage) {
  const securityGoals = goals.filter((g) => g !== 'uke');
  const gtxt = joinWithAnd(securityGoals.map((g) => plainGoalLatex(defs.extendedGoals[g])));
  const parts = [plainGoalLatex(defs.messageChoices[mc]), plainGoalLatex(defs.randomnessChoices[rc])];

  if (leakage) parts.push('leakage function $L_{\\mathsf{tsk}}^{m,\\sigma}$');
  const noun = securityGoals.length === 1 ? 'security goal' : 'security goals';
  const restriction = goals.includes('uke')
    ? ` with the $(\\mathrm{${defs.extendedGoals.uke.acronym}})$ restriction`
    : '';
  return `\\begin{definition}
A signature scheme $\\Sigma=(\\mathsf{Gen},\\mathsf{Sign},\\mathsf{Vrfy})$ achieves ${noun} ${gtxt}${restriction} under an adversary with ${joinWithAnd(parts)} if for all $\\mathsf{PPT}$ adversaries $\\mathcal{A}$ it holds
\\[
${probabilityLabelExtended(goals, mc, rc, leakage)}
\\]
where $\\mathrm{negl}$ is a negligible function and the probability is taken over the randomness used by $\\mathcal{A}$ and the randomness used in the experiment.
\\end{definition}`;
}
