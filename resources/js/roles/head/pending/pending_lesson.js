import { createLoadingOverlay } from '../../components/loading';
import { approveDialog, rejectDialog } from '../../components/dialog';

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        lessons: Array.isArray(window.pendingLessons) ? window.pendingLessons : null,
        fetchUrl: document.querySelector('meta[name="pending-lessons-endpoint"]')?.content || '/head/pending-lessons',
        isFetching: false,
        currentFilter: 'pending',
        loadedHistoryIds: new Set(),
        currentLessonId: null,
        loadedContentIds: new Set()
    };

    const els = {
        wrapper: document.querySelector('.pending-lessons-wrapper'),
        container: document.getElementById('pending-lessons-container'),
        emptyState: document.getElementById('pending-lessons-empty-state'),
        template: document.getElementById('pending-lesson-template'),
        modal: document.getElementById('pending-lesson-modal')
    };

    if (!els.container || !els.template) return;

    const loader = createLoadingOverlay(els.container, {
        message: 'Loading lessons…',
        dark: false,
        dotsOnly: true,
        colorClass: 'text-secondary'
    });

    // fullscreen blocking overlay for approve/reject
    const blockingLoader = createLoadingOverlay(document.body, {
        message: 'Processing…',
        dark: true,
        dotsOnly: true,
        colorClass: 'text-white'
    });

    function setLoading(on) {
        if (on) {
            els.wrapper?.classList.add('is-loading');
            els.emptyState?.classList.add('hidden');
            els.container.classList.remove('hidden');
            loader.show();
        } else {
            loader.hide();
            els.wrapper?.classList.remove('is-loading');
        }
    }

    const STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };
    const STATUS_LABELS = {
        [STATUS.PENDING]: 'Pending',
        [STATUS.APPROVED]: 'Approved',
        [STATUS.REJECTED]: 'Rejected'
    };
    const statusLabel = (s) => STATUS_LABELS[s] || 'Pending';
    function statusBadgeClass(status) {
        switch (status) {
            case STATUS.PENDING:   return 'pl-badge pl-badge--pending';
            case STATUS.REJECTED:  return 'pl-badge pl-badge--rejected';
            case STATUS.APPROVED:  return 'pl-badge pl-badge--approved';
            default:               return 'pl-badge pl-badge--pending';
        }
    }

    const emptyMessageEl = els.emptyState?.querySelector('[data-el="emptyMessage"]');
    function toggleEmpty(show) {
        if (!els.emptyState) return;
        if (show && emptyMessageEl) {
            emptyMessageEl.textContent =
                state.currentFilter === 'under_review'
                    ? 'No lessons under review or requiring changes.'
                    : 'No pending lessons created yet.';
        }
        els.emptyState.classList.toggle('hidden', !show);
        els.container.classList.toggle('hidden', show);
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'Unknown';
        try {
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return dateStr; }
    }

    function getLessonId(item) {
        return item?.id || item?.docId || item?.lessonId || item?.uid;
    }

    function clearContainer() {
        const overlayEl = loader?.el;
        Array.from(els.container.children).forEach(child => {
            if (child !== overlayEl) child.remove();
        });
    }

    function buildCard(item) {
        const node = els.template.firstElementChild.cloneNode(true);
        node.classList.add('pl-anim-in');

        const titleEl = node.querySelector('[data-el="title"]');
        const createdOnEl = node.querySelector('[data-el="createdOn"]');
        const statusBadge = node.querySelector('[data-el="statusBadge"]');
        const viewBtn = node.querySelector('.pending-lesson-view');
        const approveBtn = node.querySelector('.pending-lesson-approve-btn');
        const rejectBtn = node.querySelector('.pending-lesson-reject-btn');
        const actionsEl = node.querySelector('.pending-lesson-actions');
        const moduleEl = node.querySelector('[data-el="moduleBy"]');
        const quarterEl = node.querySelector('[data-el="quarterBy"]');

        titleEl.textContent = item.title || (item.number ? `Lesson ${item.number}` : 'Untitled Lesson');
        createdOnEl.textContent = formatDate(item.created_at || item.createdOn);

        if (moduleEl) {
            moduleEl.textContent =
                (item.module_number ? `Module ${item.module_number}` :
                 item.module_id ? `Module: ${item.module_id}` : 'Unknown Module');
        }
        if (quarterEl) {
            quarterEl.textContent =
                (item.quarter_number ? `Quarter ${item.quarter_number}` :
                 item.quarter_id ? `Quarter: ${item.quarter_id}` : 'Unknown Quarter');
        }

        const s = item.status;
        statusBadge.className = statusBadgeClass(s);
        statusBadge.textContent = s === STATUS.APPROVED ? '' : statusLabel(s);

        if (s === STATUS.REJECTED) actionsEl?.remove();

        viewBtn?.addEventListener('click', () => openModal(item));
        approveBtn?.addEventListener('click', () => handleApprove(item, node));
        rejectBtn?.addEventListener('click', () => handleReject(item, node));

        return node;
    }

    function render(list) {
        clearContainer();
        if (!list || !list.length) {
            toggleEmpty(true);
            return;
        }
        toggleEmpty(false);
        const frag = document.createDocumentFragment();
        list.forEach(item => frag.appendChild(buildCard(item)));
        els.container.appendChild(frag);
    }

    function getFiltered() {
        if (!state.lessons) return [];
        if (state.currentFilter === 'under_review') {
            return state.lessons.filter(m => m.status === STATUS.REJECTED);
        }
        return state.lessons.filter(m => m.status === state.currentFilter);
    }

    function setFilter(filter) {
        if (state.currentFilter === filter) return;
        state.currentFilter = filter;
        updateFilterButtons();
        setLoading(true);
        toggleEmpty(false);
        clearContainer();
        // front-end first: render from window.pendingLessons if present
        // setLoading(false);
        // render(getFiltered());
        // later: fetch(`${state.fetchUrl}?filter=${filter}`)
        fetchData();
    }

    async function fetchData() {
        try {
            const base = (state.fetchUrl || '/head/pending-lessons').replace(/\/+$/, '');
            const url = `${base}?filter=${encodeURIComponent(state.currentFilter)}`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const data = res.ok ? await res.json() : [];
            state.lessons = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
            render(getFiltered());
        } catch (e) {
            console.warn('Failed to fetch lessons', e);
            state.lessons = [];
            toggleEmpty(true);
        } finally {
            setLoading(false);
        }
    }

    function updateFilterButtons() {
        document.querySelectorAll('.pending-lesson-filter-btn').forEach(btn => {
            btn.classList.toggle('is-active', btn.dataset.filter === state.currentFilter);
        });
    }
    function bindFilters() {
        document.querySelectorAll('.pending-lesson-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = btn.dataset.filter;
                if (state.currentFilter === f) return;
                setFilter(f);
            });
        });
    }

    const modalRefs = {
        title: els.modal?.querySelector('[data-el="title"]'),
        topic: els.modal?.querySelector('[data-el="topic"]'),
        createdOn: els.modal?.querySelector('[data-el="createdOn"]'),
        status: els.modal?.querySelector('[data-el="status"]'),
        createdBy: els.modal?.querySelector('[data-el="createdBy"]'),
        role: els.modal?.querySelector('[data-el="role"]'),
        strand: els.modal?.querySelector('[data-el="strand"]'),
        contentSection: els.modal?.querySelector('[data-el="contentSection"]'),
        contentToggle: els.modal?.querySelector('[data-el="contentToggle"]'),
        contentContent: els.modal?.querySelector('[data-el="contentContent"]'),
        contentList: els.modal?.querySelector('[data-el="contentList"]'),
        contentLoading: els.modal?.querySelector('[data-el="contentLoading"]'),
        contentEmpty: els.modal?.querySelector('[data-el="contentEmpty"]'),
        historyList: els.modal?.querySelector('[data-el="historyList"]'),
        historyLoading: els.modal?.querySelector('[data-el="historyLoading"]'),
        historyEmpty: els.modal?.querySelector('[data-el="historyEmpty"]'),
        historyItemTpl: els.modal?.querySelector('#pl-history-item-template'),
        historySection: els.modal?.querySelector('[data-el="historySection"]'),
        historyToggle: els.modal?.querySelector('[data-el="historyToggle"]'),
        historyContent: els.modal?.querySelector('[data-el="historyContent"]')
    };

    function renderHistory(items = []) {
        if (!modalRefs.historyList) return;
        modalRefs.historyList.innerHTML = '';
        const tpl = modalRefs.historyItemTpl;
        items.forEach(it => {
            let node;
            if (tpl && tpl.content) {
                node = tpl.content.firstElementChild.cloneNode(true);
            } else {
                node = document.createElement('li');
                node.className = 'pl-history-item';
                node.appendChild(document.createElement('div')).className = 'pl-history-content';
            }
            const actionEl = node.querySelector('[data-el="action"]');
            const commentEl = node.querySelector('[data-el="comment"]');
            const nameEl = node.querySelector('[data-el="actor_name"]');
            const roleEl = node.querySelector('[data-el="actor_role"]');
            const strandEl = node.querySelector('[data-el="actor_strand"]');
            const whenEl = node.querySelector('[data-el="when"]');

            const when = it.createdAt ? new Date(it.createdAt) : null;
            const whenText = (when && !isNaN(when.getTime())) ? when.toLocaleString() : 'Unknown time';
            const actionLabel = it.action === 'approve' ? 'Approved' : it.action === 'reject' ? 'Rejected' : (it.action || 'Action');

            if (actionEl) actionEl.textContent = actionLabel;
            if (commentEl) {
                if (it.comment) { commentEl.textContent = it.comment; commentEl.classList.remove('hidden'); }
                else { commentEl.textContent = ''; commentEl.classList.add('hidden'); }
            }
            if (nameEl)   nameEl.textContent = it.actor_name   || 'Unknown';
            if (roleEl)   roleEl.textContent = it.actor_role   || 'Unknown';
            if (strandEl) strandEl.textContent = it.actor_strand || 'Unknown';
            if (whenEl)   whenEl.textContent = whenText;

            modalRefs.historyList.appendChild(node);
        });
    }

    function setHistoryState({ loading = false, empty = false } = {}) {
        if (!els.modal) return;
        modalRefs.historyLoading?.classList.toggle('hidden', !loading);
        modalRefs.historyEmpty?.classList.toggle('hidden', !empty);
        modalRefs.historyList?.classList.toggle('hidden', loading || empty);
    }

    function setHistoryCollapsed(collapsed) {
        const sec = modalRefs.historySection;
        if (!sec) return;
        sec.classList.toggle('is-open', !collapsed);
        modalRefs.historyToggle?.setAttribute('aria-expanded', (!collapsed).toString());
        modalRefs.historyContent?.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
    }

    function setupHistoryToggle() {
        if (!modalRefs.historyToggle || modalRefs.historyToggle.dataset.bound) return;
        modalRefs.historyToggle.dataset.bound = '1';
        modalRefs.historyToggle.addEventListener('click', () => {
            const willOpen = !modalRefs.historySection?.classList.contains('is-open');
            // apply the new state
            setHistoryCollapsed(!willOpen ? true : false);
            if (!willOpen) return; // closing, no fetch
            const id = state.currentLessonId;
            if (!id || state.loadedHistoryIds.has(id)) return;
            setHistoryState({ loading: true, empty: false });
            renderHistory([]);
            loadHistory(id).then(() => state.loadedHistoryIds.add(id));
        });
    }

    async function loadHistory(lessonId) {
        if (!lessonId || !modalRefs.historyList) return;
        setHistoryState({ loading: true, empty: false });
        renderHistory([]);

        const base = (state.fetchUrl || '/head/pending-lessons').replace(/\/+$/, '');
        const url = `${base}/${encodeURIComponent(lessonId)}/reviews`;
        try {
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) throw new Error('Failed to load history');
            const data = await res.json();
            const items = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
            setHistoryState({ loading: false, empty: items.length === 0 });
            renderHistory(items);
        } catch (e) {
            console.warn('Lesson history fetch error:', e);
            setHistoryState({ loading: false, empty: true });
        }
    }

    function setContentState({ loading = false, empty = false } = {}) {
        if (!els.modal) return;
        modalRefs.contentLoading?.classList.toggle('hidden', !loading);
        modalRefs.contentEmpty?.classList.toggle('hidden', !empty);
        modalRefs.contentList?.classList.toggle('hidden', loading || empty);
    }

    function setContentCollapsed(collapsed) {
        const sec = modalRefs.contentSection;
        if (!sec) return;
        sec.classList.toggle('is-open', !collapsed);
        modalRefs.contentToggle?.setAttribute('aria-expanded', (!collapsed).toString());
        modalRefs.contentContent?.setAttribute('aria-hidden', collapsed ? 'true' : 'false');
    }

    function renderContent(items = []) {
        if (!modalRefs.contentList) return;
        modalRefs.contentList.innerHTML = '';
        const tpl = document.getElementById('pl-content-item-template');
        // Accept Editor.js root object: { blocks: [...] }
        if (!Array.isArray(items)) {
            if (Array.isArray(items?.blocks)) items = items.blocks;
            else return;
        }
        if (!items.length) return;

        let appended = 0;

        const toText = (it) => {
            if (typeof it === 'string') return it;
            if (it && typeof it === 'object') {
                if (typeof it.text === 'string') return it.text;
                const d = it.data;
                if (d) {
                    if (typeof d === 'string') return d;
                    if (typeof d.text === 'string') return d.text;
                    if (typeof d.caption === 'string') return d.caption;
                    if (typeof d.content === 'string') return d.content;
                }
            }
            return '';
        };

        const urlFrom = (obj) => {
            const d = obj?.data || {};
            return d.url || d.src || (d.file && d.file.url) || obj?.url || obj?.src || '';
        };
        const ext = (u) => {
            try {
                const clean = u.split('?')[0].split('#')[0];
                const m = /\.([a-z0-9]+)$/i.exec(clean);
                return m ? m[1].toLowerCase() : '';
            } catch { return ''; }
        };
        const isVideoExt = (e) => ['mp4','webm','ogg','mov','m4v'].includes(e);
        const isAudioExt = (e) => ['mp3','wav','ogg','m4a'].includes(e);
        const isImageExt = (e) => ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(e);
        const isDocExt   = (e) => ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','zip','rar','csv'].includes(e);

        const renderListBlock = (block) => {
            const d = block?.data || {};
            const items = Array.isArray(d.items) ? d.items : [];
            if (!items.length) return null;
            const isOrdered = (d.style || d.type || d.kind) === 'ordered';
            const listEl = document.createElement(isOrdered ? 'ol' : 'ul');
            listEl.className = isOrdered ? 'pl-content-ol' : 'pl-content-ul';
            items.forEach(li => {
                const liEl = document.createElement('li');
                liEl.textContent = toText(li).trim() || (typeof li === 'string' ? li : '');
                listEl.appendChild(liEl);
            });
            return listEl;
        };

        const renderImageBlock = (block) => {
            const d = block?.data || {};
            const url =
                d.url ||
                d.src ||
                (d.file && d.file.url) ||
                block.url ||
                block.src;
            if (!url) return null;
            const fig = document.createElement('figure');
            const img = document.createElement('img');
            img.src = url;
            img.alt = (d.caption || d.alt || 'Lesson image').toString();
            img.className = 'pl-content-image';
            fig.appendChild(img);
            if (d.caption) {
                const cap = document.createElement('figcaption');
                cap.className = 'pl-content-caption';
                cap.textContent = d.caption;
                fig.appendChild(cap);
            }
            return fig;
        };

        const renderVideoBlock = (block) => {
            const url = urlFrom(block);
            if (!url) return null;
            const e = ext(url);
            if (!(isVideoExt(e) || (block?.type?.toLowerCase() === 'video'))) return null;
            const fig = document.createElement('figure');
            const video = document.createElement('video');
            video.src = url;
            video.controls = true;
            video.className = 'pl-content-video';
            fig.appendChild(video);
            const capText = block?.data?.caption;
            if (capText) {
                const cap = document.createElement('figcaption');
                cap.className = 'pl-content-caption';
                cap.textContent = capText;
                fig.appendChild(cap);
            }
            return fig;
        };

        const renderAudioBlock = (block) => {
            const url = urlFrom(block);
            if (!url) return null;
            const e = ext(url);
            if (!(isAudioExt(e) || (block?.type?.toLowerCase() === 'audio'))) return null;
            const audio = document.createElement('audio');
            audio.src = url;
            audio.controls = true;
            audio.className = 'pl-content-audio';
            return audio;
        };

        const renderFileBlock = (block) => {
            const d = block?.data || {};
            const url = urlFrom(block);
            if (!url) return null;
            const e = ext(url);
            // If it's an image, let image renderer handle it
            if (isImageExt(e)) return null;
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.className = 'pl-content-file';
            const icon = document.createElement('i');
            icon.className = isDocExt(e) ? 'fa-solid fa-file-lines' : 'fa-solid fa-file';
            const name = d.fileName || d.name || url.split('?')[0].split('/').pop();
            const span = document.createElement('span');
            span.textContent = name || 'Download file';
            a.appendChild(icon);
            a.appendChild(span);
            if (typeof d.size === 'number' && d.size > 0) {
                const size = document.createElement('em');
                size.className = 'pl-content-file-size';
                const kb = Math.max(1, Math.round(d.size / 1024));
                size.textContent = ` (${kb} KB)`;
                a.appendChild(size);
            }
            return a;
        };

        const renderGalleryBlock = (block) => {
            const imgs = block?.data?.items || block?.data?.images;
            if (!Array.isArray(imgs) || imgs.length === 0) return null;
            const wrap = document.createElement('div');
            wrap.className = 'pl-content-gallery';
            imgs.forEach(b => {
                const url = urlFrom({ data: b }) || urlFrom(b);
                if (!url) return;
                const img = document.createElement('img');
                img.src = url;
                img.alt = (b?.caption || 'Gallery image').toString();
                img.className = 'pl-content-image';
                wrap.appendChild(img);
            });
            return wrap;
        };

        items.forEach((it) => {
            let el = null;

            // Block with type (e.g., Editor.js-like)
            if (it && typeof it === 'object' && typeof it.type === 'string') {
                const type = it.type.toLowerCase();
                if (type === 'list' || type === 'bulleted_list' || type === 'ordered_list') {
                    el = renderListBlock(it);
                } else if (type === 'gallery') {
                    el = renderGalleryBlock(it);
                } else if (type === 'image' || type === 'img') {
                    el = renderImageBlock(it);
                } else if (type === 'video') {
                    el = renderVideoBlock(it);
                } else if (type === 'audio') {
                    el = renderAudioBlock(it);
                } else if (type === 'file' || type === 'attachment' || type === 'document') {
                    el = renderFileBlock(it);
                } else {
                    // Generic text-like blocks: paragraph, subtext, header, quote, etc.
                    const text = toText(it).trim();
                    if (text) {
                        const p = document.createElement('p');
                        p.textContent = text;
                        el = p;
                    }
                    // If no text but has URL, try to render by extension
                    if (!el) {
                        const u = urlFrom(it);
                        const e = ext(u);
                        if (u && (isVideoExt(e) || isAudioExt(e))) {
                            el = isVideoExt(e) ? renderVideoBlock({ data: { url: u } }) : renderAudioBlock({ data: { url: u } });
                        } else if (u) {
                            el = renderFileBlock({ data: { url: u } });
                        }
                    }
                }
            }

            // Simple string or unknown object with text
            if (!el) {
                const text = toText(it).trim();
                if (text) {
                    const p = document.createElement('p');
                    p.textContent = text;
                    el = p;
                }
            }
            if (!el) return; // skip empty/non-renderable

            // Wrap each rendered piece in an li for spacing consistency
            let node;
            if (tpl && tpl.content) {
                node = tpl.content.firstElementChild.cloneNode(true);
            } else {
                node = document.createElement('li');
                node.className = 'pl-content-item';
            }
            node.innerHTML = ''; // reset
            node.appendChild(el);
            modalRefs.contentList.appendChild(node);
            appended++;
        });

        modalRefs.contentEmpty?.classList.toggle('hidden', appended > 0);
        modalRefs.contentList?.classList.toggle('hidden', appended === 0);
    }

    async function loadContent(lessonId) {
        if (!lessonId || !modalRefs.contentList) return;
        setContentState({ loading: true, empty: false });
        renderContent([]);
        const base = (state.fetchUrl || '/head/pending-lessons').replace(/\/+$/, '');
        const url = `${base}/${encodeURIComponent(lessonId)}`;
        try {
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const data = res.ok ? await res.json() : null;
            const items = Array.isArray(data?.contents) ? data.contents
                         : (Array.isArray(data?.blocks) ? data.blocks : []);
            setContentState({ loading: false, empty: items.length === 0 });
            renderContent(items);
            state.loadedContentIds.add(lessonId);
        } catch (e) {
            console.warn('Lesson content fetch error:', e);
            setContentState({ loading: false, empty: true });
        }
    }

    function setupContentToggle() {
        if (!modalRefs.contentToggle || modalRefs.contentToggle.dataset.bound) return;
        modalRefs.contentToggle.dataset.bound = '1';
        modalRefs.contentToggle.addEventListener('click', () => {
            const willOpen = !modalRefs.contentSection?.classList.contains('is-open');
            setContentCollapsed(!willOpen ? true : false);
            if (!willOpen) return; // closing, no fetch
            const id = state.currentLessonId;
            if (!id || state.loadedContentIds.has(id)) return;
            loadContent(id);
        });
    }

    function openModal(item) {
        if (!els.modal) return;
        modalRefs.title.textContent = item.title || 'Unknown Title';
        modalRefs.topic && (modalRefs.topic.textContent = item.topic || 'Unknown Topic');
        modalRefs.createdOn.textContent = formatDate(item.created_at || item.createdOn);
        const s = item.status;
        modalRefs.status.className = statusBadgeClass(s) + ' text-xs';
        modalRefs.status.textContent = s === STATUS.APPROVED ? '' : statusLabel(s);
        modalRefs.createdBy.textContent = item.created_by_name || item.createdBy || 'Unknown User';
        if (modalRefs.role)   modalRefs.role.textContent = item.role   || 'Unknown Role';
        if (modalRefs.strand) modalRefs.strand.textContent = item.strand || 'Unknown Strand';

        state.currentLessonId = getLessonId(item);
        // reset content accordion
        setContentCollapsed(true);
        setContentState({ loading: false, empty: false });
        renderContent([]);
        // reset history accordion
        setHistoryCollapsed(true);
        setHistoryState({ loading: false, empty: false });
        renderHistory([]);

        els.modal.classList.remove('hidden');
        els.modal.setAttribute('aria-hidden', 'false');
        els.modal.querySelector('.pending-lesson-close-button')?.focus();

        // bind toggles once per page
        setupContentToggle();
        setupHistoryToggle();
    }

    function closeModal() {
        if (!els.modal) return;
        els.modal.classList.add('hidden');
        els.modal.setAttribute('aria-hidden', 'true');
        setContentCollapsed(true);
        setContentState({ loading: false, empty: false });
        renderContent([]);
        setHistoryCollapsed(true);
        setHistoryState({ loading: false, empty: false });
        renderHistory([]);
    }

    function bindModalClose() {
        if (!els.modal || els.modal.dataset.bound) return;
        els.modal.dataset.bound = '1';
        els.modal.querySelectorAll('.pending-lesson-close-button').forEach(btn =>
            btn.addEventListener('click', closeModal)
        );
        const overlay = els.modal.querySelector('.pending-lesson-modal-overlay');
        overlay?.addEventListener('click', closeModal);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    }

    function updateFilterButtons() {
        document.querySelectorAll('.pending-lesson-filter-btn').forEach(btn => {
            btn.classList.toggle('is-active', btn.dataset.filter === state.currentFilter);
        });
    }
    function bindFilters() {
        document.querySelectorAll('.pending-lesson-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = btn.dataset.filter;
                if (state.currentFilter === f) return;
                setFilter(f);
            });
        });
    }

    // small fetch helper (with CSRF)
    async function apiPost(url, body = {}) {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            let err = {}; try { err = await res.json(); } catch {}
            const e = new Error(err?.error || `Request failed: ${res.status}`); e.status = res.status; e.payload = err;
            throw e;
        }
        return res.json().catch(() => ({}));
    }

    function updateCardStatus(cardEl, newStatus) {
        const badge = cardEl.querySelector('[data-el="statusBadge"]');
        if (!badge) return;
        badge.className = statusBadgeClass(newStatus);
        badge.textContent = newStatus === 'approved' ? '' : (STATUS_LABELS[newStatus] || 'Pending');
        if (newStatus === 'rejected') {
            cardEl.querySelector('.pending-lesson-actions')?.remove();
        }
    }

    async function handleApprove(item, cardEl) {
        if (item.status !== 'pending') return;
        const ok = await approveDialog({
            iconClass: 'fa-solid fa-thumbs-up text-secondary',
            title: 'Are you sure?',
            message: `Approve ${item.title || (item.number ? `Lesson ${item.number}` : 'this lesson')}?`,
            confirmIconClass: 'fa-solid fa-thumbs-up',
        });
        if (!ok) return;
        const id = getLessonId(item); if (!id) return;
        const base = (state.fetchUrl || '/head/pending-lessons').replace(/\/+$/, '');
        const approveUrl = `${base}/${encodeURIComponent(id)}/approve`;
        try {
            blockingLoader.show();
            const data = await apiPost(approveUrl);
            item.status = data.status || 'approved';
            updateCardStatus(cardEl, item.status);
            cardEl.classList.add('pl-anim-out');
            cardEl.addEventListener('animationend', () => render(getFiltered()), { once: true });
        } catch (e) {
            console.warn('Lesson approve error:', e);
        } finally {
            blockingLoader.hide();
        }
    }

    async function handleReject(item, cardEl) {
        if (item.status !== 'pending') return;
        const res = await rejectDialog({
            iconClass: 'fa-solid fa-thumbs-down text-secondary',
            title: 'Reject Lesson',
            message: `Provide a comment for rejecting ${item.title || (item.number ? `Lesson ${item.number}` : 'this lesson')}.`,
            confirmText: 'Reject',
            confirmIconClass: 'fa-solid fa-thumbs-down',
        });
        if (!res || !res.comments) return;
        const id = getLessonId(item); if (!id) return;
        const base = (state.fetchUrl || '/head/pending-lessons').replace(/\/+$/, '');
        const rejectUrl = `${base}/${encodeURIComponent(id)}/reject`;
        try {
            blockingLoader.show();
            const data = await apiPost(rejectUrl, { comment: res.comments || '' });
            item.status = data.status || 'rejected';
            cardEl.classList.add('pl-anim-out');
            cardEl.addEventListener('animationend', () => setFilter('under_review'), { once: true });
        } catch (e) {
            console.warn('Lesson reject error:', e);
        } finally {
            blockingLoader.hide();
        }
    }

    // Init (front-end only)
    bindModalClose();
    bindFilters();
    setLoading(true);
    fetchData();
});