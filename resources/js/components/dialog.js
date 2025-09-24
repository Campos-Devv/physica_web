// Global inline-style theme (no CSS classes required)
let DIALOG_THEME = {
  button: {
    base: 'border-radius:0.5rem;padding:0.625rem 1rem;font-size:0.875rem;font-weight:600;',
    primary: 'background-color:#2563eb;color:#ffffff;',   // blue
    secondary: 'background-color:#e5e7eb;color:#111827;', // gray
    danger: 'background-color:#dc2626;color:#ffffff;'     // red
  }
};

// Update theme at runtime (shallow merge)
export function setDialogTheme(partial = {}) {
  if (partial.button) {
    DIALOG_THEME.button = { ...DIALOG_THEME.button, ...partial.button };
  }
}

export function openDialog({
  title = 'Dialog',
  message = '',
  subtext = '',
  iconClass = 'fas fa-info-circle text-blue-500',
  size = 'md',
  closeOnBackdrop = false, // was true: disable backdrop-close by default
  closeOnEsc = true,
  layout = 'stacked',
  showCloseX = true,
  buttons = []
} = {}) {
  return new Promise((resolve) => {
    const tpl = document.getElementById('ui-dialog-template');
    if (!tpl || !('content' in tpl)) {
      // Fallback: keep prior behavior if template is missing
      console.error('ui-dialog-template not found. Include @include("components.dialog") in your layout.');
      // You can keep your previous string-builder here if desired
      return resolve(null);
    }

    const frag = tpl.content.cloneNode(true);
    const overlay = frag.querySelector('.ui-dialog-overlay');
    const dialog = frag.querySelector('.ui-dialog');
    const body = frag.querySelector('.ui-dialog-body');
    const footer = frag.querySelector('.ui-dialog-footer');

    // Size
    dialog.classList.remove('max-w-sm', 'max-w-md', 'max-w-2xl');
    dialog.classList.add(size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-md');

    // Layout
    if (layout === 'stacked') dialog.classList.add('ui-dialog--stacked');
    if (layout === 'stacked') footer.classList.add('justify-center');

    // ARIA
    const headerId = 'dlg-' + Math.random().toString(36).slice(2);
    const msgId = 'dlg-msg-' + Math.random().toString(36).slice(2);
    dialog.setAttribute('aria-labelledby', headerId);
    if (message || subtext) dialog.setAttribute('aria-describedby', msgId);

    // Header X
    const closeX = dialog.querySelector('.ui-dialog-x');
    if (!showCloseX && closeX) closeX.remove();

    // Icon
    const hero = dialog.querySelector('.ui-dialog-hero');
    const heroIcon = dialog.querySelector('.ui-dialog-hero-icon');
    if (iconClass && heroIcon) {
      heroIcon.className = `ui-dialog-hero-icon ${iconClass}`;
    } else if (hero) {
      hero.remove();
    }

    // Title/message/subtext
    const titleEl = dialog.querySelector('.ui-dialog-title');
    const msgEl = dialog.querySelector('.ui-dialog-message');
    const subtextEl = dialog.querySelector('.ui-dialog-subtext');

    if (titleEl) {
      titleEl.id = headerId;
      titleEl.textContent = title || '';
      if (!title) titleEl.remove();
    }
    if (msgEl) {
      msgEl.id = msgId;
      msgEl.textContent = message || '';
      if (!message) msgEl.remove();
    }
    if (subtextEl) {
      subtextEl.textContent = subtext || '';
      if (!subtext) subtextEl.remove();
    }

    // Buttons (supports icons and inline styles)
    let defaultButton = null;
    const makeBtn = ({
      label,
      value,
      variant = 'secondary',
      autofocus = false,
      className = '',
      style = '',
      iconClass = '',
      iconHTML = '',
      iconPosition = 'left'
    }) => {
      const btn = document.createElement('button');
      btn.type = 'button';

      const variantClass =
        variant === 'primary' ? 'btn btn-primary' :
        variant === 'danger'  ? 'btn btn-danger'  :
                                'btn btn-secondary';
      btn.className = `${variantClass} ${className}`.trim();

      const variantStyle =
        variant === 'primary' ? DIALOG_THEME.button.primary :
        variant === 'danger'  ? DIALOG_THEME.button.danger  :
                                DIALOG_THEME.button.secondary;

      btn.style.cssText = `${DIALOG_THEME.button.base || ''}${variantStyle || ''}${style || ''}`;

      const iconMarkup = iconHTML || (iconClass ? `<i class="${iconClass}" aria-hidden="true"></i>` : '');
      if (iconMarkup && iconPosition === 'right') {
        btn.innerHTML = `${label}<span style="margin-left:.5rem;display:inline-flex;align-items:center;">${iconMarkup}</span>`;
      } else if (iconMarkup) {
        btn.innerHTML = `<span style="margin-right:.5rem;display:inline-flex;align-items:center;">${iconMarkup}</span>${label}`;
      } else {
        btn.textContent = label;
      }

      if (autofocus) {
        btn.autofocus = true;
        defaultButton = btn;
      }
      btn.addEventListener('click', () => close(value));
      return btn;
    };

    buttons.forEach(b => footer.appendChild(makeBtn(b)));

    // Mount
    document.body.appendChild(frag);
    requestAnimationFrame(() => overlay.classList.add('open'));

    // Focus management
    const focusables = () => Array.from(dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    setTimeout(() => (focusables()[0] || dialog).focus(), 0);

    // Events
    function onKey(e) {
      if (e.key === 'Escape' && closeOnEsc) { e.preventDefault(); close(null); }
      else if (e.key === 'Enter' && defaultButton) { e.preventDefault(); defaultButton.click(); }
      else if (e.key === 'Tab') {
        const fs = focusables(); if (!fs.length) return;
        if (e.shiftKey && document.activeElement === fs[0]) { e.preventDefault(); fs[fs.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === fs[fs.length - 1]) { e.preventDefault(); fs[0].focus(); }
      }
    }
    function onBackdrop(e) { 
      if (closeOnBackdrop && e.target.classList.contains('ui-dialog-overlay')) close(null);
    }
    function onX() { close(null); }

    document.addEventListener('keydown', onKey);
    overlay.addEventListener('mousedown', onBackdrop);
    closeX?.addEventListener('click', onX);

    function destroy() {
      document.removeEventListener('keydown', onKey);
      overlay.removeEventListener('mousedown', onBackdrop);
      closeX?.removeEventListener('click', onX);
      overlay.classList.remove('open');
      setTimeout(() => overlay.parentNode && overlay.parentNode.removeChild(overlay), 160);
    }
    function close(val) { destroy(); resolve(val); }
  });
}

export function confirmDialog({
  title = 'Confirm',
  message = 'Are you sure?',
  subtext = '',
  iconClass = 'fas fa-exclamation-triangle text-yellow-500',
  confirmText = 'Confirm',
  danger = false,
  closeOnBackdrop = false, // was true
  closeOnEsc = true
} = {}) {
  return openDialog({
    title, message, subtext, iconClass, closeOnBackdrop, closeOnEsc,
    layout: 'stacked',
    showCloseX: true,
    buttons: [
      { label: confirmText, value: true, variant: danger ? 'danger' : 'primary', autofocus: true }
    ]
  });
}

export function alertDialog({
  title = 'Notice',
  message = '',
  subtext = '',
  iconClass = 'fas fa-info-circle text-blue-500',
  okText = 'OK',
  closeOnBackdrop = false, // was true
  closeOnEsc = true
} = {}) {
  return openDialog({
    title, message, subtext, iconClass, closeOnBackdrop, closeOnEsc,
    layout: 'stacked',
    showCloseX: true,
    buttons: [{ label: okText, value: true, variant: 'primary', autofocus: true }]
  });
}

export function approveDialog({
  title = 'Approve',
  message = 'Are you sure you want to approve this item?',
  subtext = '',
  iconClass = 'fas fa-check-circle text-green-500',
  confirmText = 'Approve',
  confirmStyle = '',
  // NEW: optional icon for the confirm button
  confirmIconClass = 'fas fa-check',
  confirmIconHTML = '',
  confirmIconPosition = 'left',
  closeOnBackdrop = false, // was true
  closeOnEsc = true
} = {}) {
  return openDialog({
    title, message, subtext, iconClass, closeOnBackdrop, closeOnEsc,
    layout: 'stacked',
    showCloseX: true,
    buttons: [
      {
        label: confirmText,
        value: true,
        variant: 'primary',
        autofocus: true,
        style: confirmStyle,
        iconClass: confirmIconClass,
        iconHTML: confirmIconHTML,
        iconPosition: confirmIconPosition
      }
    ]
  });
}

// Reuse the template and inject textarea into .ui-dialog-extra
export function rejectDialog({
  title = 'Reject',
  message = 'Please provide a reason for rejection.',
  subtext = '',
  iconClass = 'fas fa-times-circle text-red-500',
  placeholder = 'Add comments...',
  confirmText = 'Reject',
  minLength = 3,
  size = 'md',
  confirmStyle = '',
  cancelStyle = '',
  confirmIconClass = 'fas fa-ban',
  confirmIconHTML = '',
  confirmIconPosition = 'left',
  cancelIconClass = 'fas fa-times',
  cancelIconHTML = '',
  cancelIconPosition = 'left',
  closeOnBackdrop = false, // was true
  closeOnEsc = true
} = {}) {
  return new Promise((resolve) => {
    // Create dialog with Cancel + Reject buttons
    openDialog({
      title, message, subtext, iconClass, size, closeOnBackdrop, closeOnEsc,
      layout: 'stacked', showCloseX: true,
      buttons: [
        { label: confirmText, value: '__confirm__', variant: 'danger', style: confirmStyle, iconClass: confirmIconClass, iconHTML: confirmIconHTML, iconPosition: confirmIconPosition, autofocus: true }
      ]
    }).then(val => {
      // Let cancel/esc/backdrop resolve null via openDialog
      if (val !== '__confirm__') resolve(val);
    });

    // Grab last mounted dialog
    const overlays = document.querySelectorAll('.ui-dialog-overlay');
    const overlay = overlays[overlays.length - 1];
    const dialog = overlay?.querySelector('.ui-dialog');
    if (!dialog) return;

    // Show existing reject area from template
    const rejectArea = dialog.querySelector('[data-role="reject-area"]');
    const minSpan = dialog.querySelector('[data-role="reject-min"]');
    const textarea = dialog.querySelector('#reject-comments');
    if (rejectArea) rejectArea.classList.remove('hidden');
    if (minSpan) minSpan.textContent = String(minLength);
    if (textarea) textarea.setAttribute('placeholder', placeholder);

    const footer = dialog.querySelector('.ui-dialog-footer');
    const buttons = Array.from(footer.querySelectorAll('button'));
    const confirmBtn = buttons.find(b => b.textContent.trim().endsWith(confirmText));
    const cancelBtn = buttons.find(b => b.textContent.trim().startsWith('Cancel'));

    // Enable confirm only when min length met
    const meetsMin = () => (textarea?.value || '').trim().length >= minLength;
    const updateState = () => { if (confirmBtn) confirmBtn.disabled = !meetsMin(); };
    if (confirmBtn) confirmBtn.disabled = true;

    textarea?.addEventListener('input', updateState);
    setTimeout(() => textarea?.focus(), 0);

    // Confirm returns { comments }
    confirmBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!meetsMin()) return;
      const comments = textarea.value.trim();
      overlay.classList.remove('open');
      setTimeout(() => overlay.parentNode && overlay.parentNode.removeChild(overlay), 160);
      resolve({ comments });
    }, { once: true });

    // Cancel: no override needed (openDialog already handles close/null)
    cancelBtn?.addEventListener('click', () => {}, { once: true });
  });
}

