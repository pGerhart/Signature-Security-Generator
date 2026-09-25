import {
  relationsData, defs, relationGoalOrder, relationGoalsFromState,
  unforgeabilityGoals, ownershipGoals
} from './data.js';

export const AXES = ['message', 'randomness', 'exposure'];

export const isClassical = (framework) => framework === 'classical';
const axesFor = (framework) => (isClassical(framework) ? ['message'] : AXES);

const laneByAxis = {};
relationsData.lanes.forEach((lane) => { laneByAxis[lane.axis] = lane; });

export const CHAIN = {
  goal: laneByAxis.goal.nodes,
  message: laneByAxis.message.nodes,
  randomness: laneByAxis.randomness.nodes,
  exposure: laneByAxis.exposure.nodes
};

export const AXIS_TITLE = {
  goals: 'Security goals',
  goal: laneByAxis.goal.title,
  message: laneByAxis.message.title,
  randomness: laneByAxis.randomness.title,
  exposure: laneByAxis.exposure.title
};

const MC_TO_NODE = { ko: 'koa', km: 'kma', gcm: 'gcma', dcm: 'dcma', acm: 'acma' };
const RC_TO_NODE = { ko: 'rkoa', kr: 'kra', gcr: 'gcra', dcr: 'dcra', acr: 'acra' };
const NODE_TO_MC = { koa: 'ko', kma: 'km', gcma: 'gcm', dcma: 'dcm', acma: 'acm' };
const NODE_TO_RC = { rkoa: 'ko', kra: 'kr', gcra: 'gcr', dcra: 'dcr', acra: 'acr' };

export function normalizeGoals(goals) {
  return [...new Set(goals)].filter((g) => relationGoalOrder.includes(g))
    .sort((a, b) => relationGoalOrder.indexOf(a) - relationGoalOrder.indexOf(b));
}

export const idOf = (n) => [normalizeGoals(n.goals).join('+'), ...AXES.map((a) => n[a])].join('~');

export function parseId(id) {
  const p = id.split('~');
  return { goals: normalizeGoals((p[0] || '').split('+')), message: p[1], randomness: p[2], exposure: p[3] };
}

export function fromState(state) {
  if (state.framework === 'classical') {
    return { goals: [state.classicalGoal], message: state.classicalModel, randomness: 'rkoa', exposure: 'empty' };
  }
  return {
    goals: relationGoalsFromState(state),
    message: MC_TO_NODE[state.messageChoice],
    randomness: RC_TO_NODE[state.randomnessChoice],
    exposure: state.leakage ? 'ltsk' : 'empty'
  };
}

export const emptySigningInterface = (n) => n.message === 'koa' && n.randomness === 'rkoa';

export const isClassicalCorner = (n) => n.goals.length === 1
  && unforgeabilityGoals.includes(n.goals[0])
  && n.randomness === 'rkoa' && n.exposure === 'empty';

export const toSelect = (n) => ({
  messageChoice: NODE_TO_MC[n.message],
  randomnessChoice: NODE_TO_RC[n.randomness]
});

const acr = (id) => relationsData.nodes[id].acr + (relationsData.nodes[id].sub || '');
const goalAcronyms = (goals) => normalizeGoals(goals).map(acr);

export function label(n) {
  const parts = [acr(n.message)];
  if (n.randomness !== 'rkoa' || n.exposure !== 'empty') parts.push(acr(n.randomness));
  if (n.exposure !== 'empty') parts.push(acr(n.exposure));
  return `${goalAcronyms(n.goals).join(', ')}\n(${parts.join(', ')})`;
}

export const flatLabel = (n) => label(n).replace('\n', ' ');

export function goalClosure(goals) {
  const out = new Set(normalizeGoals(goals));
  let changed = true;
  while (changed) {
    changed = false;
    relationsData.goalImplications.forEach(({ from, to }) => {
      if (out.has(from) && !out.has(to)) { out.add(to); changed = true; }
    });
    relationsData.goalEquivalences.forEach(({ single, conjunction }) => {
      if (conjunction.every((g) => out.has(g)) && !out.has(single)) {
        out.add(single);
        changed = true;
      }
    });
  }
  return normalizeGoals([...out]);
}

const QUEUE_OWNERSHIP = new Set(['sueo', 'wueo', 'sceo', 'wceo', 'sdeo', 'wdeo']);

export const koaIdentified = (n) => (n.goals.includes('nr') ? ['seuf', 'weuf'] : ['seuf', 'weuf', 'ssuf']);

export function effectiveGoals(n) {
  let goals = normalizeGoals(n.goals);
  if (!emptySigningInterface(n)) return goals;
  const same = koaIdentified(n);
  if (goals.some((g) => same.includes(g))) {
    goals = goals.filter((g) => !same.includes(g)).concat('seuf');
  }
  return normalizeGoals(goals.filter((g) => !QUEUE_OWNERSHIP.has(g)));
}

const goalSetImplies = (a, b) => {
  const closure = new Set(goalClosure(effectiveGoals(a)));
  return effectiveGoals(b).every((g) => closure.has(g));
};

const sameAttack = (a, b) => AXES.every((axis) => a[axis] === b[axis]);
const withGoals = (n, goals) => ({ ...n, goals: normalizeGoals(goals) });

