import { renderMath } from '../tex.js';

const PHASES = [
  { key: 'init', label: 'Initialization' },
  { key: 'learn', label: 'Learning' },
  { key: 'eval', label: 'Evaluation' }
];

const procLine = (ln, n) => `<div class="proc-line">
  <span class="proc-line-no">${n}</span>
  <span class="proc-line-code" tabindex="-1" style="--indent:${ln.indent || 0}">${renderMath(ln.tex)}</span>
</div>`;

function renderProcedure(proc, variant) {
  const groups = [];
  proc.lines.forEach((ln, i) => {
    const last = groups[groups.length - 1];
    if (last && last.phase === ln.phase) last.lines.push(procLine(ln, i + 1));
    else groups.push({ phase: ln.phase, lines: [procLine(ln, i + 1)] });
  });
  const body = groups.map((g) => `<div class="proc-group ${g.phase ? `phase-${g.phase}` : ''}">${g.lines.join('')}</div>`).join('');
  return `<div class="proc-box ${variant}">
    <div class="proc-head">${renderMath(proc.name)}</div>
    <div class="proc-body">${body}</div>
  </div>`;
}

const renderLegend = () => `<div class="legend">${PHASES.map((p) => `
  <span class="legend-item"><span class="legend-swatch phase-${p.key}"></span>${p.label}</span>`).join('')}</div>`;

export function renderDefinition(target, model) {
  target.innerHTML = `<div class="definition">
    <p class="definition-kicker">Definition</p>
    <p class="definition-body">${model.sentence}</p>
    <div class="display-math">${renderMath(model.probability, true)}</div>
    <p class="definition-body">${model.tail}</p>
  </div>`;
}

export function renderFigure(target, model) {
  const oracles = model.oracles.map((proc) => renderProcedure(proc, 'proc-oracle')).join('');
  target.innerHTML = `<div class="figure">
    ${renderProcedure(model.admin, 'proc-experiment')}
    ${renderLegend()}
    ${oracles}
  </div>`;
}
