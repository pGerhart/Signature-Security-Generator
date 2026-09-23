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

export function uniqueGoals(goals) {
  return [...new Set(goals)]
    .filter((g) => extendedGoalOrder.includes(g))
    .sort((a, b) => extendedGoalOrder.indexOf(a) - extendedGoalOrder.indexOf(b));
}
