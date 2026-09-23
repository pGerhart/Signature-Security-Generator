import { defs } from '../data.js';
import {
  raw, line, sample, assign, ret, ifThen, tupleOrSingle,
  experimentLabelExtended, normalizeChoices
} from './common.js';

const UF_GOALS = ['ub', 'uuf', 'wsuf', 'ssuf', 'weuf', 'seuf'];
const QUEUE_GOALS = ['seuf', 'weuf', 'wsuf', 'ssuf', 'uuf', 'wdeo', 'sdeo', 'wceo', 'sceo', 'wueo', 'sueo'];
const WEAK_EO = ['wdeo', 'wceo', 'wueo'];
const STRONG_EO = ['sdeo', 'sceo', 'sueo'];

function oracleName(mc, rc) {
  const n = normalizeChoices(mc, rc);
  const mcTex = raw`\mathrm{${defs.messageChoices[n.mc].acronym}}`;
  const rcTex = raw`\mathrm{${defs.randomnessChoices[n.rc].acronym}}`;
  return raw`\mathcal{O}_{\mathsf{Sign}}^{(${mcTex},${rcTex})}`;
}

const oracleHandle = (mc, rc) => raw`${oracleName(mc, rc)}(\mathsf{sk},\cdot;\cdot)`;
const leakHandle = () => raw`\mathcal{O}_{L}(\cdot,\cdot)`;

function advCall(mc, rc, leakage, extraArgs = raw``) {
  const handles = [oracleHandle(mc, rc)];
  if (leakage) handles.push(leakHandle());
  const args = extraArgs ? raw`, ${extraArgs}` : raw``;
  return raw`\mathcal{A}^{${handles.join(', ')}}(1^{\lambda},\mathsf{pk}${args})`;
}

function hasSigningOracle(mc, rc) {
  const n = normalizeChoices(mc, rc);
  return !(n.mc === 'ko' && n.rc === 'ko');
}

const queueExpr = (mc, rc) => (hasSigningOracle(mc, rc) ? raw`Q` : raw`\emptyset`);
const leakQueueExpr = (mc, rc, leakage) => (leakage && hasSigningOracle(mc, rc) ? raw`Q_L` : raw`\emptyset`);
const needsQueue = (goals, leakage, mc, rc) => hasSigningOracle(mc, rc) && (leakage || goals.some((g) => QUEUE_GOALS.includes(g)));
const needsLeakStore = (leakage, mc, rc) => leakage && hasSigningOracle(mc, rc);
const hasWeakEO = (goals) => goals.some((g) => WEAK_EO.includes(g));
const hasStrongEO = (goals) => goals.some((g) => STRONG_EO.includes(g));

function learnTargets(goals, ufGoal) {
  const xs = [];
  if (goals.includes('ub')) xs.push(raw`\mathsf{sk}_{\mathsf{ub}}^*`);

  if (['seuf', 'weuf'].includes(ufGoal)) {
    xs.push(raw`m_{\mathsf{uf}}^*`, raw`\sigma_{\mathsf{uf}}^*`);
  } else if (['wsuf', 'ssuf', 'uuf'].includes(ufGoal)) {
    xs.push(raw`\sigma_{\mathsf{uf}}^*`);
  }

  if (hasWeakEO(goals)) xs.push(raw`\mathsf{sk}_{\mathsf{eo}}^*`);
  if (hasWeakEO(goals) || hasStrongEO(goals)) {
    xs.push(raw`\mathsf{pk}_{\mathsf{eo}}^*`, raw`m_{\mathsf{eo}}^*`, raw`\sigma_{\mathsf{eo}}^*`);
  }
  if (goals.includes('mb')) {
    xs.push(raw`\mathsf{pk}_{\mathsf{mb}}^*`, raw`m_{\mathsf{mb},1}^*`, raw`m_{\mathsf{mb},2}^*`, raw`\sigma_{\mathsf{mb}}^*`);
  }
  if (goals.includes('msueo')) {
    xs.push(
      raw`\mathsf{pk}_{\mathsf{ms},1}^*`, raw`\mathsf{pk}_{\mathsf{ms},2}^*`,
      raw`m_{\mathsf{ms},1}^*`, raw`m_{\mathsf{ms},2}^*`, raw`\sigma_{\mathsf{ms}}^*`
    );
  }
  if (goals.includes('nr')) xs.push(raw`\mathsf{pk}_{\mathsf{nr}}^*`, raw`\sigma_{\mathsf{nr}}^*`);
  if (goals.includes('uke')) xs.push(raw`m_{\mathsf{uke}}^*`);

  return tupleOrSingle(xs);
}

