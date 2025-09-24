import { approveDialog, rejectDialog } from '../../components/dialog';
import { createLoadingOverlay } from '../../components/loading';

/* Pending Quarter page logic */
document.addEventListener('DOMContentLoaded', () => {
    const state = {
        quarters: Array.isArray(window.pendingQuarters) ? window.pendingQuarters : null,
        fetchUrl: document.querySelector('meta[name="pending-quarters-endpoint"]')?.content || '/head/pending-quarters',
        isFetching: false,
        currentFilter: 'pending',
        loadedHistoryIds: new Set(),
        currentQuarterId: null
    };

    const els = {
        wrapper: document.querySelector('.pending-quarters-wrapper'),
        container: document.getElementById('pending-quarters-container'),
        emptyState: document.getElementById('empty-state'),
        template: document.getElementById('pending-quarter-template'),
        modal: document.getElementById('pending-quarter-modal')
    };

    if (!els.container || !els.template) return;

    const loader = createLoadingOverlay(els.container, {
        message: 'Loading quarters…',
        dark: false,
        dotsOnly: true,
        colorClass: 'text-secondary'
    });

    // Use a single fullscreen overlay for both approve and reject
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

    // Helper: robust id
    function getQuarterId(item) {
        return item?.id || item?.docId || item?.quarterId || item?.uid;
    }

    // Small fetch helper
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
            e.status = res.status;
            e.payload = err;
            throw e;
        }
        return res.json().catch(() => ({}));
    }

    const modalRefs = {
        title: els.modal?.querySelector('[data-el="title"]'),
        createdOn: els.modal?.querySelector('[data-el="createdOn"]'),
        status: els.modal?.querySelector('[data-el="status"]'),
        createdBy: els.modal?.querySelector('[data-el="createdBy"]'),
        role: els.modal?.querySelector('[data-el="role"]'),
        strand: els.modal?.querySelector('[data-el="strand"]'),
        historyList: els.modal?.querySelector('[data-el="historyList"]'),
        historyLoading: els.modal?.querySelector('[data-el="historyLoading"]'),
        historyEmpty: els.modal?.querySelector('[data-el="historyEmpty"]'),
        historyItemTpl: els.modal?.querySelector('#pq-history-item-template'),
        historySection: els.modal?.querySelector('[data-el="historySection"]'),
        historyToggle: els.modal?.querySelector('[data-el="historyToggle"]'),
        historyContent: els.modal?.querySelector('[data-el="historyContent"]')
    };

    const emptyMessageEl = els.emptyState?.querySelector('[data-el="emptyMessage"]');

    function toggleEmpty(show) {
        if (!els.emptyState) return;
        if (show && emptyMessageEl) {
            emptyMessageEl.textContent =
                state.currentFilter === 'under_review'
                    ? 'No quarters under review or requiring changes.'
                    : 'No pending quarters created yet.';
        }
        els.emptyState.classList.toggle('hidden', !show);
        els.container.classList.toggle('hidden', show);
    }

    // Strict status enums from backend (removed in_review)
    const STATUS = {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected'
    };
    const STATUS_LABELS = {
        [STATUS.PENDING]: 'Pending',
        [STATUS.APPROVED]: 'Approved',
        [STATUS.REJECTED]: 'Rejected'
    };
    const statusLabel = (s) => STATUS_LABELS[s] || 'Pending';

    function statusBadgeClass(status) {
        switch (status) {
            case STATUS.PENDING:   return 'pq-badge pq-badge--pending';
            case STATUS.REJECTED:  return 'pq-badge pq-badge--rejected';
            case STATUS.APPROVED:  return 'pq-badge pq-badge--approved';
            default:               return 'pq-badge pq-badge--pending';
        }
    }

    // Capitalize first letter of each word (no toLowerCase use)
    function formatStatusText(raw) {
        if (!raw) return 'Pending';
        return raw
            .split(/\s+/)
            .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '')
            .join(' ');
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'Unknown';
        try {
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            return d.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }

    function clearContainer() {
        // Preserve the loader overlay node
        const overlayEl = loader?.el;
        Array.from(els.container.children).forEach(child => {
            if (child !== overlayEl) child.remove();
        });
    }

    function buildCard(item) {
        const node = els.template.firstElementChild.cloneNode(true);
        node.classList.add('pq-anim-in');

        const titleEl = node.querySelector('[data-el="title"]');
        const createdOnEl = node.querySelector('[data-el="createdOn"]');
        const statusBadge = node.querySelector('[data-el="statusBadge"]');
        const viewBtn = node.querySelector('.pending-quarter-view');
        const approveBtn = node.querySelector('.pending-quarter-approve-btn');
        const rejectBtn = node.querySelector('.pending-quarter-reject-btn');
        const actionsEl = node.querySelector('.pending-quarter-actions'); // NEW

        titleEl.textContent = item.title || (item.number ? `Quarter ${item.number}` : 'Untitled Quarter');
        createdOnEl.textContent = formatDate(item.created_at || item.createdOn);

        const s = item.status;
        statusBadge.className = statusBadgeClass(s);
        statusBadge.textContent = s === STATUS.APPROVED ? '' : statusLabel(s);

        // Remove actions on rejected items (Under Review)
        if (s === STATUS.REJECTED) actionsEl?.remove(); // NEW

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
        if (!state.quarters) return [];
        if (state.currentFilter === 'under_review') {
            // Under Review shows rejected (requires changes)
            return state.quarters.filter(q => q.status === STATUS.REJECTED);
        }
        return state.quarters.filter(q => q.status === state.currentFilter);
    }

    // Small helper
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const MIN_SPINNER_MS = 300; // keep loader visible at least this long

    function setFilter(filter) {
        if (state.currentFilter === filter) return;
        state.currentFilter = filter;
        updateFilterButtons();

        // Immediate UX: show loader and clear current cards before fetching
        setLoading(true);
        toggleEmpty(false);
        clearContainer();

        fetchData(); // server fetch by filter for persistence
    }

    function updateFilterButtons() {
        document.querySelectorAll('.pending-quarter-filter-btn').forEach(btn => {
            btn.classList.toggle('is-active', btn.dataset.filter === state.currentFilter);
        });
    }

    function bindFilters() {
        document.querySelectorAll('.pending-quarter-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = btn.dataset.filter;
                if (state.currentFilter === f) return; // no toggle to "all" per requirement
                setFilter(f);
            });
        });
    }

    async function fetchData() {
        state.isFetching = true;
        setLoading(true);

        const start = performance.now();
        try {
            const filterParam = state.currentFilter; // 'pending' | 'under_review' | 'approved' | 'rejected'
            const url = `${state.fetchUrl}?filter=${encodeURIComponent(filterParam)}`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) throw new Error('Failed fetching quarters');
            const data = await res.json();
            state.quarters = Array.isArray(data) ? data : (data.data || []);
        } catch (e) {
            console.warn('[PendingQuarters] Fetch error:', e);
            state.quarters = [];
        } finally {
            // Ensure loader stays a bit so users see it
            const elapsed = performance.now() - start;
            if (elapsed < MIN_SPINNER_MS) {
                await sleep(MIN_SPINNER_MS - elapsed);
            }
            state.isFetching = false;
            setLoading(false);
            render(getFiltered()); // cards already animate with pq-anim-in
        }
    }

    function renderHistory(items = []) {
        if (!modalRefs.historyList) return;
        modalRefs.historyList.innerHTML = '';

        const tpl = modalRefs.historyItemTpl;
        items.forEach(it => {
            let node;
            if (tpl && tpl.content) {
                node = tpl.content.firstElementChild.cloneNode(true);
            } else {
                // Fallback if template is missing: create minimal structure
                node = document.createElement('li');
                node.className = 'pq-history-item';
                node.appendChild(document.createElement('div')).className = 'pq-history-content';
            }

            const actionEl = node.querySelector('[data-el="action"]');
            const commentEl = node.querySelector('[data-el="comment"]');
            const nameEl = node.querySelector('[data-el="actor_name"]');
            const roleEl = node.querySelector('[data-el="actor_role"]');
            const strandEl = node.querySelector('[data-el="actor_strand"]');
            const whenEl = node.querySelector('[data-el="when"]');

            const when = it.createdAt ? new Date(it.createdAt) : null;
            const whenText = when && !isNaN(when) ? when.toLocaleString() : 'Unknown time';
            const actionLabel =
                it.action === 'approve' ? 'Approved' :
                it.action === 'reject'  ? 'Rejected' : (it.action || 'Action');

            if (actionEl) actionEl.textContent = actionLabel;
            if (commentEl) {
                if (it.comment) {
                    commentEl.textContent = it.comment;
                    commentEl.classList.remove('hidden');
                } else {
                    commentEl.textContent = '';
                    commentEl.classList.add('hidden');
                }
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
            const qid = state.currentQuarterId;
            if (!qid || state.loadedHistoryIds.has(qid)) return;
            setHistoryState({ loading: true, empty: false });
            renderHistory([]);
            loadHistory(qid).then(() => state.loadedHistoryIds.add(qid));
        });
    }

    async function loadHistory(quarterId) {
        if (!quarterId || !modalRefs.historyList) return;
        setHistoryState({ loading: true, empty: false });
        renderHistory([]);

        const base = (state.fetchUrl || '/head/pending-quarters').replace(/\/+$/, '');
        const url = `${base}/${encodeURIComponent(quarterId)}/reviews`;

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
            console.warn('History fetch error:', e);
            setHistoryState({ loading: false, empty: true });
        }
    }

    function openModal(item) {
        if (!els.modal) return;
        modalRefs.title.textContent = item.title || 'Unknown Title';
        modalRefs.createdOn.textContent = formatDate(item.created_at || item.createdOn);

        const s = item.status;
        modalRefs.status.className = statusBadgeClass(s) + ' text-xs';
        modalRefs.status.textContent = s === STATUS.APPROVED ? '' : statusLabel(s);

        modalRefs.createdBy.textContent = item.created_by_name || item.createdBy || 'Unknown User';
        if (modalRefs.role)   modalRefs.role.textContent = item.role   || 'Unknown Role';
        if (modalRefs.strand) modalRefs.strand.textContent = item.strand || 'Unknown Strand';

        // Prepare accordion: collapsed by default; lazy-load on expand
        state.currentQuarterId = getQuarterId(item);
        setHistoryCollapsed(true);
        setHistoryState({ loading: false, empty: false });
        renderHistory([]);

        els.modal.classList.remove('hidden');
        els.modal.setAttribute('aria-hidden', 'false');
        els.modal.querySelector('.pending-quarter-close-button')?.focus();

        setupHistoryToggle();
    }

    function closeModal() {
        if (!els.modal) return;
        els.modal.classList.add('hidden');
        els.modal.setAttribute('aria-hidden', 'true');
    }

    function animateOutAndRemove(cardEl, onDone) {
        if (!cardEl) return onDone?.();
        cardEl.classList.add('pq-anim-out');
        cardEl.addEventListener('animationend', () => onDone?.(), { once: true });
    }

    async function handleApprove(item, cardEl) {
        if (item.status !== STATUS.PENDING) return;
        const ok = await approveDialog({
            iconClass: 'fa-solid fa-thumbs-up text-secondary',
            title: 'Are you sure?',
            message: `Approve ${item.title || (item.number ? `Quarter ${item.number}` : 'this quarter')}?`,
            confirmIconClass: 'fa-solid fa-thumbs-up',
        });
        if (!ok) return;

        const id = getQuarterId(item);
        if (!id) return;
        const base = (state.fetchUrl || '/head/pending-quarters').replace(/\/+$/, '');
        const approveUrl = `${base}/${encodeURIComponent(id)}/approve`;

        try {
            blockingLoader.show();
            const data = await apiPost(approveUrl);
            item.status = data.status || STATUS.APPROVED;
            animateOutAndRemove(cardEl, () => render(getFiltered()));
        } catch (e) {
            console.warn('Approve error:', e);
        } finally {
            blockingLoader.hide();
        }
    }

    async function handleReject(item, cardEl) {
        // Only allow reject from pending now
        if (item.status !== STATUS.PENDING) return;

        const res = await rejectDialog({
            iconClass: 'fa-solid fa-thumbs-down text-secondary',
            title: 'Reject Quarter',
            message: `Provide a comment for rejecting ${item.title || (item.number ? `Quarter ${item.number}` : 'this quarter')}.`,
            confirmText: 'Reject',
            confirmIconClass: 'fa-solid fa-thumbs-down',
        });
        if (!res || !res.comments) return;

        const id = getQuarterId(item);
        if (!id) return;
        const base = (state.fetchUrl || '/head/pending-quarters').replace(/\/+$/, '');
        const rejectUrl = `${base}/${encodeURIComponent(id)}/reject`;

        try {
            blockingLoader.show();
            const data = await apiPost(rejectUrl, { comment: res.comments || '' });
            item.status = data.status || STATUS.REJECTED;
            // Switch to Under Review (under_review) after reject
            animateOutAndRemove(cardEl, () => setFilter('under_review'));
        } catch (e) {
            console.warn('Reject error:', e);
        } finally {
            blockingLoader.hide();
        }
    }

    function updateCardStatus(cardEl, newStatus) {
        const badge = cardEl.querySelector('[data-el="statusBadge"]');
        if (!badge) return;
        badge.className = statusBadgeClass(newStatus);
        badge.textContent = newStatus === STATUS.APPROVED ? '' : statusLabel(newStatus || STATUS.PENDING);

        // If changed to rejected, remove actions
        if (newStatus === STATUS.REJECTED) {
            cardEl.querySelector('.pending-quarter-actions')?.remove(); // NEW
        }
    }

    function bindModalClose() {
        if (!els.modal) return;
        els.modal.querySelectorAll('.pending-quarter-close-button').forEach(btn =>
            btn.addEventListener('click', closeModal)
        );
        els.modal.addEventListener('click', (e) => {
            if (e.target === els.modal.firstElementChild) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    // Initial load always fetches current tab from server
    bindModalClose();
    bindFilters();
    fetchData();
});