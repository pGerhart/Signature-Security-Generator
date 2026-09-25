import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function appData() {
  const out = mkdtempSync(join(tmpdir(), 'sigsec-test-'));
  try {
    execFileSync('hugo', ['--quiet', '--destination', out], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    const m = html.match(/<script id="app-data" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) throw new Error('no app-data block in the rendered page');
    return m[1];
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

const json = appData();
globalThis.document = { getElementById: () => ({ textContent: json }) };
globalThis.window = { location: { hash: '', pathname: '/' }, history: { replaceState() {} } };

const data = await import(`${ROOT}/assets/js/data.js`);
const notions = await import(`${ROOT}/assets/js/notions.js`);
const { build, selectedGoals } = await import(`${ROOT}/assets/js/generator/index.js`);
const { state, readHash } = await import(`${ROOT}/assets/js/state.js`);

const { parseOwnership, toggleOwnership, ownershipGoals } = data;
const eoCount = (goals) => goals.filter((g) => ownershipGoals.includes(g)).length;

let failed = 0;
let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`  FAIL ${name}\n       ${e.message}`);
  }
}
function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${what}expected ${b}, got ${a}`);
}
const group = (name) => console.log(`\n${name}`);

const extended = (over = {}) => ({
  framework: 'extended',
  extendedUnforgeability: 'seuf',
  extendedOwnership: '',
  extendedMB: false,
  extendedNR: false,
  extendedUKE: false,
  messageChoice: 'acm',
  randomnessChoice: 'acr',
  leakage: false,
  ...over
});

group('selecting a new exclusive ownership goal replaces the previous one');
check('the select hands one key over and the previous one is gone', () => {

  let s = extended({ extendedOwnership: 'sceo' });
  eq(selectedGoals(s).filter((g) => ownershipGoals.includes(g)), ['sceo']);
  s = extended({ extendedOwnership: 'wdeo' });
  eq(selectedGoals(s).filter((g) => ownershipGoals.includes(g)), ['wdeo']);
});
check('clicking another goal in the chain view replaces, never adds', () => {
  eq(toggleOwnership('sceo', 'msueo'), 'msueo');
  eq(toggleOwnership('', 'wueo'), 'wueo');
  eq(parseOwnership(toggleOwnership('sceo', 'msueo')), 'msueo');
});

group('selecting None removes the exclusive ownership goal');
check('the empty value is no goal', () => {
  eq(parseOwnership(''), '');
  eq(selectedGoals(extended({ extendedOwnership: '' })), ['seuf']);
});
check('clicking the selected goal again clears the category', () => {
  eq(toggleOwnership('sueo', 'sueo'), '');
});

group('message bounding and non-resignability stay independent');
check('both combine with an exclusive ownership goal and with none', () => {
  eq(selectedGoals(extended({ extendedOwnership: 'sueo', extendedMB: true })), ['seuf', 'sueo', 'mb']);
  eq(selectedGoals(extended({ extendedOwnership: 'sueo', extendedNR: true })), ['seuf', 'sueo', 'nr']);
  eq(selectedGoals(extended({ extendedOwnership: 'sueo', extendedMB: true, extendedNR: true })),
    ['seuf', 'sueo', 'mb', 'nr']);
  eq(selectedGoals(extended({ extendedMB: true, extendedNR: true })), ['seuf', 'mb', 'nr']);
});
check('toggling one leaves the other and the ownership goal alone', () => {
  const both = extended({ extendedOwnership: 'wceo', extendedMB: true, extendedNR: true });
  eq(selectedGoals({ ...both, extendedMB: false }), ['seuf', 'wceo', 'nr']);
  eq(selectedGoals({ ...both, extendedNR: false }), ['seuf', 'wceo', 'mb']);
});

group('generated definitions hold at most one exclusive ownership goal');
check('every extended selection, including legacy multi-goal state', () => {
  const values = ['', ...ownershipGoals, 'sceo,sdeo', 'wceo,wdeo', 'wdeo,sceo,msueo', 'sueo,wueo,bogus'];
  let n = 0;
  values.forEach((o) => [false, true].forEach((mb) => [false, true].forEach((nr) => [false, true].forEach((uke) => {
    const model = build(extended({ extendedOwnership: o, extendedMB: mb, extendedNR: nr, extendedUKE: uke }));
    n += 1;
    if (eoCount(model.goals) > 1) throw new Error(`${o} generated ${JSON.stringify(model.goals)}`);
    if (o === '' && eoCount(model.goals) !== 0) throw new Error('None generated an ownership goal');
  }))));
  if (n !== values.length * 8) throw new Error(`only ${n} selections covered`);
});

group('relation nodes never hold more than one exclusive ownership goal');
check('the whole reachable extended neighbourhood', () => {
  const seeds = ['', ...ownershipGoals].map((o) => ({
    goals: notions.normalizeGoals(['seuf', o, 'mb', 'nr'].filter(Boolean)),
    message: 'acma',
    randomness: 'acra',
    exposure: 'ltsk'
  }));
  const seen = new Set();
  const queue = [...seeds];
  while (queue.length) {
    const n = queue.pop();
    const id = notions.idOf(n);
    if (seen.has(id)) continue;
    seen.add(id);
    if (eoCount(n.goals) > 1) throw new Error(`node ${notions.flatLabel(n)} holds ${eoCount(n.goals)} ownership goals`);
    notions.neighbours(n, 'extended').forEach((m) => queue.push(m));
  }
  if (seen.size < 100) throw new Error(`only ${seen.size} nodes walked, the graph should be larger`);
});
check('the searchable notions', () => {
  ['classical', 'extended'].forEach((framework) => {
    notions.allNotions(framework).forEach((n) => {
      if (eoCount(n.goals) > 1) throw new Error(`${framework}: ${notions.flatLabel(n)}`);
    });
  });
});
check('every relation named by requirement is still reachable in one step', () => {
  const at = (o) => ({ goals: notions.normalizeGoals(['seuf', o].filter(Boolean)), message: 'acma', randomness: 'acra', exposure: 'empty' });
  const reaches = (from, to) => notions.neighbours(at(from), 'extended')
    .some((m) => notions.idOf(m) === notions.idOf(at(to)));
  [['msueo', 'sueo'], ['sueo', 'sceo'], ['sueo', 'sdeo'], ['sueo', 'wueo'],
    ['sceo', 'wceo'], ['sdeo', 'wdeo'], ['wueo', 'wceo'], ['wueo', 'wdeo']].forEach(([a, b]) => {
    if (!reaches(a, b)) throw new Error(`${a} does not reach ${b}`);
    if (!reaches(b, a)) throw new Error(`${b} does not reach ${a}`);
  });
});
check('the conjunction equivalences are kept in the data but never built as a node', () => {
  const eqs = data.relationsData.goalEquivalences;
  eq(eqs.length, 2, 'the two equivalences must stay in the data: ');
  eqs.forEach(({ single, conjunction }) => {

    const closure = notions.goalClosure([single]);
    conjunction.forEach((g) => { if (!closure.includes(g)) throw new Error(`${single} lost ${g}`); });
    const n = { goals: notions.normalizeGoals(['seuf', single]), message: 'acma', randomness: 'acra', exposure: 'empty' };
    notions.neighbours(n, 'extended').forEach((m) => {
      if (conjunction.every((g) => m.goals.includes(g))) throw new Error(`a neighbour of ${single} holds ${conjunction}`);
    });
  });
});

group('persisted multi-goal state is normalized');
check('a named conjunction collapses to the goal it equals', () => {
  eq(parseOwnership('sceo,sdeo'), 'sueo');
  eq(parseOwnership('wceo,wdeo'), 'wueo');
  eq(parseOwnership(['sdeo', 'sceo']), 'sueo');
});
check('anything else keeps the strongest, by the documented order', () => {
  eq(parseOwnership('wdeo,sceo'), 'sceo');
  eq(parseOwnership('wdeo,sdeo,wceo,sceo,wueo,sueo,msueo'), 'msueo');
  eq(parseOwnership('wceo,wdeo,sceo'), 'wueo');
  eq(parseOwnership('sueo,wueo'), 'sueo');
});
check('unknown and empty values are dropped', () => {
  eq(parseOwnership('bogus'), '');
  eq(parseOwnership('bogus,wceo'), 'wceo');
  eq(parseOwnership(undefined), '');
  eq(parseOwnership(','), '');
});
check('a legacy hash loads as one goal', () => {
  const load = (hash) => {
    window.location.hash = hash;
    state.extendedOwnership = '';
    readHash({ framework: ['classical', 'extended'] });
    return state.extendedOwnership;
  };
  eq(load('#f=extended&o=sceo%2Csdeo'), 'sueo');
  eq(load('#f=extended&o=wdeo%2Csceo'), 'sceo');
  eq(load('#f=extended&o=msueo'), 'msueo');
  eq(load('#f=extended&o=bogus'), '');
  eq(load('#f=extended'), '');
});

group('the empty signing interface follows the paper');
const koa = (goals) => ({ goals: notions.normalizeGoals(goals), message: 'koa', randomness: 'rkoa', exposure: 'empty' });
check('without NR, sEUF, wEUF, and sSUF describe the same experiment', () => {
  eq(notions.effectiveGoals(koa(['ssuf'])), ['seuf']);
  eq(notions.effectiveGoals(koa(['weuf'])), ['seuf']);
  eq(notions.koaIdentified(koa(['seuf'])), ['seuf', 'weuf', 'ssuf']);
});
check('with NR, only sEUF and wEUF coincide', () => {
  eq(notions.effectiveGoals(koa(['ssuf', 'nr'])), ['ssuf', 'nr']);
  eq(notions.effectiveGoals(koa(['weuf', 'nr'])), ['seuf', 'nr']);
  eq(notions.koaIdentified(koa(['seuf', 'nr'])), ['seuf', 'weuf']);
});
check('queue-based ownership goals stay vacuous, with or without NR', () => {
  eq(notions.effectiveGoals(koa(['seuf', 'sceo'])), ['seuf']);
  eq(notions.effectiveGoals(koa(['seuf', 'sceo', 'nr'])), ['seuf', 'nr']);
});

group('compiler edges follow the scope of the compiler theorems');
const at = (goals, message, randomness, exposure) => ({ goals: notions.normalizeGoals(goals), message, randomness, exposure });
const moves = (n, framework = 'extended') => notions.compilerMoves(n, framework)
  .map((m) => `${m.rule.id}:${m.dir}:${notions.idOf(m.notion)}`).sort();
check('a single unforgeability goal under aCMA reaches all three compiled notions', () => {
  const n = at(['seuf'], 'acma', 'rkoa', 'empty');
  eq(moves(n), [
    `composition:to:${notions.idOf(at(['seuf'], 'acma', 'acra', 'ltsk'))}`,
    `gentr:to:${notions.idOf(at(['seuf'], 'acma', 'acra', 'empty'))}`,
    `gentsk:to:${notions.idOf(at(['seuf'], 'acma', 'rkoa', 'ltsk'))}`
  ].sort());
});
check('the key-exposure compiler excludes UB and goal sets with more than one goal', () => {
  eq(moves(at(['ub'], 'acma', 'rkoa', 'empty')).map((m) => m.split(':')[0]), ['gentr']);
  eq(moves(at(['seuf', 'msueo'], 'acma', 'rkoa', 'empty')).map((m) => m.split(':')[0]), ['gentr']);
});
check('a goal set with NR uses the non-resignability route of the randomness compiler', () => {
  eq(moves(at(['seuf', 'nr'], 'acma', 'rkoa', 'empty')).map((m) => m.split(':')[0]), ['gentr-nr']);
});
check('compiled notions point back to their source', () => {
  eq(moves(at(['seuf'], 'acma', 'acra', 'ltsk')), [`composition:from:${notions.idOf(at(['seuf'], 'acma', 'rkoa', 'empty'))}`]);
});
check('no compiler applies outside aCMA with honest randomness, or in the classical framework', () => {
  eq(moves(at(['seuf'], 'kma', 'rkoa', 'empty')), []);
  eq(moves(at(['seuf'], 'acma', 'kra', 'empty')), []);
  eq(moves(at(['seuf'], 'acma', 'rkoa', 'empty'), 'classical'), []);
});

group('every theorem the code names exists in the data');
check('compiler rules, code references, and card ids resolve', () => {
  const R = data.relationsData;
  const ids = new Set([...R.theorems, ...R.beyond.theorems, ...R.compilers.theorems, ...R.additional.theorems].map((t) => t.id));
  R.compilers.rules.forEach((r) => { if (!ids.has(r.theorem)) throw new Error(`rule ${r.id} names ${r.theorem}`); });
  ['thm:sec_defs_relations', 'ex:schnorr-kra'].forEach((id) => { if (!ids.has(id)) throw new Error(`missing ${id}`); });
});
check('every lane step has an edge justification', () => {
  const R = data.relationsData;
  R.lanes.forEach((lane) => lane.nodes.slice(0, -1).forEach((from, i) => {
    const to = lane.nodes[i + 1];
    const e = R.edges.find((x) => x.from === from && x.to === to);
    if (!e || !e.impl || !e.sep) throw new Error(`${from} -> ${to} lacks a justification`);
  }));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
