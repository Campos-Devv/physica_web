/**
 * Module Management
 * - Organized utilities
 * - Safe DOM bindings
 * - Single implementations (no duplicates)
 * - Optional shared Loading utility with fallback
 */

// ========== Utilities ==========
import { createLoadingOverlay } from '../../components/loading';
import { confirmDialog } from '../../components/dialog';
import { showNotification } from '../../components/notification'; // <-- use shared notification

function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  if (!tpl || !tpl.content) {
    console.error(`Template "${id}" not found in Blade.`);
    return null;
  }
  return tpl.content.firstElementChild?.cloneNode(true) || null;
}

function formatDate(dateValue) {
  let date;
  if (!dateValue) date = new Date();
  else if (typeof dateValue === 'string') date = new Date(dateValue);
  else if (dateValue.seconds) date = new Date(dateValue.seconds * 1000);
  else date = new Date(dateValue);
  if (isNaN(date.getTime())) date = new Date();
  return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status) {
// Status badge & review workflow removed; modules are implicitly approved
}

// Optional shared Loading helper with fallback
function startLoading(container, text = 'Loading…', options = {}) {
  if (!container) return null;
  const overlay = createLoadingOverlay(container, {
    message: text,
    dotsOnly: true,
    dark: options.dark ?? false,
    color: options.color ?? null,
    colorClass: options.colorClass ?? 'text-primary' // default tint
  });
  overlay.show();
  return overlay;
}
function stopLoading(handle) {
  if (handle?.destroy) handle.destroy();
}

