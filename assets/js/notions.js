import { relationsData } from './data.js';

export const AXES = ['goal', 'message', 'randomness', 'exposure'];

const laneByAxis = {};
relationsData.lanes.forEach((lane) => { laneByAxis[lane.axis] = lane; });

export const CHAIN = {
  goal: laneByAxis.goal.nodes,
  message: laneByAxis.message.nodes,
  randomness: laneByAxis.randomness.nodes,
  exposure: laneByAxis.exposure.nodes
};

export const AXIS_TITLE = {
  goal: laneByAxis.goal.title,
  message: laneByAxis.message.title,
  randomness: laneByAxis.randomness.title,
  exposure: laneByAxis.exposure.title
};

const MC_TO_NODE = { ko: 'koa', km: 'kma', gcm: 'gcma', dcm: 'dcma', acm: 'acma' };
const RC_TO_NODE = { ko: 'rkoa', kr: 'kra', gcr: 'gcra', dcr: 'dcra', acr: 'acra' };

export const idOf = (n) => AXES.map((a) => n[a]).join('~');

export function parseId(id) {
  const p = id.split('~');
  return { goal: p[0], message: p[1], randomness: p[2], exposure: p[3] };
}

export function fromState(state) {
  if (state.framework === 'classical') {
    return { goal: state.classicalGoal, message: state.classicalModel, randomness: 'rkoa', exposure: 'empty' };
  }
  return {
    goal: state.extendedUnforgeability,
    message: MC_TO_NODE[state.messageChoice],
    randomness: RC_TO_NODE[state.randomnessChoice],
    exposure: state.leakage ? 'ltsk' : 'empty'
  };
}

export const isClassicalCorner = (n) => n.randomness === 'rkoa' && n.exposure === 'empty';

const NODE_TO_MC = { koa: 'ko', kma: 'km', gcma: 'gcm', dcma: 'dcm', acma: 'acm' };
const NODE_TO_RC = { rkoa: 'ko', kra: 'kr', gcra: 'gcr', dcra: 'dcr', acra: 'acr' };

export const toSelect = (n) => ({
  messageChoice: NODE_TO_MC[n.message],
  randomnessChoice: NODE_TO_RC[n.randomness]
});

const acr = (id) => relationsData.nodes[id].acr + (relationsData.nodes[id].sub || '');

export function label(n) {
  const parts = [acr(n.message)];
  if (n.randomness !== 'rkoa' || n.exposure !== 'empty') parts.push(acr(n.randomness));
  if (n.exposure !== 'empty') parts.push(acr(n.exposure));
  return `${acr(n.goal)}\n(${parts.join(', ')})`;
}

export const flatLabel = (n) => label(n).replace('\n', ' ');

export function neighbours(n) {
  const out = [];
  AXES.forEach((axis) => {
    const chain = CHAIN[axis];
    const i = chain.indexOf(n[axis]);
    [i - 1, i + 1].forEach((j) => {
      if (j >= 0 && j < chain.length) out.push({ ...n, [axis]: chain[j] });
    });
  });
  if (n.message === 'acma') {
    if (n.randomness === 'rkoa') out.push({ ...n, randomness: 'acra' });
    if (n.randomness === 'acra') out.push({ ...n, randomness: 'rkoa' });
    if (n.exposure === 'empty') out.push({ ...n, exposure: 'ltsk' });
    if (n.exposure === 'ltsk') out.push({ ...n, exposure: 'empty' });
  }
  if (idOf(n) === idOf(ASYMMETRY.from)) out.push(ASYMMETRY.to);
  if (idOf(n) === idOf(ASYMMETRY.to)) out.push(ASYMMETRY.from);
  const seen = new Set([idOf(n)]);
  return out.filter((m) => {
    const id = idOf(m);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function cover(a, b) {
  let axis = null;
  for (const ax of AXES) {
    if (a[ax] === b[ax]) continue;
    if (axis) return null;
    axis = ax;
  }
  if (!axis) return null;
  const chain = CHAIN[axis];
  const ia = chain.indexOf(a[axis]);
  const ib = chain.indexOf(b[axis]);
  if (Math.abs(ia - ib) !== 1) return null;
  return { axis, strong: ia < ib ? a : b, weak: ia < ib ? b : a };
}

export const separationSuppressed = (c) =>
  c.axis === 'goal' && c.strong.message === 'koa' && c.strong.goal === 'seuf' && c.weak.goal === 'weuf';

export function wrapperLift(a, b) {
  if (a.message !== 'acma' || b.message !== 'acma' || a.goal !== b.goal) return null;
  if (a.exposure === b.exposure && a.randomness === 'rkoa' && b.randomness === 'acra') return 'GenTr';
  if (a.randomness === b.randomness && a.exposure === 'empty' && b.exposure === 'ltsk') return 'GenTsk';
  return null;
}

export function allNotions() {
  const out = [];
  CHAIN.goal.forEach((goal) => CHAIN.message.forEach((message) =>
    CHAIN.randomness.forEach((randomness) => CHAIN.exposure.forEach((exposure) =>
      out.push({ goal, message, randomness, exposure })))));
  return out;
}

export const ASYMMETRY = {
  from: { goal: 'seuf', message: 'acma', randomness: 'rkoa', exposure: 'empty' },
  to: { goal: 'ub', message: 'acma', randomness: 'kra', exposure: 'empty' }
};

export const isAsymmetry = (a, b) =>
  (idOf(a) === idOf(ASYMMETRY.from) && idOf(b) === idOf(ASYMMETRY.to));
