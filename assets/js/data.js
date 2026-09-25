const raw = JSON.parse(document.getElementById('app-data').textContent);

const byKey = (list) => {
  const out = {};
  list.forEach((entry) => { out[entry.key] = entry; });
  return out;
};

export const goalsData = raw.goals;
export const modelsData = raw.models;
export const notationData = raw.notation;
export const figureData = raw.modelfigure;
export const relationsData = raw.relations;

export const defs = {
  classicalGoals: byKey(raw.goals.classicalGoals),
  classicalModels: byKey(raw.models.classicalModels),
  extendedGoals: byKey(raw.goals.extendedGoals),
  messageChoices: byKey(raw.models.messageChoices),
  randomnessChoices: byKey(raw.models.randomnessChoices)
};

export const extendedGoalOrder = raw.goals.extendedGoals.map((g) => g.key);
export const leakageMeta = raw.models.leakage;
export const unforgeabilityGoals = raw.goals.extendedUnforgeability.slice();
export const ownershipGoals = raw.goals.extendedOwnership.slice();
export const relationGoalOrder = extendedGoalOrder.filter((g) => g !== 'uke');

export function parseOwnership(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  const kept = new Set(values.filter((g) => ownershipGoals.includes(g)));
  if (kept.size < 2) return [...kept][0] || '';
  let changed = true;
  while (changed) {
    changed = false;
    relationsData.goalEquivalences.forEach(({ single, conjunction }) => {
      if (conjunction.every((g) => kept.has(g)) && !kept.has(single)) { kept.add(single); changed = true; }
    });
  }
  return [...kept].sort((a, b) => ownershipGoals.indexOf(a) - ownershipGoals.indexOf(b)).pop();
}

export const toggleOwnership = (current, key) => (parseOwnership(current) === key ? '' : parseOwnership(key));

export function uniqueGoals(goals) {
  return [...new Set(goals)]
    .filter((g) => extendedGoalOrder.includes(g))
    .sort((a, b) => extendedGoalOrder.indexOf(a) - extendedGoalOrder.indexOf(b));
}

export function relationGoalsFromState(state) {
  if (state.framework === 'classical') return [state.classicalGoal];
  const goals = [state.extendedUnforgeability, parseOwnership(state.extendedOwnership)].filter(Boolean);
  if (state.extendedMB) goals.push('mb');
  if (state.extendedNR) goals.push('nr');
  return uniqueGoals(goals).filter((g) => g !== 'uke');
}
