function fallbackCopy(text) {
  const holder = document.createElement('textarea');
  holder.value = text;
  holder.setAttribute('readonly', '');
  holder.style.position = 'fixed';
  holder.style.opacity = '0';
  document.body.appendChild(holder);
  holder.select();
  document.execCommand('copy');
  document.body.removeChild(holder);
}

export function initCopy(root, status, source) {
  root.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('.btn-copy');
    if (!btn) return;
    const text = source(btn.dataset.target);
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      fallbackCopy(text);
    }
    status.textContent = 'Copied.';
    btn.classList.add('is-done');
    setTimeout(() => {
      if (status.textContent === 'Copied.') status.textContent = '';
      btn.classList.remove('is-done');
    }, 1500);
  });
}
