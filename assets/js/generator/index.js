import { defs, uniqueGoals } from '../data.js';
import { buildClassicalAdmin, buildClassicalOracle } from './classical.js';
import { buildExtendedAdmin, buildExtendedOracles } from './extended.js';
import {
  classicalDefinitionLatex, extendedDefinitionLatex,
  procedureToLatex, proceduresToLatex
} from './latex.js';
import {
  definitionSentenceClassical, definitionSentenceExtended, definitionTail,
  probabilityLabelClassical, probabilityLabelExtended,
  experimentLabelClassical, experimentLabelExtended
} from './common.js';

export function selectedGoals(state) {
  const goals = [state.extendedUnforgeability];
  if (state.extendedOwnership) goals.push(state.extendedOwnership);
  if (state.extendedMB) goals.push('mb');
  if (state.extendedNR) goals.push('nr');
  if (state.extendedUKE) goals.push('uke');
  return uniqueGoals(goals);
}

export function build(state) {
  if (state.framework === 'classical') {
    const { classicalGoal: goal, classicalModel: model } = state;
    const admin = buildClassicalAdmin(goal, model);
    const oracles = [buildClassicalOracle(model)];
    return {
      goals: [goal],
      sentence: definitionSentenceClassical(goal, model),
      probability: probabilityLabelClassical(goal, model),
      experimentLabel: experimentLabelClassical(goal, model),
      tail: definitionTail(),
      admin,
      oracles,
      latex: {
        definition: classicalDefinitionLatex(goal, model),
        admin: procedureToLatex(admin, false),
        oracle: proceduresToLatex(oracles, false)
      }
    };
  }

  const goals = selectedGoals(state);
  const { messageChoice: mc, randomnessChoice: rc, leakage } = state;
  const admin = buildExtendedAdmin(goals, mc, rc, leakage);
  const oracles = buildExtendedOracles(goals, mc, rc, leakage);
  return {
    goals,
    sentence: definitionSentenceExtended(goals, mc, rc, leakage),
    probability: probabilityLabelExtended(goals, mc, rc, leakage),
    experimentLabel: experimentLabelExtended(goals, mc, rc, leakage),
    tail: definitionTail(),
    admin,
    oracles,
    latex: {
      definition: extendedDefinitionLatex(goals, mc, rc, leakage),
      admin: procedureToLatex(admin, false),
      oracle: proceduresToLatex(oracles, false)
    }
  };
}

export { defs };
