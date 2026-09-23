import { defs } from '../data.js';
import { raw, line, sample, assign, ret, ifThen, experimentLabelClassical } from './common.js';

const hasSigningOracle = (model) => model !== 'koa';
const queueExpr = (model) => (hasSigningOracle(model) ? raw`Q` : raw`\emptyset`);

export function buildClassicalAdmin(goal, model) {
  const L = [];
  const am = raw`\mathrm{${defs.classicalModels[model].acronym}}`;
  const oracleName = raw`\mathcal{O}_{\mathsf{Sign}}^{${am}}(\mathsf{sk},\cdot)`;
  const advCall = raw`\mathcal{A}^{${oracleName}}(1^{\lambda},\mathsf{pk})`;
  const name = raw`\text{Experiment } ${experimentLabelClassical(goal, model)}`;
  const qExpr = queueExpr(model);

  L.push(line(sample(raw`(\mathsf{sk},\mathsf{pk})`, raw`\mathsf{Gen}(1^{\lambda})`), 0, 'init'));

  const initVars = [];
  if (hasSigningOracle(model)) initVars.push(raw`Q`);
  if (model === 'gcma' || model === 'dcma') initVars.push(raw`M`);
  if (initVars.length) L.push(line(assign(initVars.join(', '), raw`\emptyset`), 0, 'init'));

  if (model === 'gcma') L.push(line(sample(raw`M`, raw`\mathcal{A}(1^{\lambda})`), 0, 'init'));
  if (goal === 'wsuf') L.push(line(sample(raw`m^*`, raw`\mathcal{A}(1^{\lambda})`), 0, 'init'));
  if (model === 'dcma') L.push(line(sample(raw`M`, raw`\mathcal{A}(1^{\lambda}, \mathsf{pk})`), 0, 'init'));
  if (goal === 'ssuf') L.push(line(sample(raw`m^*`, raw`\mathcal{A}(1^{\lambda}, \mathsf{pk})`), 0, 'init'));

  if (goal === 'uuf') {
    L.push(line(sample(raw`m^*`, raw`\mathcal{D}_M`), 0, 'learn'));
    L.push(line(sample(raw`\sigma^*`, raw`\mathcal{A}^{${oracleName}}(1^{\lambda},\mathsf{pk},m^*)`), 0, 'learn'));
  } else if (goal === 'ub') {
    L.push(line(sample(raw`\mathsf{sk}^*`, advCall), 0, 'learn'));
  } else if (goal === 'ssuf' || goal === 'wsuf') {
    L.push(line(sample(raw`\sigma^*`, advCall), 0, 'learn'));
  } else {
    L.push(line(sample(raw`(m^*,\sigma^*)`, advCall), 0, 'learn'));
  }

  if (goal === 'ub') {
    L.push(line(ifThen(raw`\mathsf{KCheck}(\mathsf{sk}^*,\mathsf{pk})=1`, ret('1')), 0, 'eval'));
  } else if (goal === 'seuf') {
    L.push(line(ifThen(raw`(m^*,\sigma^*)\notin ${qExpr} \wedge \mathsf{Vrfy}(\mathsf{pk},m^*,\sigma^*)=1`, ret('1')), 0, 'eval'));
  } else {
    L.push(line(ifThen(raw`m^*\notin ${qExpr} \wedge \mathsf{Vrfy}(\mathsf{pk},m^*,\sigma^*)=1`, ret('1')), 0, 'eval'));
  }

  L.push(line(ret('0'), 0, 'eval'));
  return { name, lines: L };
}

export function buildClassicalOracle(model) {
  const am = raw`\mathrm{${defs.classicalModels[model].acronym}}`;
  const name = raw`\text{Oracle: } \mathcal{O}_{\mathsf{Sign}}^{${am}}(\mathsf{sk},m)`;

  if (model === 'koa') return { name, lines: [line(ret(raw`\bot`))] };

  const L = [];
  if (model === 'kma') {
    L.push(line(sample(raw`m`, raw`\mathcal{D}_M`)));
  } else if (model === 'gcma' || model === 'dcma') {
    L.push(line(ifThen(raw`M=\emptyset`, ret(raw`\bot`))));
    L.push(line(assign(raw`m`, raw`M`)));
    L.push(line(assign(raw`M`, raw`M\setminus\{m\}`)));
  }
  L.push(line(sample(raw`r`, raw`\mathcal{D}_R`)));
  L.push(line(assign(raw`\sigma`, raw`\mathsf{Sign}(\mathsf{sk},m;r)`)));
  L.push(line(assign(raw`Q`, raw`Q\cup\{(m,\sigma)\}`)));
  L.push(line(ret(raw`(m,\sigma)`)));

  return { name, lines: L };
}
