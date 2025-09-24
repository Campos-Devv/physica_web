// Reusable toast-style notification

const STYLES = {
  success: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-400', icon: 'fas fa-check-circle text-green-400' },
  error:   { bg: 'bg-red-50',   text: 'text-red-800',   border: 'border-red-400',   icon: 'fas fa-exclamation-circle text-red-400' },
  warning: { bg: 'bg-yellow-50',text: 'text-yellow-800',border: 'border-yellow-400',icon: 'fas fa-exclamation-triangle text-yellow-400' },
  info:    { bg: 'bg-blue-50',  text: 'text-blue-800',  border: 'border-blue-400',  icon: 'fas fa-info-circle text-blue-400' },
};

function buildFallbackNode(message, style) {
  const node = document.createElement('div');
  node.id = 'notification';
  node.setAttribute('role', 'alert');
  node.setAttribute('aria-live', 'polite');
  node.className = [
    'fixed top-4 right-4 z-50 max-w-md w-[22rem] shadow-lg rounded border',
    'transition-transform duration-300 transform',
    'p-4 flex items-start gap-3',
    style.bg, style.text, style.border
  ].join(' ');

  const icon = document.createElement('i');
  icon.className = `icon ${style.icon}`;
  node.appendChild(icon);

  const span = document.createElement('span');
  span.className = 'message flex-1';
  span.textContent = message;
  node.appendChild(span);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'close-btn ml-2 text-sm opacity-70 hover:opacity-100';
  btn.setAttribute('aria-label', 'Close notification');
  btn.innerHTML = '<i class="fas fa-times"></i>';
  btn.addEventListener('click', () => {
    node.classList.add('translate-x-full');
    setTimeout(() => node.remove(), 300);
  });
  node.appendChild(btn);

  return node;
}

/**
 * Show a notification toast
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {{duration?:number,id?:string,container?:HTMLElement}} options
 */
export function showNotification(message, type = 'info', options = {}) {
  const { duration = 5000, id = 'notification', container = document.body } = options;
  const style = STYLES[type] || STYLES.info;

  // Remove existing with same id
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  // Try template first
  let node = null;
  const tpl = document.getElementById('tpl-notification');
  if (tpl?.content?.firstElementChild) {
    node = tpl.content.firstElementChild.cloneNode(true);
    node.id = id;
    node.classList.add(style.bg, style.text, style.border);
    node.setAttribute('role', 'alert');
    node.setAttribute('aria-live', 'polite');

    const iconEl = node.querySelector('.icon');
    const msgEl = node.querySelector('.message');
    const closeBtn = node.querySelector('.close-btn');

    if (iconEl) iconEl.className = `icon ${style.icon} mr-2`;
    if (msgEl) msgEl.textContent = message;
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        node.classList.add('translate-x-full');
        setTimeout(() => node.remove(), 300);
      });
    }
  } else {
    node = buildFallbackNode(message, style);
  }

  container.appendChild(node);
  // Auto-hide
  if (duration > 0) {
    setTimeout(() => {
      if (!node.parentNode) return;
      node.classList.add('translate-x-full');
      setTimeout(() => node.parentNode && node.parentNode.removeChild(node), 300);
    }, duration);
  }

  return node;
}

// Optional: attach to window for non-ES module scripts
if (typeof window !== 'undefined') {
  window.showNotification = window.showNotification || showNotification;
}