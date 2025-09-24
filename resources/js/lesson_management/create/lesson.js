/**
 * Lesson Management (scoped to lessons only)
 * - Shows lessons when a module card is clicked (via window.lessonManagement.showLessonManagement)
 * - Load/Create/Update/Delete lessons
 * - No class names with "module" or "quarter" (only dataset/variables use moduleId)
 */

import { createLoadingOverlay } from '../../components/loading';
import { confirmDialog } from '../../components/dialog';
import { showNotification } from '../../components/notification';

document.addEventListener('DOMContentLoaded', function () {
  if (window.__lessonManagerLoaded) return;
  window.__lessonManagerLoaded = true;

  // Elements
  const lessonsSection = document.getElementById('lessons-section');
  const createLessonBtn = document.getElementById('create-lesson-btn');
  const lessonsPanel = document.getElementById('lessons-panel');
  const emptyLessons = document.getElementById('empty-lessons');
  const lessonsListContainer = document.getElementById('lessons-list-container');
  const selectedModuleName = document.getElementById('selected-module-name'); // <-- new

  // Modal refs
  const addLessonModal = document.getElementById('add-lesson-modal');
  const closeLessonModal = document.getElementById('close-lesson-modal');
  const lessonForm = document.getElementById('lesson-form');
  const lessonIdInput = document.getElementById('lesson-id');
  const lessonTitleInput = document.getElementById('lesson-title');
  const lessonTopicInput = document.getElementById('lesson-topic');
  const addLessonBtn = document.getElementById('add-lesson-btn');
  // Dynamic content elements (inside the modal)
  const dynamicSections = document.getElementById('lesson-dynamic-sections');
  const btnAddSubtext = document.getElementById('btn-add-subtext');
  const btnAddParagraph = document.getElementById('btn-add-paragraph');
  const btnAddList = document.getElementById('btn-add-list');
  const btnAddMedia = document.getElementById('btn-add-media');

  // View modal refs
  const viewLessonModal = document.getElementById('view-lesson-modal');
  const closeViewLessonModalBtn = document.getElementById('close-view-lesson-modal');
  const viewLessonTitleEl = document.getElementById('view-lesson-title');
  const viewLessonTitleText = document.getElementById('view-lesson-title-text');
  const viewLessonTopicText = document.getElementById('view-lesson-topic-text');
  const viewLessonContents = document.getElementById('view-lesson-contents');

  // State
  let isSavingLesson = false;
  let currentModuleId = null;
  let currentModuleTitle = null;

  // Helper: resolve a displayable module title (no inheritance)
  function resolveModuleTitle(modId, providedTitle) {
    if (providedTitle && providedTitle.trim()) return providedTitle.trim();
    const clean = String(modId).replace(/^module-/, '');
    const card =
      document.getElementById(`module-card-${clean}`) ||
      document.querySelector(`.module-item[data-module-id="${modId}"]`);
    const text = card?.querySelector('.title')?.textContent?.trim();
    return text && text.length ? text : `Module ${clean}`;
  }

  // Helper: set the Lessons header module name
  function setLessonsHeader(moduleTitle) {
    if (selectedModuleName) selectedModuleName.textContent = moduleTitle || 'Module';
  }

  // Feature flag: fetch lessons on open
  const FETCH_LESSONS_ON_OPEN = true;

  // ---------- Utilities ----------
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
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function startLoading(container, text = 'Loading…', options = {}) {
    if (!container) return null;
    const overlay = createLoadingOverlay(container, {
      message: text,
      dotsOnly: true,
      dark: options.dark ?? false,
      colorClass: options.colorClass ?? 'text-primary'
    });
    overlay.show();
    return overlay;
  }
  function stopLoading(handle) {
    if (handle?.destroy) handle.destroy();
  }

  // Close any open dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
    }
  });

  // Form submit prevention
  if (lessonForm) {
    lessonForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addLessonBtn?.click();
    });
  }
  if (addLessonBtn && addLessonBtn.getAttribute('type') !== 'button') {
    addLessonBtn.setAttribute('type', 'button');
  }

  // Modal controls
  if (closeLessonModal) closeLessonModal.addEventListener('click', hideLessonModal);
  if (lessonTitleInput) {
    lessonTitleInput.addEventListener('input', function () {
      if (this.value.trim()) this.classList.remove('border-red-500');
    });
  }

  if (createLessonBtn) {
    createLessonBtn.addEventListener('click', () => {
      if (!currentModuleId) {
        showNotification('Please select a module first.', 'warning');
        return;
      }
      openCreateLessonModal();
    });
  }

  if (addLessonBtn) {
    addLessonBtn.addEventListener('click', () => {
      if (isSavingLesson) return;
      const title = (lessonTitleInput?.value || '').trim();
      const topic = (lessonTopicInput?.value || '').trim();
      const lessonId = lessonIdInput?.value || '';
      if (!title) {
        lessonTitleInput?.classList.add('border-red-500');
        showNotification('Lesson title is required', 'error');
        return;
      }
      if (!currentModuleId) {
        showNotification('Please select a module first.', 'warning');
        return;
      }

      isSavingLesson = true;

      // Serialize BEFORE hiding (hide clears inputs)
      const contents = serializeContents();

      if (lessonId) {
        hideLessonModal();
        updateLesson(lessonId, title, topic, contents);
      } else {
        hideLessonModal();
        addLessonToCurrentModule(title, topic, contents);
      }
    });
  }

  // ----- View modal helpers -----
  function openViewLessonModal(lesson) {
    if (!lesson) return;
    if (viewLessonTitleEl) viewLessonTitleEl.textContent = lesson.title || 'Lesson Details';
    if (viewLessonTitleText) viewLessonTitleText.textContent = lesson.title || '';
    if (viewLessonTopicText) viewLessonTopicText.textContent = lesson.topic || '';
    if (viewLessonContents) {
      viewLessonContents.innerHTML = '';
      const arr = Array.isArray(lesson.contents) ? lesson.contents.slice().sort((a,b)=> (a.order??0)-(b.order??0)) : [];
      if (arr.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'text-sm text-gray-500';
        empty.textContent = 'No contents.';
        viewLessonContents.appendChild(empty);
      } else {
        arr.forEach(section => {
          viewLessonContents.appendChild(renderViewSection(section));
        });
      }
    }
    viewLessonModal?.classList.remove('hidden');
    viewLessonModal?.classList.add('flex');
  }
  function hideViewLessonModal() {
    if (!viewLessonModal) return;
    viewLessonModal.classList.add('hidden');
    viewLessonModal.classList.remove('flex');
    if (viewLessonContents) viewLessonContents.innerHTML = '';
  }
  function renderViewSection(section) {
    const type = section?.type || 'unknown';
    const data = section?.data || {};

    const tplId = `tpl-view-section-${type}`;
    const node = cloneTemplate(tplId);

    // Helper for sizes
    const kb = (size) => `${(Math.round((size || 0) / 102.4) / 10)} KB`;

    if (node) {
      if (type === 'subtext' || type === 'paragraph') {
        const textEl = node.querySelector('[data-role="text"]');
        if (textEl) textEl.textContent = data.text || '';
        return node;
      }

      if (type === 'list') {
        const ul = node.querySelector('[data-role="list"]');
        if (ul) {
          (data.items || []).forEach(t => {
            const li = document.createElement('li');
            li.textContent = t;
            ul.appendChild(li);
          });
        }
        return node;
      }

      if (type === 'media') {
        const grid = node.querySelector('[data-role="grid"]');
        const empty = node.querySelector('[data-role="empty"]');
        const files = Array.isArray(data.files) ? data.files : [];

        if (!files.length) {
          if (empty) empty.classList.remove('hidden');
          return node;
        }
        if (empty) empty.classList.add('hidden');

        files.forEach(f => {
          const card = document.createElement('figure');
          card.className = 'media-item';

          // Preview node (no remote URLs here, only metadata)
          const meta = document.createElement('figcaption');
          meta.className = 'meta';
          meta.textContent = `${f.name || 'file'} • ${kb(f.size)} • ${f.type || ''}`;

          card.appendChild(meta);
          grid?.appendChild(card);
        });
        return node;
      }
    }

    // Fallback (unknown type)
    const wrap = document.createElement('section');
    wrap.className = 'border border-gray-200 rounded-md p-3 bg-white';
    const header = document.createElement('h5');
    header.className = 'text-sm font-medium text-secondary mb-2';
    header.textContent = 'Section';
    const body = document.createElement('div');
    body.className = 'text-gray-500 text-sm';
    body.textContent = 'Unknown section type.';
    wrap.appendChild(header);
    wrap.appendChild(body);
    return wrap;
  }

  closeViewLessonModalBtn?.addEventListener('click', hideViewLessonModal);
  viewLessonModal?.addEventListener('click', (e) => {
    if (e.target === viewLessonModal) hideViewLessonModal();
  });

  function fetchLessonDetails(lessonId) {
    return fetch(`/science/lessons/${lessonId}`)
      .then(async r => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.message || 'Failed to fetch lesson');
        return data?.data || data;
      });
  }

  // ---------- Modal helpers ----------
  function showFormError(message) {
    const errorArea = document.getElementById('lesson-form-error');
    if (!errorArea) return;
    const errorMessageEl = errorArea.querySelector('.error-message');
    if (errorMessageEl) errorMessageEl.textContent = message;
    errorArea.classList.remove('hidden');
  }
  function hideFormError() {
    const errorArea = document.getElementById('lesson-form-error');
    if (errorArea) errorArea.classList.add('hidden');
  }

  function openCreateLessonModal() {
    lessonForm?.reset();
    if (lessonIdInput) lessonIdInput.value = '';
    hideFormError();
    if (dynamicSections) { dynamicSections.innerHTML=''; addSection('media'); }
    const header = document.querySelector('#add-lesson-modal .lesson-modal-header h3');
    if (header) header.textContent = 'Add New Lesson';
    if (addLessonBtn) addLessonBtn.textContent = 'Add Lesson';
    if (lessonTopicInput) lessonTopicInput.value = '';
    addLessonModal?.classList.remove('hidden');
    addLessonModal?.classList.add('flex');
    setTimeout(() => lessonTitleInput?.focus(), 100);
  }

  function openEditLessonModal(lesson) {
    lessonForm?.reset();

    if (lessonIdInput) lessonIdInput.value = lesson.id;
    if (lessonTitleInput) lessonTitleInput.value = lesson.title || '';
    if (lessonTopicInput) lessonTopicInput.value = lesson.topic || lesson.description || '';

    hideFormError();

    if (dynamicSections) {
      dynamicSections.innerHTML = '';
      populateEditSectionsFromContents(Array.isArray(lesson.contents) ? lesson.contents : []);
    }

    const header = document.querySelector('#add-lesson-modal .lesson-modal-header h3');
    if (header) header.textContent = 'Edit Lesson';
    if (addLessonBtn) addLessonBtn.textContent = 'Save Changes';

    addLessonModal?.classList.remove('hidden');
    addLessonModal?.classList.add('flex');
    setTimeout(() => lessonTitleInput?.focus(), 100);
  }

  function populateEditSectionsFromContents(contents) {
    if (!dynamicSections) return;
    dynamicSections.innerHTML='';
    const media = (Array.isArray(contents) ? contents : []).filter(c => c.type === 'media');
    if (media.length === 0) { addSection('media'); return; }
    media.sort((a,b)=>(a.order??0)-(b.order??0)).forEach(sec => {
      const sectionEl = cloneTemplate('tpl-section-media');
      if (!sectionEl) return;
      const existing = document.createElement('input');
      existing.type = 'hidden'; existing.className='lesson-media-existing';
      existing.value = JSON.stringify(Array.isArray(sec?.data?.files) ? sec.data.files : []);
      sectionEl.appendChild(existing);
      sectionEl.dataset.uid = nextUid('media');
      makeIdsUnique(sectionEl);
      wireCommonSection(sectionEl);
      wireMediaSection(sectionEl);
      dynamicSections.appendChild(sectionEl);
    });
  }

  function hideLessonModal() {
    if (!addLessonModal) return;
    addLessonModal.classList.add('hidden');
    addLessonModal.classList.remove('flex');
    lessonForm?.reset();
    if (lessonIdInput) lessonIdInput.value = '';
    lessonTitleInput?.classList.remove('border-red-500');
    if (dynamicSections) dynamicSections.innerHTML = '';
    if (lessonTopicInput) lessonTopicInput.value = '';
    hideFormError();
    const header = document.querySelector('#add-lesson-modal .lesson-modal-header h3');
    if (header) header.textContent = 'Add New Lesson';
    if (addLessonBtn) addLessonBtn.textContent = 'Add Lesson';
  }

  // Reset/hide lessons UI when switching quarters or modules
  function resetLessonsUI() {
    hideLessonModal();
    hideViewLessonModal();
    if (lessonsListContainer) {
      lessonsListContainer.innerHTML = '';
      lessonsListContainer.classList.add('hidden');
      lessonsListContainer.classList.remove('grid');
      lessonsListContainer.style.display = 'none';
    }
    if (emptyLessons) {
      emptyLessons.innerHTML = '';
      emptyLessons.classList.add('hidden');
    }
    if (lessonsSection) {
      lessonsSection.classList.remove('active');
      lessonsSection.classList.add('hidden');
    }
    // reset header back to generic
    setLessonsHeader('Module'); // <-- new
  }

  // ---------- Dynamic content sections (add / remove / reorder) ----------
  // Unique IDs per section instance
  const nextUid = (() => { let i = 0; return (p = 's') => `${p}-${Date.now().toString(36)}-${(i++).toString(36)}`; })();

  function makeIdsUnique(sectionEl) {
    sectionEl.querySelectorAll('[id]').forEach(el => {
      const oldId = el.id;
      const newId = `${oldId}-${nextUid('fld')}`;
      sectionEl.querySelectorAll(`label[for="${oldId}"]`).forEach(l => l.setAttribute('for', newId));
      el.id = newId;
    });
  }

  // Drag n drop (grab by handle)
  let draggedSection = null;
  function addDragAndDrop(sectionEl) {
    const handle = sectionEl.querySelector('.section-drag-handle') || sectionEl;
    handle.addEventListener('pointerdown', () => sectionEl.setAttribute('draggable', 'true'));
    handle.addEventListener('pointerup', () => sectionEl.removeAttribute('draggable'));
    sectionEl.addEventListener('dragstart', (e) => {
      draggedSection = sectionEl;
      sectionEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', sectionEl.dataset.uid || 'section'); } catch {}
    });
    sectionEl.addEventListener('dragend', () => {
      sectionEl.classList.remove('dragging');
      sectionEl.removeAttribute('draggable');
      draggedSection = null;
      dynamicSections?.querySelectorAll('.section.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    sectionEl.addEventListener('dragover', (e) => {
      if (!draggedSection || draggedSection === sectionEl) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      sectionEl.classList.add('drag-over');
    });
    sectionEl.addEventListener('dragleave', () => sectionEl.classList.remove('drag-over'));
    sectionEl.addEventListener('drop', (e) => {
      e.preventDefault();
      sectionEl.classList.remove('drag-over');
      if (!dynamicSections || !draggedSection || draggedSection === sectionEl) return;
      const rect = sectionEl.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      if (before) dynamicSections.insertBefore(draggedSection, sectionEl);
      else dynamicSections.insertBefore(draggedSection, sectionEl.nextSibling);
    });
  }

  function wireCommonSection(sectionEl) {
    sectionEl.querySelector('.section-remove')?.addEventListener('click', () => {
      sectionEl.parentElement?.removeChild(sectionEl);
    });
    addDragAndDrop(sectionEl);
  }

  // wireListSection removed (media-only mode)

  function wireMediaSection(sectionEl) {
    const input = sectionEl.querySelector('input[type="file"][id*="lesson-media"]');
    const preview = sectionEl.querySelector('#lesson-media-preview, div[id*="lesson-media-preview"]');
    const emptyState = sectionEl.querySelector('.media-empty');
    const dropzone = sectionEl.querySelector('.media-dropzone');
    const btnSelect = sectionEl.querySelector('.btn-select-media');
    const btnClear = sectionEl.querySelector('.btn-clear-media');

    if (input) input.multiple = true;

    let files = [];
    let urls = [];

    function revokeAll() {
      urls.forEach(u => { try { URL.revokeObjectURL(u); } catch {} });
      urls = [];
    }

    function updateVisibility() {
      if (btnClear) (files.length > 0 ? btnClear.classList.remove('hidden') : btnClear.classList.add('hidden'));
      if (emptyState) (files.length === 0 ? emptyState.classList.remove('hidden') : emptyState.classList.add('hidden'));
    }

    function syncInputFiles() {
      if (!input) return;
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      input.files = dt.files;
    }

    function renderPreviews(scrollIntoView = false) {
      if (!preview) return;
      revokeAll();
      preview.innerHTML = '';
      if (files.length === 0) { updateVisibility(); return; }

      files.forEach((file, idx) => {
        const item = document.createElement('div');
        item.className = 'media-item';

        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'remove-media';
        rm.setAttribute('aria-label', `Remove ${file.name}`);
        rm.innerHTML = '<i class="fas fa-times"></i>';
        rm.addEventListener('click', () => {
          files.splice(idx, 1);
          syncInputFiles();
          renderPreviews();
        });

        let node;
        const url = URL.createObjectURL(file);
        urls.push(url);

        if (file.type.startsWith('image/')) {
          node = new Image(); node.src = url; node.alt = file.name;
        } else if (file.type.startsWith('video/')) {
          node = document.createElement('video'); node.src = url; node.controls = true; node.muted = true;
        } else if (file.type.startsWith('audio/')) {
          node = document.createElement('audio'); node.src = url; node.controls = true;
        } else {
          // Document/other file preview: show extension badge + filename
          const ext = (file.name.split('.').pop() || '').toUpperCase();
          node = document.createElement('div');
          node.className = 'doc-file-preview flex flex-col items-center justify-center gap-2 p-3 text-xs text-gray-600';
          const badge = document.createElement('div');
          badge.className = 'doc-ext-badge bg-secondary/10 text-secondary px-2 py-1 rounded font-semibold text-[10px]';
          badge.textContent = ext ? (ext.length > 5 ? ext.slice(0,5) : ext) : 'FILE';
          const nameEl = document.createElement('div');
          nameEl.className = 'doc-file-name truncate max-w-[120px]';
          nameEl.title = file.name;
          nameEl.textContent = file.name;
          node.appendChild(badge);
          node.appendChild(nameEl);
        }

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = `${file.name} • ${(file.size / 1024).toFixed(1)} KB`;

        item.appendChild(rm);
        item.appendChild(node);
        item.appendChild(meta);
        preview.appendChild(item);
      });

      updateVisibility();
      if (scrollIntoView && preview.childElementCount > 0) {
        preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function addFiles(list) {
      if (!list || list.length === 0) return;
      const docExt = /\.(pdf|docx?|pptx?|xlsx?|csv|txt)$/i;
      const accepted = Array.from(list).filter(f => {
        if (/^(image|video|audio)\//.test(f.type)) return true;
        if (f.type.startsWith('application/')) return docExt.test(f.name);
        return docExt.test(f.name);
      });
      if (accepted.length === 0) return;
      files = files.concat(accepted);
      syncInputFiles();
      renderPreviews(true);
    }

    input?.addEventListener('change', () => {
      addFiles(input.files);
      input.value = '';
    });

    btnSelect?.addEventListener('click', () => input?.click());

    btnClear?.addEventListener('click', () => {
      revokeAll();
      files = [];
      if (input) input.value = '';
      renderPreviews();
    });

    if (dropzone) {
      ['dragenter', 'dragover'].forEach(ev => {
        dropzone.addEventListener(ev, (e) => {
          e.preventDefault(); e.stopPropagation();
          dropzone.classList.add('ring-2', 'ring-primary', 'bg-white');
        });
      });
      ['dragleave', 'drop'].forEach(ev => {
        dropzone.addEventListener(ev, (e) => {
          e.preventDefault(); e.stopPropagation();
          dropzone.classList.remove('ring-2', 'ring-primary', 'bg-white');
        });
      });
      dropzone.addEventListener('drop', (e) => addFiles(e.dataTransfer?.files));
      dropzone.addEventListener('click', () => input?.click());
      dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input?.click(); }
      });
    }

    // initial state
    updateVisibility();
  }

  function addSection(type) {
    if (!dynamicSections) return;
    if (type !== 'media') return; // only media supported
    const sectionEl = cloneTemplate('tpl-section-media');
    if (!sectionEl) return;
    sectionEl.dataset.uid = nextUid('media');
    makeIdsUnique(sectionEl);
    wireCommonSection(sectionEl);
    wireMediaSection(sectionEl);
    dynamicSections.appendChild(sectionEl);
    sectionEl.querySelector('input[type="file"], .media-dropzone')?.focus();
  }

  // Toolbar buttons
  btnAddMedia?.addEventListener('click', () => addSection('media'));
  // ---------- end dynamic sections ----------

  // ---------- Render ----------
  // Status workflow removed: no badge rendering needed
  function createLessonCard(lessonId, title, description, createdAt, moduleId) {
    const cleanId = String(lessonId).replace(/^lesson-/, '');
    const existing = document.getElementById(`lesson-card-${cleanId}`);
    if (existing) existing.remove();

    const node = cloneTemplate('tpl-lesson-card');
    if (!node) return null;

    node.id = `lesson-card-${cleanId}`;
    node.dataset.lessonId = lessonId;
    node.dataset.moduleId = moduleId;
    node.dataset.type = 'lesson';
    node.dataset.lessonTitle = title;
    node.dataset.lessonDescription = description || '';
    node.dataset.lessonTopic = description || '';
  // node.dataset.lessonStatus removed (status always implicitly approved)

    // Populate
    const titleEl = node.querySelector('.title');
  // const statusEl removed (status badge no longer shown)
    const descriptionWrap = node.querySelector('.lesson-description');
    const descriptionText = node.querySelector('.description-text');
    const descriptionLabel = node.querySelector('.description-label');
    const createdEl = node.querySelector('.created-at');
    if (titleEl) titleEl.textContent = title || '(Untitled)';
  // status badge helpers removed
    if (description) {
      descriptionWrap?.classList.remove('hidden');
      if (descriptionText) descriptionText.textContent = description;
      if (descriptionLabel) descriptionLabel.textContent = 'Topic:';
    } else {
      descriptionWrap?.classList.add('hidden');
      if (descriptionText) descriptionText.textContent = '';
    }
    if (createdEl) createdEl.textContent = `Created: ${createdAt}`;

    // Dropdown
    const dropdownBtn = node.querySelector('.dropdown .menu-trigger');
    const dropdownMenu = node.querySelector('.dropdown-menu');
    if (dropdownBtn && dropdownMenu) {
      dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
          if (menu !== dropdownMenu) menu.classList.add('hidden');
        });
        const expanded = dropdownMenu.classList.toggle('hidden');
        dropdownBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      });
    }

    // Edit
    const editBtn = node.querySelector('.edit-lesson-btn');
    if (editBtn) {
      editBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdownMenu?.classList.add('hidden');

        try {
          const pageOverlay = createLoadingOverlay(document.body, { dark: true, dotsOnly: true, colorClass: 'text-white', message: 'Loading lesson…' });
          pageOverlay.show();
          const lesson = await fetchLessonDetails(node.dataset.lessonId);
          openEditLessonModal(lesson);
          pageOverlay.destroy();
        } catch (err) {
          console.error('Open edit failed:', err);
          showNotification(err.message || 'Failed to load lesson', 'error');
        }
      });
    }
   const viewBtn = node.querySelector('.view-lesson-btn');
   if (viewBtn) {
     viewBtn.addEventListener('click', async (e) => {
       e.preventDefault();
       e.stopPropagation();
       dropdownMenu?.classList.add('hidden');
       try {
         const lesson = await fetchLessonDetails(node.dataset.lessonId);
         openViewLessonModal(lesson);
       } catch (err) {
         console.error('View lesson failed:', err);
         showNotification(err.message || 'Failed to load lesson', 'error');
       }
     });
   }

    // Delete
    const deleteBtn = node.querySelector('.delete-lesson-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const confirmed = await confirmDialog({
          title: 'Delete Lesson',
          message: `Are you sure you want to delete "${title}"?`,
          subtext: 'This action cannot be undone.',
          iconClass: 'fas fa-trash-alt text-red-600',
          confirmText: 'Delete Lesson',
          danger: true
        });
        if (!confirmed) return;

        const pageOverlay = createLoadingOverlay(document.body, {
          dark: true,
          dotsOnly: true,
          colorClass: 'text-white',
          message: 'Deleting lesson…'
        });
        pageOverlay.show();
        try {
          await deleteLesson(lessonId);
        } finally {
          pageOverlay.destroy();
        }
      });
    }

    // Select lesson visual
    node.addEventListener('click', (e) => {
      if (e.target.closest('.dropdown')) return;
      document.querySelectorAll('.lesson-item').forEach(item => item.classList.remove('selected'));
      node.classList.add('selected');
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        node.click();
      }
    });

    return node;
  }

  // ---------- Data ops ----------
  function loadModuleLessons(moduleId) {
    if (!moduleId) return Promise.resolve();

    // Reset UI
    if (lessonsListContainer) {
      lessonsListContainer.style.display = 'none';
      lessonsListContainer.innerHTML = '';
      lessonsListContainer.classList.add('hidden');
      lessonsListContainer.classList.remove('grid');
    }
    document.querySelectorAll('.lesson-item').forEach(item => item.remove());
    emptyLessons?.classList.add('hidden');

    // If fetching is disabled, just show the empty state and exit.
    if (!FETCH_LESSONS_ON_OPEN) {
      if (emptyLessons) {
        emptyLessons.classList.remove('hidden');
        emptyLessons.innerHTML = '';
        const node = cloneTemplate('tpl-empty-lessons');
        if (node) emptyLessons.appendChild(node);
      }
      return Promise.resolve([]);
    }

    const handle = startLoading(lessonsPanel, 'Loading lessons…', { colorClass: 'text-primary' });

    // Endpoint assumption: /science/modules/{moduleId}/lessons
    return fetch(`/science/modules/${moduleId}/lessons`)
      .then(r => { if (!r.ok) throw new Error('Failed to fetch lessons'); return r.json(); })
      .then(response => {
        stopLoading(handle);
        const lessons = Array.isArray(response) ? response : (response.data || []);

        if (lessons.length > 0) {
          if (lessonsListContainer) {
            lessonsListContainer.classList.add('grid');
            lessonsListContainer.classList.remove('hidden');

            const fragment = document.createDocumentFragment();
            lessons.forEach(l => {
              const card = createLessonCard(
                l.id,
                l.title || '',
                l.topic || l.description || '',
                l.created_at ? formatDate(l.created_at) : 'Unknown date',
                moduleId
              );
              if (card) fragment.appendChild(card);
            });
            lessonsListContainer.appendChild(fragment);
            lessonsListContainer.style.display = '';
          }
        } else {
          if (emptyLessons) {
            emptyLessons.classList.remove('hidden');
            emptyLessons.innerHTML = '';
            const node = cloneTemplate('tpl-empty-lessons');
            if (node) emptyLessons.appendChild(node);
          }
          lessonsListContainer?.classList.add('hidden');
          lessonsListContainer?.classList.remove('grid');
        }
      })
      .catch(error => {
        console.error('Error loading lessons:', error);
        stopLoading(handle);
        if (emptyLessons) {
          emptyLessons.innerHTML = '';
          const errNode = cloneTemplate('tpl-error-lessons');
          if (errNode) {
            errNode.querySelector('.error-text')?.append(`Failed to load lessons. ${error.message}`);
            errNode.querySelector('.retry-btn')?.addEventListener('click', () => loadModuleLessons(moduleId));
            emptyLessons.classList.remove('hidden');
            emptyLessons.appendChild(errNode);
          }
        }
        lessonsListContainer?.classList.add('hidden');
      });
  }

  // Collect ordered contents from the modal
  function serializeContents() {
    if (!dynamicSections) return [];
    const mediaSections = Array.from(dynamicSections.querySelectorAll('[data-section="media"]'));
    return mediaSections.map((sec, idx) => {
      const input = sec.querySelector('input[type="file"]');
      const picked = Array.from(input?.files || []).map(f => ({ name: f.name, type: f.type, size: f.size }));
      return { type: 'media', order: idx, data: { files: picked } };
    });
  }

  function addLessonToCurrentModule(title, topic, contentsOverride) {
    const moduleId = currentModuleId;
    if (!moduleId) {
      showNotification('Please select a module first.', 'warning');
      isSavingLesson = false;
      return;
    }

    const contents = Array.isArray(contentsOverride) ? contentsOverride : serializeContents();

    const pageOverlay = createLoadingOverlay(document.body, {
      dark: true,
      dotsOnly: true,
      colorClass: 'text-white',
      message: 'Creating lesson…'
    });
    pageOverlay.show();

    const original = addLessonBtn?.textContent;
    if (addLessonBtn) {
      addLessonBtn.disabled = true;
      addLessonBtn.textContent = 'Adding...';
    }

    // Endpoint: POST /science/lessons
    fetch('/science/lessons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
      },
      body: JSON.stringify({ title, topic, moduleId, contents })
    })
      .then(async r => {
        let data = null;
        try { data = await r.json(); } catch {}
        if (!r.ok) {
          const msg = (data?.errors && Object.values(data.errors).flat().join(' ')) ||
                      data?.message || r.statusText || 'Failed to create lesson';
          throw new Error(msg);
        }
        return data;
      })
      .then(resp => {
        showNotification('Lesson created successfully!', 'success');
        // Always reload from server to reflect canonical list and ordering
        loadModuleLessons(moduleId);
        incrementModuleLessonCount(moduleId, +1);
      })
      .catch(err => {
        console.error('Error creating lesson:', err);
        showNotification(err.message || 'Failed to create lesson', 'error');
        openCreateLessonModal();
        if (lessonTitleInput) lessonTitleInput.value = title;
        showFormError(err.message || 'Failed to create lesson');
      })
      .finally(() => {
        if (addLessonBtn) {
          addLessonBtn.disabled = false;
          if (original) addLessonBtn.textContent = original;
        }
        pageOverlay.destroy();
        isSavingLesson = false;
      });
  }

  function updateLesson(lessonId, title, topic, contentsOverride) {
    const card = document.getElementById(`lesson-card-${String(lessonId).replace('lesson-', '')}`);
    if (!card) { showNotification('Lesson not found', 'error'); isSavingLesson = false; return; }

    const contents = Array.isArray(contentsOverride) ? contentsOverride : serializeContents();

    const pageOverlay = createLoadingOverlay(document.body, {
      dark: true, dotsOnly: true, colorClass: 'text-white', message: 'Saving changes…'
    });
    pageOverlay.show();

    // Endpoint: PUT /science/lessons/{lessonId}
    fetch(`/science/lessons/${lessonId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
      },
      body: JSON.stringify({ title, topic, contents })
    })
      .then(async r => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          const msg = (data?.errors && Object.values(data.errors).flat().join(' ')) ||
                      data?.message || r.statusText || 'Failed to update lesson';
          throw new Error(msg);
        }
        return data || {};
      })
      .then(resp => {
        if (resp.error || (resp.hasOwnProperty('success') && !resp.success)) {
          throw new Error(resp.message || resp.error || 'Failed to update lesson');
        }
        showNotification('Lesson updated successfully!', 'success');
        // Reload to reflect title/contents/status from backend
        if (currentModuleId) loadModuleLessons(currentModuleId);
      })
      .catch(err => {
        console.error('Error updating lesson:', err);
        showNotification(err.message || 'Failed to update lesson', 'error');
        openEditLessonModal({ id: lessonId, title });
        showFormError(err.message || 'Failed to update lesson');
      })
      .finally(() => {
        pageOverlay.destroy();
        isSavingLesson = false;
      });
  }

  function deleteLesson(lessonId) {
    // Endpoint assumption: DELETE /science/lessons/{lessonId}
    return fetch(`/science/lessons/${lessonId}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content') }
    })
      .then(r => { if (!r.ok) throw new Error(`Failed to delete lesson: ${r.statusText}`); return r.json(); })
      .then(resp => {
        if (resp.error || (resp.hasOwnProperty('success') && !resp.success)) {
          throw new Error(resp.message || resp.error || 'Failed to delete lesson');
        }

        showNotification('Lesson deleted successfully!', 'success');

        const card = document.getElementById(`lesson-card-${String(lessonId).replace('lesson-', '')}`);
        if (!card) return true;

        const moduleId = card.dataset.moduleId;
        card.style.opacity = '0';
        card.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          card.parentNode && card.parentNode.removeChild(card);

          // show empty state if none left
          const remaining = document.querySelectorAll('.lesson-item').length;
          if (remaining === 0) {
            if (emptyLessons) {
              emptyLessons.classList.remove('hidden');
              emptyLessons.innerHTML = '';
              const node = cloneTemplate('tpl-empty-lessons');
              if (node) emptyLessons.appendChild(node);
            }
            if (lessonsListContainer) {
              lessonsListContainer.classList.add('hidden');
              lessonsListContainer.classList.remove('grid');
            }
          }

          // decrement module's lesson count
          if (moduleId) incrementModuleLessonCount(moduleId, -1);
        }, 300);

        return true;
      })
      .catch(err => {
        console.error('Error deleting lesson:', err);
        showNotification(`Failed to delete lesson: ${err.message}`, 'error');
        throw err;
      });
  }

  function incrementModuleLessonCount(moduleId, delta) {
    const moduleCard = document.getElementById(`module-card-${String(moduleId).replace('module-', '')}`) ||
                       document.querySelector(`.module-item[data-module-id="${moduleId}"]`);
    if (!moduleCard) return;
    const countEl = moduleCard.querySelector('.lesson-count');
    if (!countEl) return;
    const next = Math.max(0, (parseInt((countEl.textContent || '0').trim(), 10) || 0) + (delta || 0));
    countEl.textContent = String(next);
  }

  // ---------- Public API ----------
  function showLessonManagement(moduleId, moduleTitle = '', moduleTopic = '', quarterId = null) {
    currentModuleId = moduleId;
    currentModuleTitle = resolveModuleTitle(moduleId, moduleTitle); // <-- new
    setLessonsHeader(currentModuleTitle); // <-- new

    if (lessonsSection) {
      lessonsSection.classList.remove('hidden');
      setTimeout(() => lessonsSection.classList.add('active'), 10);
    }
    return loadModuleLessons(moduleId);
  }

  function hideLessonsSection() {
    if (!lessonsSection) return;
    lessonsSection.classList.remove('active');
    setTimeout(() => lessonsSection.classList.add('hidden'), 300);
  }

  window.lessonManagement = {
    showLessonManagement,
    hideLessonsSection,
    loadModuleLessons,
    addLessonToCurrentModule,
    updateLesson,
    deleteLesson,
    createLessonCard,
    hideLessonModal,
    showNotification,
    resetLessonsUI
  };
});