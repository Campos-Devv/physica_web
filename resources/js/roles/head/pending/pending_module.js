import { createLoadingOverlay } from '../../components/loading';
import { approveDialog, rejectDialog } from '../../components/dialog';

document.addEventListener('DOMContentLoaded', () => {
    const state = {
        modules: Array.isArray(window.pendingModules) ? window.pendingModules : null,
        fetchUrl: document.querySelector('meta[name="pending-modules-endpoint"]')?.content || '/head/pending-modules',
        isFetching: false,
        currentFilter: 'pending',
        loadedHistoryIds: new Set(),
        currentModuleId: null
    };

    const els = {
        wrapper: document.querySelector('.pending-modules-wrapper'),
        container: document.getElementById('pending-modules-container'),
        emptyState: document.getElementById('pending-modules-empty-state'),
        template: document.getElementById('pending-module-template'),
        modal: document.getElementById('pending-module-modal')
    };

    if (!els.container || !els.template) return;

    const loader = createLoadingOverlay(els.container, {
        message: 'Loading modules…',
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

    // small fetch helper
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
            let err = {};
            try { err = await res.json(); } catch {}
            const e = new Error(err?.error || `Request failed: ${res.status}`);
            e.status = res.status; e.payload = err;
            throw e;
        }
        return res.json().catch(() => ({}));
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
            case STATUS.PENDING:   return 'pm-badge pm-badge--pending';
            case STATUS.REJECTED:  return 'pm-badge pm-badge--rejected';
            case STATUS.APPROVED:  return 'pm-badge pm-badge--approved';
            default:               return 'pm-badge pm-badge--pending';
        }
    }

    const emptyMessageEl = els.emptyState?.querySelector('[data-el="emptyMessage"]');
    function toggleEmpty(show) {
        if (!els.emptyState) return;
        if (show && emptyMessageEl) {
            emptyMessageEl.textContent =
                state.currentFilter === 'under_review'
                    ? 'No modules under review or requiring changes.'
                    : 'No pending modules created yet.';
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

    function getModuleId(item) {
        return item?.id || item?.docId || item?.moduleId || item?.uid;
    }

    function clearContainer() {
        const overlayEl = loader?.el;
        Array.from(els.container.children).forEach(child => {
            if (child !== overlayEl) child.remove();
        });
    }

    function buildCard(item) {
        const node = els.template.firstElementChild.cloneNode(true);
        node.classList.add('pm-anim-in');

        const titleEl = node.querySelector('[data-el="title"]');
        const createdOnEl = node.querySelector('[data-el="createdOn"]');
        const statusBadge = node.querySelector('[data-el="statusBadge"]');
        const viewBtn = node.querySelector('.pending-module-view');
        const approveBtn = node.querySelector('.pending-module-approve-btn');
        const rejectBtn = node.querySelector('.pending-module-reject-btn');
        const actionsEl = node.querySelector('.pending-module-actions');
        const quarterEl = node.querySelector('[data-el="quarterBy"]'); // NEW

        titleEl.textContent = item.title || (item.number ? `Module ${item.number}` : 'Untitled Module');
        createdOnEl.textContent = formatDate(item.created_at || item.createdOn);
        if (quarterEl) {
            quarterEl.textContent = (item.quarter_number ? `Quarter ${item.quarter_number}` :
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
        if (!state.modules) return [];
        if (state.currentFilter === 'under_review') {
            return state.modules.filter(m => m.status === STATUS.REJECTED);
        }
        return state.modules.filter(m => m.status === state.currentFilter);
    }

    function setFilter(filter) {
        if (state.currentFilter === filter) return;
        state.currentFilter = filter;
        updateFilterButtons();
        setLoading(true);
        toggleEmpty(false);
        clearContainer();
        fetchData(); // now from backend
    }

    function updateFilterButtons() {
        document.querySelectorAll('.pending-module-filter-btn').forEach(btn => {
            btn.classList.toggle('is-active', btn.dataset.filter === state.currentFilter);
        });
    }
    function bindFilters() {
        document.querySelectorAll('.pending-module-filter-btn').forEach(btn => {
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
        historyList: els.modal?.querySelector('[data-el="historyList"]'),
        historyLoading: els.modal?.querySelector('[data-el="historyLoading"]'),
        historyEmpty: els.modal?.querySelector('[data-el="historyEmpty"]'),
        historyItemTpl: els.modal?.querySelector('#pm-history-item-template'),
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
                node.className = 'pm-history-item';
                node.appendChild(document.createElement('div')).className = 'pm-history-content';
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
                if (it.comment) {
                    commentEl.textContent = it.comment; commentEl.classList.remove('hidden');
                } else { commentEl.textContent = ''; commentEl.classList.add('hidden'); }
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
            setHistoryCollapsed(!willOpen ? true : false);
            if (!willOpen) return;
            const mid = state.currentModuleId;
            if (!mid || state.loadedHistoryIds.has(mid)) return;
            setHistoryState({ loading: true, empty: false });
            renderHistory([]);
            loadHistory(mid).then(() => state.loadedHistoryIds.add(mid));
        });
    }

    async function loadHistory(moduleId) {
        if (!moduleId || !modalRefs.historyList) return;
        setHistoryState({ loading: true, empty: false });
        renderHistory([]);

        const base = (state.fetchUrl || '/head/pending-modules').replace(/\/+$/, '');
        const url = `${base}/${encodeURIComponent(moduleId)}/reviews`;

        try {
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) throw new Error('Failed to load history');
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.data || []);
            if (!list.length) {
                setHistoryState({ loading: false, empty: true });
            } else {
                renderHistory(list);
                setHistoryState({ loading: false, empty: false });
            }
        } catch (e) {
            console.warn('Module history fetch error:', e);
            setHistoryState({ loading: false, empty: true });
        }
    }

    function openModal(item) {
        if (!els.modal) return;
        modalRefs.title.textContent = item.title || 'Unknown Title';
        if (modalRefs.topic) modalRefs.topic.textContent = item.topic || 'Unknown Topic';
        modalRefs.createdOn.textContent = formatDate(item.created_at || item.createdOn);
        const s = item.status;
        modalRefs.status.className = statusBadgeClass(s) + ' text-xs';
        modalRefs.status.textContent = s === STATUS.APPROVED ? '' : statusLabel(s);

        modalRefs.createdBy.textContent = item.created_by_name || item.createdBy || 'Unknown User';
        if (modalRefs.role)   modalRefs.role.textContent = item.role   || 'Unknown Role';
        if (modalRefs.strand) modalRefs.strand.textContent = item.strand || 'Unknown Strand';

        state.currentModuleId = getModuleId(item);
        setHistoryCollapsed(true);
        setHistoryState({ loading: false, empty: false });
        renderHistory([]);

        els.modal.classList.remove('hidden');
        els.modal.setAttribute('aria-hidden', 'false');
        els.modal.querySelector('.pending-module-close-button')?.focus();

        setupHistoryToggle();
    }

    async function fetchData() {
        const start = performance.now();
        try {
            const filterParam = state.currentFilter;
            const url = `${state.fetchUrl}?filter=${encodeURIComponent(filterParam)}`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) throw new Error('Failed fetching modules');
            const data = await res.json();
            state.modules = Array.isArray(data) ? data : (data.data || []);
        } catch (e) {
            console.warn('[PendingModules] Fetch error:', e);
            state.modules = [];
        } finally {
            setLoading(false);
            render(getFiltered());
        }
    }

    function updateCardStatus(cardEl, newStatus) {
        const badge = cardEl.querySelector('[data-el="statusBadge"]');
        if (!badge) return;
        badge.className = statusBadgeClass(newStatus);
        badge.textContent = newStatus === STATUS.APPROVED ? '' : statusLabel(newStatus || STATUS.PENDING);
        if (newStatus === STATUS.REJECTED) {
            cardEl.querySelector('.pending-module-actions')?.remove();
        }
    }

    async function handleApprove(item, cardEl) {
        if (item.status !== STATUS.PENDING) return;
        const ok = await approveDialog({
            iconClass: 'fa-solid fa-thumbs-up text-secondary',
            title: 'Are you sure?',
            message: `Approve ${item.title || (item.number ? `Module ${item.number}` : 'this module')}?`,
            confirmIconClass: 'fa-solid fa-thumbs-up',
        });
        if (!ok) return;

        const id = getModuleId(item);
        if (!id) return;
        const base = (state.fetchUrl || '/head/pending-modules').replace(/\/+$/, '');
        const approveUrl = `${base}/${encodeURIComponent(id)}/approve`;

        try {
            blockingLoader.show();
            const data = await apiPost(approveUrl);
            item.status = data.status || STATUS.APPROVED;
            updateCardStatus(cardEl, item.status);
            // remove approved card from current filter
            cardEl.classList.add('pm-anim-out');
            cardEl.addEventListener('animationend', () => render(getFiltered()), { once: true });
        } catch (e) {
            console.warn('Module approve error:', e);
        } finally {
            blockingLoader.hide();
        }
    }

    async function handleReject(item, cardEl) {
        if (item.status !== STATUS.PENDING) return;
        const res = await rejectDialog({
            iconClass: 'fa-solid fa-thumbs-down text-secondary',
            title: 'Reject Module',
            message: `Provide a comment for rejecting ${item.title || (item.number ? `Module ${item.number}` : 'this module')}.`,
            confirmText: 'Reject',
            confirmIconClass: 'fa-solid fa-thumbs-down',
        });
        if (!res || !res.comments) return;

        const id = getModuleId(item);
        if (!id) return;
        const base = (state.fetchUrl || '/head/pending-modules').replace(/\/+$/, '');
        const rejectUrl = `${base}/${encodeURIComponent(id)}/reject`;

        try {
            blockingLoader.show();
            const data = await apiPost(rejectUrl, { comment: res.comments || '' });
            item.status = data.status || STATUS.REJECTED;
            // switch to Under Review after reject
            cardEl.classList.add('pm-anim-out');
            cardEl.addEventListener('animationend', () => setFilter('under_review'), { once: true });
        } catch (e) {
            console.warn('Module reject error:', e);
        } finally {
            blockingLoader.hide();
        }
    }

    // ADD: close modal helpers so init doesn’t crash
    function closeModal() {
        if (!els.modal) return;
        els.modal.classList.add('hidden');
        els.modal.setAttribute('aria-hidden', 'true');
        setHistoryCollapsed(true);
        setHistoryState({ loading: false, empty: false });
        renderHistory([]);
    }

    function bindModalClose() {
        if (!els.modal || els.modal.dataset.bound) return;
        els.modal.dataset.bound = '1';
        els.modal.querySelectorAll('.pending-module-close-button').forEach(btn =>
            btn.addEventListener('click', closeModal)
        );
        // click overlay to close
        const overlay = els.modal.querySelector('.pending-module-modal-overlay');
        overlay?.addEventListener('click', closeModal);
        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    // Init
    bindModalClose();
    bindFilters();
    fetchData();
});