export function neighbours(n, framework) {
  const out = [];
  axesFor(framework).forEach((axis) => {
    const chain = CHAIN[axis];
    const i = chain.indexOf(n[axis]);
    [i - 1, i + 1].forEach((j) => {
      if (j >= 0 && j < chain.length) out.push({ ...n, [axis]: chain[j] });
    });
  });

  const uf = n.goals.find((g) => unforgeabilityGoals.includes(g));
  const ui = CHAIN.goal.indexOf(uf);
  [ui - 1, ui + 1].forEach((j) => {
    if (j >= 0 && j < CHAIN.goal.length) out.push(withGoals(n, n.goals.filter((g) => g !== uf).concat(CHAIN.goal[j])));
  });

  if (!isClassical(framework)) {
    ['mb', 'nr'].forEach((goal) => {
      const goals = n.goals.includes(goal) ? n.goals.filter((g) => g !== goal) : n.goals.concat(goal);
      out.push(withGoals(n, goals));
    });

    const ownership = n.goals.find((g) => ownershipGoals.includes(g));
    const withoutOwnership = n.goals.filter((g) => g !== ownership);
    if (ownership) out.push(withGoals(n, withoutOwnership));
    else ownershipGoals.forEach((goal) => out.push(withGoals(n, n.goals.concat(goal))));

    relationsData.goalImplications.forEach(({ from, to }) => {
      if (!ownershipGoals.includes(from) || !ownershipGoals.includes(to)) return;
      if (ownership === from) out.push(withGoals(n, withoutOwnership.concat(to)));
      if (ownership === to) out.push(withGoals(n, withoutOwnership.concat(from)));
    });

    if (isAsymmetry(n, ASYMMETRY.to)) out.push(ASYMMETRY.to);
    if (isAsymmetry(ASYMMETRY.from, n)) out.push(ASYMMETRY.from);
  }

  const seen = new Set([idOf(n)]);
  return out.filter((m) => {
    const id = idOf(m);
    if (!m.goals.length || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function cover(a, b) {
  const goalsDiffer = normalizeGoals(a.goals).join('+') !== normalizeGoals(b.goals).join('+');
  const changedAxes = AXES.filter((axis) => a[axis] !== b[axis]);
  if (goalsDiffer && changedAxes.length) return null;

  if (goalsDiffer) {
    if (!sameAttack(a, b)) return null;
    const ab = goalSetImplies(a, b);
    const ba = goalSetImplies(b, a);
    if (!ab && !ba) return null;
    return { axis: 'goals', strong: ab ? a : b, weak: ab ? b : a, equal: ab && ba };
  }

  if (changedAxes.length !== 1) return null;
  const axis = changedAxes[0];
  const chain = CHAIN[axis];
  const ia = chain.indexOf(a[axis]);
  const ib = chain.indexOf(b[axis]);
  if (Math.abs(ia - ib) !== 1) return null;
  const strong = ia < ib ? a : b;
  const weak = ia < ib ? b : a;
  const equal = axis === 'exposure' && emptySigningInterface(a) && emptySigningInterface(b);
  return { axis, strong, weak, equal };
}

export const separationSuppressed = (c) => Boolean(c && c.equal);

export function goalRelationTip(c) {
  if (!c) return '';
  if (c.equal) return relationsData.legendTips.equivalence;
  if (c.axis !== 'goals') return '';
  return relationsData.selection.setRule;
}

export function allNotions(framework) {
  const classical = isClassical(framework);
  const goalSets = [];
  unforgeabilityGoals.forEach((uf) => {
    goalSets.push([uf]);
    if (classical) return;
    [...ownershipGoals, 'mb', 'nr'].forEach((g) => goalSets.push(normalizeGoals([uf, g])));
  });
  const randomnesses = classical ? ['rkoa'] : CHAIN.randomness;
  const exposures = classical ? ['empty'] : CHAIN.exposure;
  const out = [];
  goalSets.forEach((goals) => CHAIN.message.forEach((message) =>
    randomnesses.forEach((randomness) => exposures.forEach((exposure) =>
      out.push({ goals, message, randomness, exposure })))));
  return out;
}

const matchesCoordinates = (n, coords) => AXES.every((axis) => n[axis] === coords[axis]);

function goalsAllowed(goals, spec = {}) {
  if (spec.single) return goals.length === 1 && spec.single.includes(goals[0]);
  if (spec.excludes && spec.excludes.some((g) => goals.includes(g))) return false;
  if (spec.requires && !spec.requires.every((g) => goals.includes(g))) return false;
  return true;
}

export const compilerRules = () => (relationsData.compilers ? relationsData.compilers.rules : []);

export function compilerMoves(n, framework) {
  if (isClassical(framework)) return [];
  const goals = normalizeGoals(n.goals);
  const out = [];
  compilerRules().forEach((rule) => {
    if (!goalsAllowed(goals, rule.goals)) return;
    if (matchesCoordinates(n, rule.source)) out.push({ rule, dir: 'to', notion: { goals, ...rule.target } });
    if (matchesCoordinates(n, rule.target)) out.push({ rule, dir: 'from', notion: { goals, ...rule.source } });
  });
  return out;
}

export const ASYMMETRY = {
  from: { goals: ['seuf'], message: 'acma', randomness: 'rkoa', exposure: 'empty' },
  to: { goals: ['ub'], message: 'acma', randomness: 'kra', exposure: 'empty' }
};

export const isAsymmetry = (a, b) => idOf(a) === idOf(ASYMMETRY.from) && idOf(b) === idOf(ASYMMETRY.to);

export const goalDefinitions = (n) => normalizeGoals(n.goals).map((g) => defs.extendedGoals[g]);
