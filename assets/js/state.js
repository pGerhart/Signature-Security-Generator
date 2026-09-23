const listeners = [];

const DEFAULTS = {
  framework: 'classical',
  classicalGoal: 'seuf',
  classicalModel: 'acma',
  extendedUnforgeability: 'seuf',
  extendedOwnership: '',
  extendedMB: false,
  extendedNR: false,
  extendedUKE: false,
  messageChoice: 'acm',
  randomnessChoice: 'acr',
  leakage: false,
  view: 'visual',
  graphMode: 'network'
};

export const state = { ...DEFAULTS };

const PARAMS = {
  f: 'framework',
  g: 'classicalGoal',
  m: 'classicalModel',
  u: 'extendedUnforgeability',
  o: 'extendedOwnership',
  mb: 'extendedMB',
  nr: 'extendedNR',
  uke: 'extendedUKE',
  mc: 'messageChoice',
  rc: 'randomnessChoice',
  lk: 'leakage',
  v: 'view',
  gm: 'graphMode'
};

const isFlag = (field) => typeof DEFAULTS[field] === 'boolean';

export function readHash(valid) {
  let q;
  try {
    q = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  } catch (e) {
    return;
  }
  Object.entries(PARAMS).forEach(([param, field]) => {
    const key = q.has(param) ? param : (q.has(field) ? field : null);
    if (!key) return;
    const value = q.get(key);
    if (isFlag(field)) { state[field] = value === '1'; return; }
    if (!valid[field] || valid[field].includes(value)) state[field] = value;
  });
}

export function writeHash() {
  const q = new URLSearchParams();
  Object.entries(PARAMS).forEach(([param, field]) => {
    const value = state[field];
    if (value === DEFAULTS[field]) return;
    q.set(param, isFlag(field) ? (value ? '1' : '0') : value);
  });
  const hash = q.toString();
  window.history.replaceState(null, '', hash ? `#${hash}` : window.location.pathname);
}

export function onChange(fn) { listeners.push(fn); }

export function commit() {
  writeHash();
  listeners.forEach((fn) => fn(state));
}
