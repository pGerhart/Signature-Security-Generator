import { renderProse } from './tex.js';

const MARGIN = 14;
let tip = null;

function place(x, y) {
  const box = tip.getBoundingClientRect();
  const right = x + MARGIN + box.width;
  const bottom = y + MARGIN + box.height;

  const left = right > window.innerWidth - 8 ? x - MARGIN - box.width : x + MARGIN;
  const top = bottom > window.innerHeight - 8 ? y - MARGIN - box.height : y + MARGIN;
  tip.style.left = `${Math.max(8, left)}px`;
  tip.style.top = `${Math.max(8, top)}px`;
}

export function showTooltip(text, x, y) {
  if (!tip || !text) return;
  tip.innerHTML = renderProse(text);
  tip.classList.add('is-visible');
  tip.setAttribute('aria-hidden', 'false');
  place(x, y);
}

export function moveTooltip(x, y) {
  if (tip && tip.classList.contains('is-visible')) place(x, y);
}

export function hideTooltip() {
  if (!tip) return;
  tip.classList.remove('is-visible');
  tip.setAttribute('aria-hidden', 'true');
}

export function initTooltip(root) {
  tip = document.getElementById('tooltip');
  if (!tip) return;

  const source = (target) => (target.closest ? target.closest('[data-tip]') : null);

  root.addEventListener('mouseover', (ev) => {
    const el = source(ev.target);
    if (el) showTooltip(el.getAttribute('data-tip'), ev.clientX, ev.clientY);
  });
  root.addEventListener('mousemove', (ev) => moveTooltip(ev.clientX, ev.clientY));
  root.addEventListener('mouseout', (ev) => { if (source(ev.target)) hideTooltip(); });
  root.addEventListener('focusin', (ev) => {
    const el = source(ev.target);
    if (!el) return;
    const box = el.getBoundingClientRect();
    showTooltip(el.getAttribute('data-tip'), box.left, box.bottom);
  });
  root.addEventListener('focusout', hideTooltip);
  window.addEventListener('scroll', hideTooltip, { passive: true });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') hideTooltip(); });
}