export function respondDialog({
  title = 'Respond',
  message = 'Write your reply below.',
  subtext = '',
  iconClass = 'fas fa-reply text-secondary',
  placeholder = 'Type your reply...',
  confirmText = 'Send',
  minLength = 1,
  size = 'md',
  confirmStyle = '',
  confirmIconClass = 'fas fa-paper-plane',
  confirmIconHTML = '',
  confirmIconPosition = 'left',
  closeOnBackdrop = false,
  closeOnEsc = true
} = {}) {
  return new Promise((resolve) => {
    // Create dialog with only the Send button; closing/X resolves null
    openDialog({
      title, message, subtext, iconClass, size, closeOnBackdrop, closeOnEsc,
      layout: 'stacked', showCloseX: true,
      buttons: [
        { label: confirmText, value: '__send__', variant: 'primary', style: confirmStyle, iconClass: confirmIconClass, iconHTML: confirmIconHTML, iconPosition: confirmIconPosition, autofocus: true }
      ]
    }).then(val => {
      // If closed without sending, resolve null
      if (val !== '__send__') resolve(val);
    });

    // Target the last-mounted dialog
    const overlays = document.querySelectorAll('.ui-dialog-overlay');
    const overlay = overlays[overlays.length - 1];
    const dialog = overlay?.querySelector('.ui-dialog');
    if (!dialog) return;

    // Show respond area and configure it
    const respondArea = dialog.querySelector('[data-role="respond-area"]');
    const minSpan = dialog.querySelector('[data-role="respond-min"]');
    const textarea = dialog.querySelector('#respond-message');
    if (respondArea) respondArea.classList.remove('hidden');
    if (minSpan) minSpan.textContent = String(minLength);
    if (textarea) textarea.setAttribute('placeholder', placeholder);

    const footer = dialog.querySelector('.ui-dialog-footer');
    const buttons = Array.from(footer.querySelectorAll('button'));
    const sendBtn = buttons.find(b => b.textContent.trim().endsWith(confirmText));

    // Enable send only when min length is met
    const meetsMin = () => (textarea?.value || '').trim().length >= minLength;
    const updateState = () => { if (sendBtn) sendBtn.disabled = !meetsMin(); };
    if (sendBtn) sendBtn.disabled = !meetsMin();

    textarea?.addEventListener('input', updateState);

    // Ctrl+Enter to send
    textarea?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (meetsMin() && sendBtn && !sendBtn.disabled) sendBtn.click();
      }
    });

    // Finalize send: return { reply }
    sendBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!meetsMin()) return;
      const reply = (textarea?.value || '').trim();
      overlay.classList.remove('open');
      setTimeout(() => overlay.parentNode && overlay.parentNode.removeChild(overlay), 160);
      resolve({ reply });
    }, { once: true });
  });
}