// ========== Main ==========
document.addEventListener('DOMContentLoaded', function () {
  // Prevent duplicate initialization if this script is included twice
  if (window.__moduleManagerLoaded) return;
  window.__moduleManagerLoaded = true;

  // Elements
  const selectedQuarterSection = document.getElementById('selected-quarter-section');
  const selectedQuarterName = document.getElementById('selected-quarter-name');
  const createModuleBtn = document.getElementById('create-module-btn');
  const modulesPanel = document.getElementById('modules-panel');
  const emptyModules = document.getElementById('empty-modules');
  const modulesListContainer = document.getElementById('modules-list-container');

  const addModuleModal = document.getElementById('add-module-modal');
  const closeModuleModal = document.getElementById('close-module-modal'); // optional
  const cancelModuleBtn = document.getElementById('cancel-module-btn');   // optional (may be removed)
  const addModuleBtn = document.getElementById('add-module-btn');         // optional if modal not built yet
  const moduleForm = document.getElementById('module-form');              // optional
  const moduleQuarterIdInput = document.getElementById('module-quarter-id');
  const moduleIdInput = document.getElementById('module-id');
  const moduleTitleInput = document.getElementById('module-title');
  const moduleTopicInput = document.getElementById('module-topic');

  // In-flight guard to prevent duplicate POST/PUT
  let isSavingModule = false;

  // Ensure the form doesn't submit separately (Enter key, default submit)
  if (moduleForm) {
    moduleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addModuleBtn?.click();
    });
  }
  // Ensure the Add button does not behave as a submit button
  if (addModuleBtn && addModuleBtn.getAttribute('type') !== 'button') {
    addModuleBtn.setAttribute('type', 'button');
  }

  // Close any open dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
    }
  });

  // Modal controls
  if (closeModuleModal) closeModuleModal.addEventListener('click', hideModuleModal);
  if (cancelModuleBtn) cancelModuleBtn.addEventListener('click', hideModuleModal);
  if (addModuleBtn) {
    addModuleBtn.addEventListener('click', function () {
      if (isSavingModule) return;

      const moduleTitle = moduleTitleInput?.value.trim() || '';
      const moduleTopic = moduleTopicInput?.value.trim() || '';
      const quarterId = moduleQuarterIdInput?.value;
      const moduleId = moduleIdInput?.value;

      if (!moduleTitle) {
        moduleTitleInput?.classList.add('border-red-500');
        showNotification('Module title is required', 'error');
        return;
      }
      if (!quarterId) {
        showNotification('Please select a quarter first.', 'warning');
        return;
      }

      isSavingModule = true;

      if (moduleId) {
        // Edit: hide modal, show overlay inside updateModule
        hideModuleModal();
        updateModule(moduleId, moduleTitle, moduleTopic);
      } else {
        // Create: hide modal immediately, show overlay inside addModuleToQuarter
        hideModuleModal(); // ADDED
        addModuleToQuarter(quarterId, moduleTitle, moduleTopic);
      }
    });
  }
  if (moduleTitleInput) {
    moduleTitleInput.addEventListener('input', function () {
      if (this.value.trim()) this.classList.remove('border-red-500');
    });
  }

  // ======== Functions (scoped) ========
  function showFormError(message) {
    const errorArea = document.getElementById('module-form-error');
    if (!errorArea) return;
    const errorMessageEl = errorArea.querySelector('.error-message');
    if (errorMessageEl) errorMessageEl.textContent = message;
    errorArea.classList.remove('hidden');
  }
  function hideFormError() {
    const errorArea = document.getElementById('module-form-error');
    if (errorArea) errorArea.classList.add('hidden');
  }
  function hideModuleModal() {
    if (!addModuleModal) return;
    addModuleModal.classList.add('hidden');
    addModuleModal.classList.remove('flex');
    moduleForm?.reset();
    if (moduleIdInput) moduleIdInput.value = '';
    moduleTitleInput?.classList.remove('border-red-500');
    hideFormError();
    const header = document.querySelector('#add-module-modal .module-modal-header h3');
    if (header) header.textContent = 'Add New Module';
    if (addModuleBtn) addModuleBtn.textContent = 'Add Module';
  }

  function setModulesHeader(quarterTitle) {
    const el = document.getElementById('selected-quarter-name');
    if (el) el.textContent = quarterTitle || 'Quarter';
  }

  function selectQuarter(quarterId) {
    const quarterCard = document.getElementById(quarterId);
    if (!quarterCard) { showNotification('Quarter not found', 'error'); return Promise.resolve(); }

    window.lessonManagement?.resetLessonsUI?.();

    // Update header via helper
    setModulesHeader(
      quarterCard.dataset.quarterTitle ||
      quarterCard.querySelector('.title')?.textContent?.trim() ||
      'Quarter'
    );

    // Reveal section
    if (selectedQuarterSection) {
      selectedQuarterSection.classList.remove('hidden');
      setTimeout(() => selectedQuarterSection.classList.add('active'), 10);
    }

    // Create button opens modal
    if (createModuleBtn) {
      createModuleBtn.onclick = function () {
        moduleForm?.reset();
        if (moduleIdInput) moduleIdInput.value = '';
        if (moduleQuarterIdInput) moduleQuarterIdInput.value = quarterCard.dataset.quarterId || quarterId;
        const header = document.querySelector('#add-module-modal .module-modal-header h3');
        if (header) header.textContent = 'Add New Module';
        if (addModuleBtn) addModuleBtn.textContent = 'Add Module';
        if (addModuleModal) {
          addModuleModal.classList.remove('hidden');
          addModuleModal.classList.add('flex');
          setTimeout(() => moduleTitleInput?.focus(), 100);
        }
      };
    }

    // Reset view
    if (modulesListContainer) {
      modulesListContainer.style.display = 'none';
      modulesListContainer.innerHTML = '';
      modulesListContainer.classList.add('hidden');
      modulesListContainer.classList.remove('grid');
    }
    document.querySelectorAll('.module-item').forEach(item => item.remove());

    // Load and return a promise (adopt loadQuarterModules’ promise)
    return new Promise((resolve) => {
      setTimeout(() => resolve(loadQuarterModules(quarterId)), 10);
    });
  }

  function updateQuarterInfo(quarterId) {
    const quarterCard = document.getElementById(quarterId);
    if (!quarterCard) {
      showNotification('Quarter not found', 'error');
      return;
    }
    if (selectedQuarterName) selectedQuarterName.textContent = quarterCard.dataset.quarterTitle || 'Quarter';
  }

  function hideModuleSection() {
    if (!selectedQuarterSection) return;
    selectedQuarterSection.classList.remove('active');
    setTimeout(() => selectedQuarterSection.classList.add('hidden'), 300);
  }

  function loadQuarterModules(quarterId) {
    if (!quarterId) {
      console.error('ModuleManager: quarterId is required');
      return Promise.resolve();
    }

    if (modulesListContainer) {
      modulesListContainer.style.display = 'none';
      modulesListContainer.innerHTML = '';
    }
    document.querySelectorAll('.module-item').forEach(item => item.remove());

    emptyModules?.classList.add('hidden');
    modulesListContainer?.classList.add('hidden');
    const handle = startLoading(modulesPanel, 'Loading modules…', {
      colorClass: 'text-primary'
    });

    return fetch(`/science/modules/quarter/${quarterId}`)
      .then(r => { if (!r.ok) throw new Error('Failed to fetch modules'); return r.json(); })
      .then(response => {
        stopLoading(handle);

        const modules = Array.isArray(response) ? response : (response.data || []);
        if (modules.length && modules[0].quarter_id && modules[0].quarter_id != quarterId) {
          throw new Error('Received modules for wrong quarter');
        }

        if (modules.length > 0) {
          emptyModules?.classList.add('hidden');
          // render list
          modulesListContainer?.classList.remove('hidden');

          modules.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
          const filtered = modules.filter(m => String(m.quarter_id) === String(quarterId));

          if (modulesListContainer) {
            modulesListContainer.classList.add('grid');
            const fragment = document.createDocumentFragment();
            filtered.forEach(m => {
              const card = createModuleCard(
                m.id,
                m.title,
                m.topic || '',
                m.created_at ? formatDate(m.created_at) : 'Unknown date',
                quarterId,
                m.status || 'pending'
              );
              if (card) fragment.appendChild(card);
            });
            modulesListContainer.appendChild(fragment);
            modulesListContainer.style.display = '';
            modulesListContainer.classList.remove('hidden');
          }

          modules.forEach(m => fetchLessonCount(m.id));

          const quarterCard = document.getElementById(quarterId);
          if (quarterCard) {
            const moduleCountElement = quarterCard.querySelector('.module-count');
            if (moduleCountElement) moduleCountElement.textContent = modules.length;
          }
        } else {
          if (emptyModules) {
            emptyModules.classList.remove('hidden');
            emptyModules.innerHTML = '';
            const node = cloneTemplate('tpl-empty-modules');
            if (node) emptyModules.appendChild(node);
          }
          modulesListContainer?.classList.add('hidden');
          modulesListContainer?.classList.remove('grid');
        }
      })
      .catch(error => {
        console.error('Error loading modules:', error);
        stopLoading(handle);
        if (emptyModules) {
          emptyModules.innerHTML = '';
          const errNode = cloneTemplate('tpl-error-modules');
          if (errNode) {
            errNode.querySelector('.error-text')?.append(`Failed to load modules. ${error.message}`);
            errNode.querySelector('.retry-btn')?.addEventListener('click', () => loadQuarterModules(quarterId));
            emptyModules.classList.remove('hidden');
            emptyModules.appendChild(errNode);
          }
        }
        modulesListContainer?.classList.add('hidden');
      });
  }

  function fetchLessonCount(moduleId) {
    const card = document.getElementById(`module-card-${String(moduleId).replace('module-', '')}`);
    if (!card) return;
    const lessonCountElement = card.querySelector('.lesson-count');
    if (!lessonCountElement) return;

    // No spinner: keep prior value or show simple placeholder
    const previous = (lessonCountElement.textContent || '').trim();
    if (!previous || previous === '?' || previous === '...') {
      lessonCountElement.textContent = '...';
    }

    fetch(`/science/modules/${moduleId}/lessons/count`)
      .then(r => { if (!r.ok) throw new Error('Failed to fetch lesson count'); return r.json(); })
      .then(data => { lessonCountElement.textContent = data.count ?? 0; })
      .catch(err => {
        console.error('Error fetching lesson count:', err);
        // Restore previous value if meaningful, otherwise fallback to '?'
        lessonCountElement.textContent = previous && previous !== '...' ? previous : '?';
      });
  }

  function createModuleCard(moduleId, title, topic, creationDate, quarterId) {
    if (!quarterId) {
      console.error(`Missing quarterId for module ${moduleId}`);
      return null;
    }
    const cleanId = String(moduleId).includes('module-') ? String(moduleId).replace('module-', '') : moduleId;
    const existing = document.getElementById(`module-card-${cleanId}`);
    if (existing) existing.remove();

    const node = cloneTemplate('tpl-module-card');
    if (!node) return null;

    node.id = `module-card-${cleanId}`;
    node.dataset.moduleId = moduleId;
    node.dataset.quarterId = quarterId;
    node.dataset.type = 'module';
    node.dataset.moduleTitle = title;
    node.dataset.moduleTopic = topic || '';
  // status removed

    // Populate
    const titleEl = node.querySelector('.title');
  // status badge removed from template
    const topicWrap = node.querySelector('.topic');
    const topicText = node.querySelector('.topic-text');
    const createdEl = node.querySelector('.created-at');
    const quarterLabel = node.querySelector('.quarter-label');

    if (titleEl) titleEl.textContent = title;
  // no status badge

    if (topic) {
      topicWrap?.classList.remove('hidden');
      if (topicText) topicText.textContent = topic;
    } else {
      topicWrap?.classList.add('hidden');
      if (topicText) topicText.textContent = '';
    }

    if (createdEl) createdEl.textContent = `Created: ${creationDate}`;

    // Removed: 'Added to Quarter' label
    let quarterTitle = 'Unknown Quarter';
    const quarterCard = document.getElementById(quarterId);
    if (quarterCard?.dataset?.quarterTitle) quarterTitle = quarterCard.dataset.quarterTitle;
    if (quarterLabel) quarterLabel.textContent = `Added to ${quarterTitle}`;

    // Dropdown bindings
    const dropdownBtn = node.querySelector('.dropdown button');
    const dropdownMenu = node.querySelector('.dropdown-menu');
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown-menu').forEach(menu => { if (menu !== dropdownMenu) menu.classList.add('hidden'); });
        dropdownMenu.classList.toggle('hidden');
      });
    }

    // Edit
    const editBtn = node.querySelector('.edit-module-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!addModuleModal) return;

        if (moduleIdInput) moduleIdInput.value = node.dataset.moduleId;
        if (moduleTitleInput) moduleTitleInput.value = node.dataset.moduleTitle || '';
        if (moduleTopicInput) moduleTopicInput.value = node.dataset.moduleTopic || '';
        if (moduleQuarterIdInput) moduleQuarterIdInput.value = node.dataset.quarterId || '';

        const header = document.querySelector('#add-module-modal .module-modal-header h3');
        if (header) header.textContent = 'Edit Module';
        if (addModuleBtn) addModuleBtn.textContent = 'Save Changes';

        addModuleModal.classList.remove('hidden');
        addModuleModal.classList.add('flex');
        setTimeout(() => moduleTitleInput?.focus(), 100);

        if (dropdownMenu) dropdownMenu.classList.add('hidden');
      });
    }

    // Delete
    const deleteBtn = node.querySelector('.delete-module-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = await confirmDialog({
          title: 'Delete Module',
          message: `Are you sure you want to delete this "${title}"?`,
          subtext: 'This action cannot be undone.',
          iconClass: 'fas fa-trash-alt text-red-600',
          confirmText: 'Delete Module',
          danger: true
        });

        if (confirmed) {
          const pageOverlay = createLoadingOverlay(document.body, {
            dark: true,
            dotsOnly: true,
            colorClass: 'text-white',   // or use color: '#0ea5e9'
            message: 'Deleting module…'   // now shows under the dots
          });
          pageOverlay.show();
          try {
            await deleteModule(moduleId);
          } finally {
            pageOverlay.destroy();
          }
        }
      });
    }

    // Select module
    node.addEventListener('click', (e) => {
      if (e.target.closest('.dropdown')) return;
      handleSelectModule(moduleId, node);
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Keyboard
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelectModule(moduleId, node);
      }
    });

    return node;
  }

  function addModuleToQuarter(quarterId, title, topic) {
    const quarterCard =
      document.querySelector(`.quarter-card[data-quarter-id="${quarterId}"]`) ||
      document.getElementById(quarterId);
    if (!quarterCard) { showNotification('Quarter not found', 'error'); return; }

    const domQuarterId = quarterCard.id || quarterId;

    // Full-screen overlay while creating
    const pageOverlay = createLoadingOverlay(document.body, {
      dark: true,
      dotsOnly: true,
      colorClass: 'text-white',
      message: 'Creating module…'
    });
    pageOverlay.show();

    // Button state (useful if we reopen modal on error)
    const original = addModuleBtn?.textContent;
    if (addModuleBtn) {
      addModuleBtn.disabled = true;
      addModuleBtn.textContent = 'Adding...';
    }

    fetch('/science/modules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
      },
      body: JSON.stringify({ title, quarterId, topic: topic || '' })
    })
    .then(async r => {
      let data = null;
      try { data = await r.json(); } catch {}
      if (!r.ok) {
        const msg = (data?.errors && Object.values(data.errors).flat().join(' ')) ||
                    data?.message || r.statusText || 'Failed to create module';
        throw new Error(msg);
      }
      return data;
    })
    .then(resp => {
      const module = resp?.data || resp?.module || resp;
      const newId = module?.id || module?.moduleId;
      const createdAt = module?.created_at || module?.createdAt || new Date().toISOString();
      const newStatus = module?.status || 'pending';

      showNotification('Module created successfully!', 'success');

      if (modulesListContainer && quarterCard.classList.contains('selected')) {
        emptyModules?.classList.add('hidden');
        modulesListContainer.classList.add('grid');
        modulesListContainer.classList.remove('hidden');
        modulesListContainer.style.display = '';

        if (newId) {
          const cleanId = String(newId).includes('module-') ? String(newId).replace('module-', '') : newId;
          const existingEl = document.getElementById(`module-card-${cleanId}`);
          if (!existingEl) {
            const card = createModuleCard(
              newId,
              title,
              topic || '',
              formatDate(createdAt),
              domQuarterId,
              newStatus
            );
            if (card) {
              modulesListContainer.appendChild(card);
              fetchLessonCount(newId);
            }
          }
        }
      }

      const countEl = quarterCard.querySelector('.module-count');
      if (countEl) countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;

      // Keep modal hidden on success
    })
    .catch(err => {
      console.error('Error creating module:', err);
      showNotification(err.message || 'Failed to create module', 'error');

      // Reopen modal pre-filled so user can fix and retry
      if (addModuleModal) {
        const header = document.querySelector('#add-module-modal .module-modal-header h3');
        if (header) header.textContent = 'Add New Module';
        if (moduleTitleInput) moduleTitleInput.value = title;
        if (moduleTopicInput) moduleTopicInput.value = topic || '';
        if (moduleQuarterIdInput) moduleQuarterIdInput.value = quarterId;
        addModuleModal.classList.remove('hidden');
        addModuleModal.classList.add('flex');
        setTimeout(() => moduleTitleInput?.focus(), 100);
        const errorArea = document.getElementById('module-form-error');
        if (errorArea) {
          const msgEl = errorArea.querySelector('.error-message');
          if (msgEl) msgEl.textContent = err.message || 'Failed to create module';
          errorArea.classList.remove('hidden');
        }
      }
    })
    .finally(() => {
      if (addModuleBtn) {
        addModuleBtn.disabled = false;
        if (original) addModuleBtn.textContent = original;
      }
      pageOverlay.destroy();
      isSavingModule = false;
    });
  }

  function updateModule(moduleId, title, topic) {
    const moduleCard = document.getElementById(`module-card-${String(moduleId).replace('module-', '')}`);
    if (!moduleCard) { showNotification('Module not found', 'error'); return; }

    if (addModuleBtn) {
      const original = addModuleBtn.textContent;
      addModuleBtn.disabled = true;
      addModuleBtn.textContent = 'Saving...';

      // Full-screen overlay while updating
      const pageOverlay = createLoadingOverlay(document.body, {
        dark: true,
        dotsOnly: true,
        colorClass: 'text-white',
        message: 'Saving changes…'
      });
      pageOverlay.show();

      fetch(`/science/modules/${moduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({ title, topic: topic || '' })
      })
      .then(async r => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          const msg = (data?.errors && Object.values(data.errors).flat().join(' ')) ||
                      data?.message || r.statusText || 'Failed to update module';
          throw new Error(msg);
        }
        return data || {};
      })
      .then(resp => {
        if (resp.error || (resp.hasOwnProperty('success') && !resp.success)) {
          throw new Error(resp.message || resp.error || 'Failed to update module');
        }

        showNotification('Module updated successfully!', 'success');

        moduleCard.dataset.moduleTitle = title;
        moduleCard.dataset.moduleTopic = topic || '';

        const h4 = moduleCard.querySelector('h4.title, .title');
        if (h4) h4.textContent = title;

        const topicWrap = moduleCard.querySelector('.topic');
        const topicText = moduleCard.querySelector('.topic-text');
        if (topic) {
          if (topicWrap) topicWrap.classList.remove('hidden');
          if (topicText) topicText.textContent = topic;
        } else if (topicWrap) {
          topicWrap.classList.add('hidden');
          if (topicText) topicText.textContent = '';
        }

        // Close modal only after success
        hideModuleModal();
      })
      .catch(err => {
        console.error('Error updating module:', err);
        showFormError(err.message || 'Failed to update module');
        showNotification(err.message || 'Failed to update module', 'error');
      })
      .finally(() => {
        addModuleBtn.disabled = false;
        addModuleBtn.textContent = original;
        pageOverlay.destroy();
        // Release in-flight guard regardless of outcome
        isSavingModule = false;
      });
    }
  }

  function deleteModule(moduleId, confirmDialog = null) {
    return fetch(`/science/modules/${moduleId}`, {        // RETURN the promise
      method: 'DELETE',
      headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content') }
    })
    .then(r => { if (!r.ok) throw new Error(`Failed to delete module: ${r.statusText}`); return r.json(); })
    .then(resp => {
      if (resp.error || (resp.hasOwnProperty('success') && !resp.success)) {
        throw new Error(resp.message || resp.error || 'Failed to delete module');
      }

      if (confirmDialog?.parentNode) confirmDialog.remove();
      showNotification('Module deleted successfully!', 'success');

      const card = document.getElementById(`module-card-${String(moduleId).replace('module-', '')}`);
      if (!card) return true;
      card.style.opacity = '0';
      card.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        const quarterId = card.dataset.quarterId;
        card.parentNode && card.parentNode.removeChild(card);

        const qCard = document.getElementById(quarterId);
        if (qCard) {
          const countEl = qCard.querySelector('.module-count');
          if (countEl) countEl.textContent = Math.max(0, (parseInt(countEl.textContent) || 0) - 1);
        }

        const remaining = document.querySelectorAll('.module-item').length;
        if (remaining === 0) {
          if (emptyModules) {
            emptyModules.classList.remove('hidden');
            emptyModules.innerHTML = '';
            const node = cloneTemplate('tpl-empty-modules');
            if (node) emptyModules.appendChild(node);
          }
          if (modulesListContainer) {
            modulesListContainer.classList.add('hidden');
            modulesListContainer.classList.remove('grid');
          }
        }
      }, 300);
      return true;
    })
    .catch(err => {
      if (confirmDialog?.parentNode) {
        const confirmBtn = confirmDialog.querySelector('.confirm-delete-btn');
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = 'Delete Module';
        }
        const messageContainer = confirmDialog.querySelector('p, .confirm-message');
        if (messageContainer) {
          messageContainer.innerHTML = `<span class="text-red-600 font-medium">Error: ${err.message}</span>`;
        }
        setTimeout(() => confirmDialog.parentNode && confirmDialog.remove(), 3000);
      } else {
        console.error('Error deleting module:', err);
        showNotification(`Failed to delete module: ${err.message}`, 'error');
      }
      throw err; // propagate so callers can handle
    });
  }

  // updateModuleStatus fully removed

  // ======== Selection guards for MODULE → LESSONS ========
  let selectedModuleId = null;
  let moduleSelectingInFlight = false;
  let lastModuleSelectTs = 0;
  const MODULE_SELECT_THROTTLE_MS = 300;

  function closeAllModuleMenus(except) {
    document.querySelectorAll('.module-item .dropdown-menu').forEach(menu => {
      if (menu !== except) menu.classList.add('hidden');
    });
  }
  function disableOtherModuleCards(exceptNode) {
    document.querySelectorAll('.module-item').forEach(card => {
      if (card !== exceptNode) {
        card.classList.add('pointer-events-none', 'opacity-50', 'cursor-not-allowed');
        card.setAttribute('aria-disabled', 'true');
      }
    });
  }
  function enableAllModuleCards() {
    document.querySelectorAll('.module-item').forEach(card => {
      card.classList.remove('pointer-events-none', 'opacity-50', 'cursor-not-allowed');
      card.removeAttribute('aria-disabled');
    });
  }

  function handleSelectModule(moduleId, node) {
    if (!moduleId || !node) return;

    // Same selection → do nothing (avoid duplicate loads)
    if (selectedModuleId === moduleId) {
      document.querySelectorAll('.module-item').forEach(el => el.classList.remove('selected'));
      node.classList.add('selected');
      return;
    }

    const now = Date.now();
    if (moduleSelectingInFlight || (now - lastModuleSelectTs < MODULE_SELECT_THROTTLE_MS)) return;
    lastModuleSelectTs = now;
    moduleSelectingInFlight = true;

    closeAllModuleMenus();

    // Visual click feedback
    node.classList.add('bg-gray-50');
    setTimeout(() => node.classList.remove('bg-gray-50'), 150);

    // Update selection
    document.querySelectorAll('.module-item').forEach(el => el.classList.remove('selected'));
    node.classList.add('selected');
    node.setAttribute('aria-selected', 'true');
    selectedModuleId = moduleId;

    // Prevent user from spamming other modules while loading
    disableOtherModuleCards(node);

    // Clear previous lessons to avoid duplicates while new load starts
    window.lessonManagement?.resetLessonsUI?.();

    const p = window.lessonManagement?.showLessonManagement?.(
      moduleId,
      node.dataset.moduleTitle,
      node.dataset.moduleTopic,
      node.dataset.quarterId
    );

    const finalize = () => {
      moduleSelectingInFlight = false;
      enableAllModuleCards();
    };

    if (p && typeof p.then === 'function') p.finally(finalize);
    else setTimeout(finalize, 500);
  }

  // ======== Expose API ========
  window.moduleManager = {
    selectQuarter,
    updateQuarterInfo,
    hideModuleSection,
    loadQuarterModules,
    addModuleToQuarter,
    updateModule,
  // updateModuleStatus removed
    deleteModule,
    hideModuleModal,
  // getStatusBadge removed
    createModuleCard,
    showNotification, // still exposed, now from shared component
    fetchLessonCount,
    handleSelectModule
  };
});
