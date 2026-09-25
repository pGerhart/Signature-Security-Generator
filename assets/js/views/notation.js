import { notationData, goalsData, modelsData } from '../data.js';
import { renderMath, renderProse } from '../tex.js';

const row = (item) => `<div class="notation-row">
  <dt class="notation-symbol">${renderMath(item.tex)}</dt>
  <dd class="notation-desc">${renderProse(item.description)}</dd>
</div>`;

const fromVocabulary = (entries) => entries.map((meta) => row({
  tex: `\\mathrm{${meta.acronym}}`,
  description: meta.definition ? `${meta.label}. ${meta.definition}` : meta.label
}));

const section = (title, rows, note) => `<section class="notation-section">
  <h3 class="notation-title">${title}</h3>
  ${note ? `<p class="notation-note">${renderProse(note)}</p>` : ''}
  <dl class="notation-list">${rows.join('')}</dl>
</section>`;

export function renderNotation(target, state) {
  const t = notationData.sectionTitles;
  const algorithms = notationData.commonAlgorithms.slice();
  const variables = notationData.commonVariables.slice();
  let right;

  if (state.framework === 'classical') {
    right = [
      section(t.classicalGoals, fromVocabulary(goalsData.classicalGoals)),
      section(t.classicalModels, fromVocabulary(modelsData.classicalModels))
    ];
  } else {
    algorithms.push(...notationData.extendedAlgorithms);
    variables.push(...notationData.extendedVariables);
    const goals = goalsData.extendedGoals.filter((entry) => entry.key !== 'uke');
    const restrictions = goalsData.extendedGoals.filter((entry) => entry.key === 'uke');
    right = [
      section(t.extendedGoals, fromVocabulary(goals)),
      section(t.restrictions, fromVocabulary(restrictions)),
      section(t.choices, fromVocabulary(modelsData.messageChoices).concat(fromVocabulary(modelsData.randomnessChoices)), notationData.choiceNote),
      section(t.leakage, notationData.leakageItems.map(row))
    ];
  }

  const left = [
    section(t.algorithms, algorithms.map(row)),
    section(t.variables, variables.map(row))
  ];

  target.innerHTML = `<div class="notation-columns">
    <div class="notation-column">${left.join('')}</div>
    <div class="notation-column">${right.join('')}</div>
  </div>`;
}
