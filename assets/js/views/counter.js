import { goalsData, modelsData } from '../data.js';
import { escapeHtml, escapeAttr } from '../tex.js';

export function factors() {
  const c = goalsData.controls;
  const out = [
    { label: c.extendedUnforgeability, n: goalsData.extendedUnforgeability.length },
    { label: c.extendedOwnership, n: goalsData.extendedOwnership.length + 1 }
  ];
  goalsData.extendedAdditional.forEach((entry) => out.push({ label: entry.label, n: 2 }));
  out.push({ label: c.messageChoice, n: modelsData.messageChoices.length });
  out.push({ label: c.randomnessChoice, n: modelsData.randomnessChoices.length });
  out.push({ label: modelsData.leakage.label, n: 2 });
  return out;
}

export const total = () => factors().reduce((acc, f) => acc * f.n, 1);

export function renderCount(target) {
  const list = factors();
  const terms = list.map((f) =>
    `<span class="hero-factor" title="${escapeAttr(f.label)}" data-tip="${escapeAttr(f.label)}">${f.n}</span>`
  ).join('<span class="hero-times" aria-hidden="true">&times;</span>');
  target.innerHTML = `<span class="hero-count-figure">${total().toLocaleString('en-US')}</span>
    <span class="hero-count-noun">${escapeHtml(target.dataset.noun)}</span>
    <span class="hero-count-terms">${terms}</span>`;
}
