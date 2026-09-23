const KEY = 'ssg-theme';

export function initTheme(button, onChange = () => {}) {
  const apply = (theme) => {
    document.documentElement.dataset.theme = theme;
    button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  };

  apply(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

  button.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    onChange(next);
    try { localStorage.setItem(KEY, next); } catch (e) {  }
  });
}