export function buildExtendedAdmin(goals, mc, rc, leakage) {
  const L = [];
  const name = raw`\text{Experiment } ${experimentLabelExtended(goals, mc, rc, leakage)}`;
  const ufGoal = goals.find((g) => UF_GOALS.includes(g)) || null;
  const qExpr = queueExpr(mc, rc);
  const qLExpr = leakQueueExpr(mc, rc, leakage);

  L.push(line(sample(raw`(\mathsf{sk},\mathsf{pk})`, raw`\mathsf{Gen}(1^{\lambda})`), 0, 'init'));

  const initVars = [];
  if (needsQueue(goals, leakage, mc, rc)) initVars.push(raw`Q`);
  if (needsLeakStore(leakage, mc, rc)) initVars.push(raw`T`, raw`Q_L`);
  if (mc === 'gcm' || mc === 'dcm') initVars.push(raw`M`);
  if (rc === 'gcr' || rc === 'dcr') initVars.push(raw`R`);
  if (initVars.length) L.push(line(assign(initVars.join(', '), raw`\emptyset`), 0, 'init'));

  if (mc === 'gcm') L.push(line(sample(raw`M`, raw`\mathcal{A}(1^{\lambda})`), 0, 'init'));
  if (rc === 'gcr') L.push(line(sample(raw`R`, raw`\mathcal{A}(1^{\lambda})`), 0, 'init'));
  if (ufGoal === 'wsuf') L.push(line(sample(raw`m_{\mathsf{uf}}^*`, raw`\mathcal{A}(1^{\lambda})`), 0, 'init'));
  if (mc === 'dcm') L.push(line(sample(raw`M`, raw`\mathcal{A}(1^{\lambda},\mathsf{pk})`), 0, 'init'));
  if (rc === 'dcr') L.push(line(sample(raw`R`, raw`\mathcal{A}(1^{\lambda},\mathsf{pk})`), 0, 'init'));
  if (ufGoal === 'ssuf') L.push(line(sample(raw`m_{\mathsf{uf}}^*`, raw`\mathcal{A}(1^{\lambda},\mathsf{pk})`), 0, 'init'));

  const extraArgs = [];
  if (goals.includes('nr')) {
    L.push(line(sample(raw`(m_{\mathsf{nr}}^*,\mathsf{aux})`, raw`\mathcal{D}(1^{\lambda},\mathsf{pk})`), 0, 'init'));
    L.push(line(sample(raw`r`, raw`\mathcal{D}_R`), 0, 'init'));
    L.push(line(assign(raw`\sigma_{\mathsf{nr}}`, raw`\mathsf{Sign}(\mathsf{sk},m_{\mathsf{nr}}^*;r)`), 0, 'init'));
    extraArgs.push(raw`\sigma_{\mathsf{nr}},\mathsf{aux}`);
  }
  if (ufGoal === 'uuf') {
    L.push(line(sample(raw`m_{\mathsf{uf}}^*`, raw`\mathcal{D}_M`), 0, 'init'));
    extraArgs.push(raw`m_{\mathsf{uf}}^*`);
  }

  const target = learnTargets(goals, ufGoal);
  if (target) L.push(line(sample(target, advCall(mc, rc, leakage, extraArgs.join(', '))), 0, 'learn'));

  if (goals.includes('uke')) {
    L.push(line(ifThen(raw`m_{\mathsf{uke}}^* \in ${qLExpr}`, ret('0')), 0, 'eval'));
  }
  if (goals.includes('ub')) {
    L.push(line(ifThen(raw`\mathsf{KCheck}(\mathsf{sk}_{\mathsf{ub}}^*,\mathsf{pk})=1`, ret('1')), 0, 'eval'));
  }
  if (ufGoal === 'seuf') {
    L.push(line(ifThen(raw`(m_{\mathsf{uf}}^*,\sigma_{\mathsf{uf}}^*)\notin ${qExpr} \wedge \mathsf{Vrfy}(\mathsf{pk},m_{\mathsf{uf}}^*,\sigma_{\mathsf{uf}}^*)=1`, ret('1')), 0, 'eval'));
  }
  if (['weuf', 'wsuf', 'ssuf', 'uuf'].includes(ufGoal)) {
    L.push(line(ifThen(raw`m_{\mathsf{uf}}^*\notin ${qExpr} \wedge \mathsf{Vrfy}(\mathsf{pk},m_{\mathsf{uf}}^*,\sigma_{\mathsf{uf}}^*)=1`, ret('1')), 0, 'eval'));
  }
  if (goals.includes('sdeo')) {
    L.push(line(ifThen(raw`\mathsf{pk}_{\mathsf{eo}}^* \neq \mathsf{pk} \wedge \sigma_{\mathsf{eo}}^* \in ${qExpr} \wedge (m_{\mathsf{eo}}^*,\sigma_{\mathsf{eo}}^*)\notin ${qExpr} \wedge \mathsf{Vrfy}(\mathsf{pk}_{\mathsf{eo}}^*,m_{\mathsf{eo}}^*,\sigma_{\mathsf{eo}}^*)=1`, ret('1')), 0, 'eval'));
  }
  if (goals.includes('wdeo')) {
    L.push(line(ifThen(raw`\mathsf{pk}_{\mathsf{eo}}^* \neq \mathsf{pk} \wedge \sigma_{\mathsf{eo}}^* \in ${qExpr} \wedge (m_{\mathsf{eo}}^*,\sigma_{\mathsf{eo}}^*)\notin ${qExpr} \wedge \mathsf{Vrfy}(\mathsf{pk}_{\mathsf{eo}}^*,m_{\mathsf{eo}}^*,\sigma_{\mathsf{eo}}^*)=1 \wedge \mathsf{KCheck}(\mathsf{sk}_{\mathsf{eo}}^*,\mathsf{pk}_{\mathsf{eo}}^*)=1`, ret('1')), 0, 'eval'));
  }
  if (goals.includes('sceo')) {
    L.push(line(ifThen(raw`\mathsf{pk}_{\mathsf{eo}}^* \neq \mathsf{pk} \wedge (m_{\mathsf{eo}}^*,\sigma_{\mathsf{eo}}^*)\in ${qExpr} \wedge \mathsf{Vrfy}(\mathsf{pk}_{\mathsf{eo}}^*,m_{\mathsf{eo}}^*,\sigma_{\mathsf{eo}}^*)=1`, ret('1')), 0, 'eval'));
  }
  if (goals.includes('wceo')) {
    L.push(line(ifThen(raw`\mathsf{pk}_{\mathsf{eo}}^* \neq \mathsf{pk} \wedge (m_{\mathsf{eo}}^*,\sigma_{\mathsf{eo}}^*)\in ${qExpr} \wedge \mathsf{Vrfy}(\mathsf{pk}_{\mathsf{eo}}^*,m_{\mathsf{eo}}^*,\sigma_{\mathsf{eo}}^*)=1 \wedge \mathsf{KCheck}(\mathsf{sk}_{\mathsf{eo}}^*,\mathsf{pk}_{\mathsf{eo}}^*)=1`, ret('1')), 0, 'eval'));
  }
  if (goals.includes('sueo')) {
    L.push(line(ifThen(raw`\mathsf{pk}_{\mathsf{eo}}^* \neq \mathsf{pk} \wedge \sigma_{\mathsf{eo}}^* \in ${qExpr} \wedge \mathsf{Vrfy}(\mathsf{pk}_{\mathsf{eo}}^*,m_{\mathsf{eo}}^*,\sigma_{\mathsf{eo}}^*)=1`, ret('1')), 0, 'eval'));
  }
  if (goals.includes('wueo')) {
    L.push(line(ifThen(raw`\mathsf{pk}_{\mathsf{eo}}^* \neq \mathsf{pk} \wedge \sigma_{\mathsf{eo}}^* \in ${qExpr} \wedge \mathsf{Vrfy}(\mathsf{pk}_{\mathsf{eo}}^*,m_{\mathsf{eo}}^*,\sigma_{\mathsf{eo}}^*)=1 \wedge \mathsf{KCheck}(\mathsf{sk}_{\mathsf{eo}}^*,\mathsf{pk}_{\mathsf{eo}}^*)=1`, ret('1')), 0, 'eval'));
  }
  if (goals.includes('nr')) {
    L.push(line(ifThen(raw`\mathsf{pk}_{\mathsf{nr}}^* \neq \mathsf{pk} \wedge \mathsf{Vrfy}(\mathsf{pk}_{\mathsf{nr}}^*,m_{\mathsf{nr}}^*,\sigma_{\mathsf{nr}}^*)=1`, ret('1')), 0, 'eval'));
  }
  if (goals.includes('mb')) {
    L.push(line(ifThen(raw`m_{\mathsf{mb},1}^* \neq m_{\mathsf{mb},2}^* \wedge \mathsf{Vrfy}(\mathsf{pk}_{\mathsf{mb}}^*,m_{\mathsf{mb},1}^*,\sigma_{\mathsf{mb}}^*)=1 \wedge \mathsf{Vrfy}(\mathsf{pk}_{\mathsf{mb}}^*,m_{\mathsf{mb},2}^*,\sigma_{\mathsf{mb}}^*)=1`, ret('1')), 0, 'eval'));
  }
  if (goals.includes('msueo')) {
    L.push(line(ifThen(raw`\mathsf{pk}_{\mathsf{ms},1}^* \neq \mathsf{pk}_{\mathsf{ms},2}^* \wedge \mathsf{Vrfy}(\mathsf{pk}_{\mathsf{ms},1}^*,m_{\mathsf{ms},1}^*,\sigma_{\mathsf{ms}}^*)=1 \wedge \mathsf{Vrfy}(\mathsf{pk}_{\mathsf{ms},2}^*,m_{\mathsf{ms},2}^*,\sigma_{\mathsf{ms}}^*)=1`, ret('1')), 0, 'eval'));
  }

  L.push(line(ret('0'), 0, 'eval'));
  return { name, lines: L };
}

