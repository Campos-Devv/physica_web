export function createLoadingOverlay(target, {
  message = '',        // optional helper text (empty = dots only)
  dark = false,        // optional dark backdrop
  dotsOnly = true,     // render only dots (no white box)
  color = null,              // custom hex (overrides class)
  colorClass = 'text-primary'// Tailwind class, e.g. 'text-primary', 'text-blue-600'
} = {}) {
  if (!target) throw new Error('createLoadingOverlay: target element is required');

  const isBody = target === document.body || target === document.documentElement;

  if (!isBody && getComputedStyle(target).position === 'static') {
    target.classList.add('relative');
  }

  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay hidden' +
    (dark ? ' loading-overlay--dark' : '') +
    (isBody ? ' loading-overlay--fullscreen' : '');
  if (colorClass) {
    overlay.classList.add(colorClass);
    overlay.dataset.colorClass = colorClass;
  }

  const dotsHtml = `
    <div class="dots" aria-hidden="true">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  `;

  overlay.innerHTML = `
    <div class="loading-content" role="status" aria-live="polite" aria-busy="true">
      ${dotsHtml}
      ${message ? `<p class="loading-text">${message}</p>` : ''}   
    </div>
  `;

  if (color) overlay.style.setProperty('--loading-dot', color);

  target.appendChild(overlay);

  return {
    show: () => overlay.classList.remove('hidden'),
    hide: () => overlay.classList.add('hidden'),
    destroy: () => overlay.remove(),
    setMessage: (text) => {
      const el = overlay.querySelector('.loading-text');
      if (el) el.textContent = text ?? '';
      else if (text) {
        const p = document.createElement('p');
        p.className = 'loading-text';
        p.textContent = text;
        overlay.querySelector('.loading-content')?.appendChild(p);
      }
    },
    setColor: (c) => overlay.style.setProperty('--loading-dot', c),
    setColorClass: (cls) => {
      const prev = overlay.dataset.colorClass;
      if (prev) overlay.classList.remove(prev);
      if (cls) {
        overlay.classList.add(cls);
        overlay.dataset.colorClass = cls;
      } else {
        delete overlay.dataset.colorClass;
      }
    },
    el: overlay
  };
}