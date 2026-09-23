export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

export function escapeAttr(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[ch]));
}

export function renderMath(tex, displayMode = false) {
  if (!window.katex) return `<code>${escapeHtml(tex)}</code>`;
  try {
    return window.katex.renderToString(tex, { throwOnError: false, displayMode });
  } catch (e) {
    return `<code>${escapeHtml(tex)}</code>`;
  }
}

export const inlineMath = (tex) => renderMath(tex, false);

function splitMath(text) {
  const parts = [];
  let buf = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '\\' && text[i + 1] === '$') { buf += '\\$'; i += 1; continue; }
    if (ch === '$') { parts.push(buf); buf = ''; continue; }
    buf += ch;
  }
  parts.push(buf);
  return parts;
}

export function renderProse(text) {
  if (!text) return '';
  return splitMath(String(text)).map((part, i) => (
    i % 2 ? renderMath(part) : escapeHtml(part).replace(/\*([^*]+)\*/g, '<em>$1</em>')
  )).join('');
}