function buildSignOracle(goals, mc, rc, leakage) {
  const n = normalizeChoices(mc, rc);
  const name = raw`\text{Oracle: } ${oracleName(mc, rc)}(\mathsf{sk},m;r)`;
  const L = [];

  if (!hasSigningOracle(mc, rc)) {
    L.push(line(ret(raw`\bot`)));
    return { name, lines: L };
  }

  if (n.mc === 'dcm') {
    L.push(line(ifThen(raw`M=\emptyset`, ret(raw`\bot`))));
    L.push(line(assign(raw`m`, raw`M`)));
    L.push(line(assign(raw`M`, raw`M\setminus\{m\}`)));
  } else if (n.mc === 'km' || n.mc === 'ko') {
    L.push(line(sample(raw`m`, raw`\mathcal{D}_M`)));
  }

  if (n.rc === 'dcr') {
    L.push(line(ifThen(raw`R=\emptyset`, ret(raw`\bot`))));
    L.push(line(assign(raw`r`, raw`R`)));
    L.push(line(assign(raw`R`, raw`R\setminus\{r\}`)));
  } else if (n.rc === 'kr' || n.rc === 'ko') {
    L.push(line(sample(raw`r`, raw`\mathcal{D}_R`)));
  }

  L.push(line(assign(raw`\mathsf{tr}`, raw`\mathsf{GenTr}(\mathsf{sk},m;r)`)));
  L.push(line(assign(raw`\mathsf{tsk}`, raw`\mathsf{GenTsk}(\mathsf{sk},\mathsf{tr})`)));
  L.push(line(assign(raw`\sigma`, raw`\mathsf{Sign}(\mathsf{tsk},m;\mathsf{tr})`)));
  if (needsQueue(goals, leakage, mc, rc)) L.push(line(assign(raw`Q`, raw`Q\cup\{(m,\sigma)\}`)));
  if (needsLeakStore(leakage, mc, rc)) L.push(line(assign(raw`T`, raw`T\cup\{(m,\sigma,\mathsf{tr},\mathsf{tsk})\}`)));

  const outs = [raw`\sigma`];
  if (n.mc === 'km') outs.push(raw`m`);
  if (n.rc === 'kr') outs.push(raw`r`);
  L.push(line(ret(tupleOrSingle(outs))));

  return { name, lines: L };
}

function buildLeakageOracle(mc, rc, leakage) {
  if (!leakage) return null;
  const L = [];
  if (!hasSigningOracle(mc, rc)) {
    L.push(line(ret(raw`\bot`)));
  } else {
    L.push(line(assign(raw`t`, raw`\{(m',\sigma',\mathsf{tr}',\mathsf{tsk}')\in T \mid m'=m \wedge \sigma'=\sigma\}`)));
    L.push(line(ifThen(raw`t=\emptyset`, ret(raw`\bot`))));
    L.push(line(assign(raw`Q_L`, raw`Q_L\cup\{m\}`)));
    L.push(line(assign(raw`\mathsf{tsk}'`, raw`\text{the }\mathsf{tsk}\text{ value contained in }t`)));
    L.push(line(ret(raw`\mathsf{tsk}'`)));
  }
  return { name: raw`\text{Oracle: } ${leakHandle()}`, lines: L };
}

export function buildExtendedOracles(goals, mc, rc, leakage) {
  const procs = [buildSignOracle(goals, mc, rc, leakage)];
  const leakProc = buildLeakageOracle(mc, rc, leakage);
  if (leakProc) procs.push(leakProc);
  return procs;
}

export { hasSigningOracle as extendedHasSigningOracle };
