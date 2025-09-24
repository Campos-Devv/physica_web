import { createLoadingOverlay } from '../../components/loading';
import { confirmDialog } from '../../components/dialog';
import { showNotification } from '../../components/notification';

// Prevent duplicate initialization if this script is included twice
if (!window.__quarterModuleLoaded) {
window.__quarterModuleLoaded = true;

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements for quarter management
    const quartersSection = document.querySelector('.quarters-section');
    const openQuarterModalBtn = document.getElementById('open-quarter-modal-btn');
    const createQuarterBtn = document.getElementById('create-quarter-btn');
    const closeQuarterModal = document.getElementById('close-quarter-modal');
    const createQuarterModal = document.getElementById('create-quarter-modal');
    const quarterForm = document.getElementById('quarter-form');
    const quarterTitleInput = document.getElementById('quarter-title');

    // API Endpoints
    const QUARTERS_API_URL = '/science/quarters';
    const MAX_QUARTERS = 4;

    // DOM elements for quarter edit modal
    const editQuarterModal = document.getElementById('edit-quarter-modal');
    const closeEditQuarterModal = document.getElementById('close-edit-quarter-modal');
    const saveQuarterBtn = document.getElementById('save-quarter-btn');
    const editQuarterForm = document.getElementById('edit-quarter-form');
    const editQuarterIdInput = document.getElementById('edit-quarter-id');
    const editQuarterTitleInput = document.getElementById('edit-quarter-title');

    // DOM elements for quarters display
    const quartersContainer = document.getElementById('quarters-container');
    const emptyQuarters = document.getElementById('empty-quarters');
    const quarterCardTpl = document.getElementById('quarter-card-template');
    // Optional per-page override:
    // quartersContainer.style.setProperty('--quarters-grid-min-height', '260px');

    // If you already use a loading overlay, keep it; just add/remove the class together with it.

    // Keep container visible to preserve height; empty state will toggle separately
    quartersContainer?.classList.remove('hidden');

    // Loading overlay on the GRID ONLY (matches Pending Quarter style)
    const loader = createLoadingOverlay(quartersContainer, {
        message: 'Loading quarters…',
        dark: false,
        dotsOnly: true,
        colorClass: 'text-secondary'
    });

    // Reusable fullscreen overlay for create/update/delete (like Pending Quarter)
    const blockingLoader = createLoadingOverlay(document.body, {
        message: 'Processing…',
        dark: true,
        dotsOnly: true,
        colorClass: 'text-white'
    });

    // Counter and loading guards
    let quarterCounter = 0;
    let isLoading = false;

    // Spinner UX helpers (same feel as Pending Quarter)
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const MIN_SPINNER_MS = 300;

    function setLoading(on) {
        if (on) {
            emptyQuarters?.classList.add('hidden');
            quartersContainer?.classList.add('is-loading');
            loader.show?.();
        } else {
            loader.hide?.();
            quartersContainer?.classList.remove('is-loading');
        }
    }

    // Selection + throttle guards
    let selectedQuarterId = null;
    let lastSelectTs = 0;
    const SELECT_THROTTLE_MS = 300;
    let selectingInFlight = false;

    // Disable/enable other quarter cards during module load
    function disableOtherQuarterCards(exceptNode) {
        const cards = quartersContainer?.querySelectorAll('.quarter-card');
        cards?.forEach(card => {
            if (card !== exceptNode) {
                card.classList.add('pointer-events-none', 'opacity-50', 'cursor-not-allowed');
                card.setAttribute('aria-disabled', 'true');
            }
        });
        quartersContainer?.setAttribute('aria-busy', 'true');
    }

    function enableAllQuarterCards() {
        const cards = quartersContainer?.querySelectorAll('.quarter-card');
        cards?.forEach(card => {
            card.classList.remove('pointer-events-none', 'opacity-50', 'cursor-not-allowed');
            card.removeAttribute('aria-disabled');
        });
        quartersContainer?.removeAttribute('aria-busy');
    }

    function handleSelectQuarter(id, node) {
        if (selectedQuarterId === id) return;

        const now = Date.now();
        if (selectingInFlight || (now - lastSelectTs < SELECT_THROTTLE_MS)) return;
        lastSelectTs = now;

        document.querySelector('.quarter-card.selected')?.classList.remove('selected');
        node.classList.add('selected');
        selectedQuarterId = id;

        // Close any open menus when starting a load
        closeAllMenus();

        const p = window.moduleManager?.selectQuarter?.(id);
        if (p && typeof p.then === 'function') {
            selectingInFlight = true;
            disableOtherQuarterCards(node);
            p.finally(() => {
                selectingInFlight = false;
                enableAllQuarterCards();
            });
        } else {
            // Fallback (should not happen after modules.js change)
            selectingInFlight = true;
            disableOtherQuarterCards(node);
            setTimeout(() => {
                selectingInFlight = false;
                enableAllQuarterCards();
            }, 600);
        }
    }

    // Close any open dropdown when clicking outside or pressing Escape
    function closeAllMenus(except) {
        document.querySelectorAll('.dropdown-menu.is-open').forEach(menu => {
            if (menu !== except) {
                menu.classList.remove('is-open');
                menu.classList.add('hidden');
                const trigger = menu.closest('.actions')?.querySelector('.menu-trigger');
                trigger?.setAttribute('aria-expanded', 'false');
            }
        });
    }
    document.addEventListener('click', () => closeAllMenus());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllMenus();
    });

    // Show Quarter Modal
    if (openQuarterModalBtn) {
        openQuarterModalBtn.addEventListener('click', function() {
            if (getQuarterCount() >= MAX_QUARTERS) {
                showNotification(`You can only create up to ${MAX_QUARTERS} quarters.`, 'warning');
                updateCreateAvailability();
                return;
            }
            quarterForm?.reset();
            createQuarterModal?.classList.remove('hidden');
            createQuarterModal?.classList.add('flex');
        });
    }

    // Hide Quarter Modal (Close button)
    if (closeQuarterModal) {
        closeQuarterModal.addEventListener('click', function() { hideQuarterModal(); });
    }

    // In-memory state (no filtering / status anymore)
    let quartersAll = [];

    // Create Quarter and hide modal
    if (createQuarterBtn) {
        createQuarterBtn.addEventListener('click', function() {
            if (getQuarterCount() >= MAX_QUARTERS) {
                showNotification(`You can only create up to ${MAX_QUARTERS} quarters.`, 'warning');
                updateCreateAvailability();
                return;
            }

            const quarterTitle = (quarterTitleInput?.value || '').trim();
            if (quarterTitle === '') {
                quarterTitleInput?.classList.add('border-red-500');
                showNotification('Quarter title is required.', 'error');
                return;
            }

            // If user typed only "Quarter" with no number, ask for a number
            if (/^quarter\s*$/i.test(quarterTitle)) {
                showNotification('Please include a quarter number, e.g., "Quarter 2".', 'warning');
                return;
            }

            // Prevent double submit (no spinner/text swap)
            createQuarterBtn.disabled = true;

            const usedNumbers = getUsedQuarterNumbers();
            const quarterNumberMatch = quarterTitle.match(/Quarter\s+(\d+)/i);
            let quarterNumber = quarterNumberMatch ? parseInt(quarterNumberMatch[1], 10) : null;

            if (quarterNumber != null) {
                if (quarterNumber < 1 || quarterNumber > MAX_QUARTERS) {
                    showNotification(`Quarter number must be between 1 and ${MAX_QUARTERS}.`, 'warning');
                    createQuarterBtn.disabled = false;
                    return;
                }
                if (usedNumbers.has(quarterNumber)) {
                    showNotification(`Quarter ${quarterNumber} already exists.`, 'warning');
                    createQuarterBtn.disabled = false;
                    return;
                }
            } else {
                quarterNumber = computeNextQuarterNumber();
                if (!quarterNumber) {
                    showNotification(`You can only create up to ${MAX_QUARTERS} quarters.`, 'warning');
                    createQuarterBtn.disabled = false;
                    updateCreateAvailability();
                    return;
                }
            }

            const quarterData = { name: quarterTitle, number: quarterNumber };

            // Hide modal immediately when entering loading state
            hideQuarterModal();

            // Fullscreen blocking overlay (reused)
            blockingLoader.setMessage?.('Creating quarter…');
            blockingLoader.show();

            axios.post(QUARTERS_API_URL, quarterData, {
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') }
            })
            .then(response => {
                if (response.data.success) {
                    const created = response.data.data;
                    quartersAll.push(created);
                    renderQuarters();
                    updateCreateAvailability(quartersAll.length);
                    showNotification(`${response.data.data?.name || 'Untitled'} created successfully.`, 'success');
                } else {
                    showNotification('Error creating quarter: ' + (response.data.message || 'Unknown error'), 'error');
                }
            })
            .catch(error => {
                console.error('Error creating quarter:', error);
                const msg = error?.response?.data?.message || 'An error occurred while creating the quarter.';
                showNotification('Error: ' + msg, 'error');
            })
            .finally(() => {
                blockingLoader.hide();
                createQuarterBtn.disabled = false;
            });
        });
    }

    function hideQuarterModal() {
        createQuarterModal?.classList.add('hidden');
        createQuarterModal?.classList.remove('flex');
        quarterForm?.reset();
        quarterTitleInput?.classList.remove('border-red-500');
    }

    // Edit Quarter Modal Events
    if (closeEditQuarterModal) closeEditQuarterModal.addEventListener('click', function() { hideEditQuarterModal(); });

    // Save Quarter Changes
    if (saveQuarterBtn) {
        saveQuarterBtn.addEventListener('click', function() {
            const quarterId = editQuarterIdInput?.value;
            const quarterTitle = (editQuarterTitleInput?.value || '').trim();

            if (quarterTitle === '') {
                editQuarterTitleInput?.classList.add('border-red-500');
                showNotification('Quarter title is required.', 'error');
                return;
            }

            const quarterCard = document.getElementById(quarterId);
            if (!quarterCard) {
                showNotification('Quarter not found.', 'error');
                return;
            }

            const usedNumbers = getUsedQuarterNumbers();

            // Require a number in Edit (e.g., "Quarter 2")
            const match = quarterTitle.match(/Quarter\s+(\d+)/i);
            if (!match) {
                showNotification('Please include a quarter number, e.g., "Quarter 2".', 'warning');
                return;
            }
            const n = parseInt(match[1], 10);
            const currentNumber = parseInt(quarterCard.dataset.quarterNumber, 10);

            if (isNaN(n) || n < 1 || n > MAX_QUARTERS) {
                showNotification(`Quarter number must be between 1 and ${MAX_QUARTERS}.`, 'warning');
                return;
            }
            if (usedNumbers.has(n) && n !== currentNumber) {
                showNotification(`Quarter ${n} already exists.`, 'warning');
                return;
            }

            // Passed validation — proceed
            saveQuarterBtn.disabled = true;

            // Hide the edit modal immediately
            hideEditQuarterModal();

            // Fullscreen blocking overlay (reused)
            blockingLoader.setMessage?.('Updating quarter…');
            blockingLoader.show();

            const updateData = { name: quarterTitle };
            axios.put(`${QUARTERS_API_URL}/${quarterId}`, updateData, {
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') }
            })
                .then(response => {
                    if (response.data.success) {
                        quarterCard.dataset.quarterTitle = quarterTitle;
                        const titleEl = quarterCard.querySelector('[data-el="title"]');
                        if (titleEl) titleEl.textContent = quarterTitle;

                        if (quarterCard.classList.contains('selected') && window.moduleManager?.updateQuarterInfo) {
                            window.moduleManager.updateQuarterInfo(quarterId);
                        }
                        showNotification(`${quarterTitle} updated successfully.`, 'success');
                    } else {
                        showNotification('Error updating quarter: ' + (response.data.message || 'Unknown error'), 'error');
                    }
                })
                .catch(error => {
                    console.error('Error updating quarter:', error);
                    const msg = error?.response?.data?.message || 'An error occurred while updating the quarter.';
                    showNotification('Error: ' + msg, 'error');
                })
                .finally(() => {
                    blockingLoader.hide();
                    saveQuarterBtn.disabled = false;
                });
        });
    }

    function hideEditQuarterModal() {
        editQuarterModal?.classList.add('hidden');
        editQuarterModal?.classList.remove('flex');
        editQuarterForm?.reset();
        editQuarterTitleInput?.classList.remove('border-red-500');
    }

    // Helpers to enforce quarter limit
    function getQuarterCount() {
        return quartersContainer?.children?.length || 0;
    }
    function getUsedQuarterNumbers() {
        const used = new Set();
        quartersContainer?.querySelectorAll('.quarter-card')?.forEach(card => {
            const n = parseInt(card.dataset.quarterNumber);
            if (!isNaN(n)) used.add(n);
        });
        return used;
    }
    function computeNextQuarterNumber() {
        const used = getUsedQuarterNumbers();
        for (let i = 1; i <= MAX_QUARTERS; i++) {
            if (!used.has(i)) return i;
        }
        return null;
    }
    function updateCreateAvailability(count = getQuarterCount()) {
        const limitReached = count >= MAX_QUARTERS;
        if (openQuarterModalBtn) {
            openQuarterModalBtn.disabled = limitReached;
            openQuarterModalBtn.classList.toggle('cursor-not-allowed', limitReached);
            openQuarterModalBtn.setAttribute('aria-disabled', String(limitReached));
            openQuarterModalBtn.title = limitReached ? `Limit reached: maximum ${MAX_QUARTERS} quarters` : '';
        }
        if (createQuarterBtn) {
            createQuarterBtn.disabled = limitReached;
            createQuarterBtn.title = limitReached ? `Limit reached: maximum ${MAX_QUARTERS} quarters` : '';
        }
    }

    function renderQuarters() {
        quartersContainer.innerHTML = '';
        const list = Array.isArray(quartersAll) ? quartersAll : [];
        if (!list.length) {
            emptyQuarters?.classList.remove('hidden');
        } else {
            emptyQuarters?.classList.add('hidden');
            list.forEach(q => createNewQuarterElement(q));
        }
        updateCreateAvailability(quartersAll.length);
    }

    // Fetch quarters (add/remove is-loading on the grid)
    function fetchQuarters() {
        if (isLoading) return;
        isLoading = true;

        setLoading(true);
        const start = performance.now();

        axios.get(QUARTERS_API_URL)
            .then(response => {
                if (response.data.success) {
                    quartersAll = response.data.data || [];
                    renderQuarters();
                } else {
                    console.error('Error fetching quarters:', response.data.message);
                    emptyQuarters?.classList.remove('hidden');
                    quartersAll = [];
                    updateCreateAvailability(quartersAll.length);
                }
            })
            .catch(error => {
                console.error('Error fetching quarters:', error);
                emptyQuarters?.classList.remove('hidden');
                quartersAll = [];
                updateCreateAvailability(quartersAll.length);
            })
            .finally(async () => {
                // keep spinner visible at least MIN_SPINNER_MS
                const elapsed = performance.now() - start;
                if (elapsed < MIN_SPINNER_MS) {
                    await sleep(MIN_SPINNER_MS - elapsed);
                }
                setLoading(false);
                 isLoading = false;
            });
    }

    // Small fetch helper for GET (kept for potential future use)
    async function apiGet(url) {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
        return res.json().catch(() => ({}));
    }

    // Removed review/history related helpers and POST reply logic

    // ...inside createNewQuarterElement...
    function createNewQuarterElement(quarterData) {
        const quarterNumber = quarterData.number || 0;
        if (quarterNumber > quarterCounter) quarterCounter = quarterNumber;

        // Clone template
        const node = quarterCardTpl.content.firstElementChild.cloneNode(true);

        // Derive id and assign dataset
        const quarterId = quarterData.id || `quarter-${quarterCounter}`;
        node.id = quarterId;
        node.dataset.quarterId = quarterId;
        node.dataset.quarterTitle = quarterData.name || 'Quarter';
        node.dataset.quarterNumber = quarterData.number ?? '';
    // status no longer used

        // Fill content
        node.querySelector('[data-el="title"]').textContent = quarterData.name || 'Quarter';

        // Modules count and label
        const modulesCountEl = node.querySelector('[data-el="modulesCount"]');
        const modulesLabelEl = node.querySelector('[data-el="modulesLabel"]');
        if (modulesCountEl && modulesLabelEl) {
            const count = Number(quarterData.modules_count ?? 0);
            modulesCountEl.textContent = String(count);
            modulesLabelEl.textContent = count === 1 ? 'Module' : 'Modules';
        }

        const createdEl = node.querySelector('[data-el="createdAt"]');
        if (quarterData.created_at) {
            const createdAt = new Date(quarterData.created_at);
            const opts = { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            createdEl.textContent = createdAt.toLocaleString('en-US', opts);
        }

        // Removed status badge & review footer

        // Actions dropdown
        const trigger = node.querySelector('.menu-trigger');
        const menu = node.querySelector('.dropdown-menu');

        if (trigger && menu) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const willOpen = !menu.classList.contains('is-open');
                closeAllMenus(menu);
                if (willOpen) {
                    menu.classList.remove('hidden');
                    menu.classList.add('is-open');
                    trigger.setAttribute('aria-expanded', 'true');
                } else {
                    menu.classList.remove('is-open');
                    menu.classList.add('hidden');
                    trigger.setAttribute('aria-expanded', 'false');
                }
            });

            const editBtn = node.querySelector('.edit-quarter-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editQuarterIdInput.value = quarterId;
                    editQuarterTitleInput.value = node.dataset.quarterTitle || '';
                    editQuarterModal?.classList.remove('hidden');
                    editQuarterModal?.classList.add('flex');
                    closeAllMenus();
                });
            }

            const deleteBtn = node.querySelector('.delete-quarter-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    closeAllMenus();

                    const title = node.dataset.quarterTitle || 'this quarter';
                    const confirmed = await confirmDialog({
                        title: 'Delete Quarter',
                        message: `Are you sure you want to delete "${title}"?`,
                        subtext: 'This action cannot be undone.',
                        iconClass: 'fas fa-trash-alt text-red-600',
                        confirmText: 'Delete Quarter',
                        danger: true
                    });

                    if (confirmed) {
                        blockingLoader.setMessage?.('Deleting quarter…');
                        blockingLoader.show();
                         try {
                            const resp = await axios.delete(`${QUARTERS_API_URL}/${quarterId}`, {
                                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') }
                            });
                            if (resp.data?.success) {
                                // remove from in-memory list
                                const idx = quartersAll.findIndex(q => (q.id || '') === quarterId);
                                if (idx >= 0) quartersAll.splice(idx, 1);
                                const wasSelected = node.classList.contains('selected');
                                node.classList.add('fade-out');
                                setTimeout(() => {
                                    node.remove();
                                    if (wasSelected) {
                                        selectedQuarterId = null;
                                        window.moduleManager?.hideModuleSection?.();
                                    }
                                    renderQuarters();
                                    showNotification('Quarter deleted successfully.', 'success');
                                }, 200);
                            } else {
                                showNotification(resp.data?.message || 'Failed to remove quarter.', 'error');
                            }
                        } catch (err) {
                            console.error('Error deleting quarter:', err);
                            showNotification('Failed to remove quarter. Please try again.', 'error');
                        } finally {
                            blockingLoader.hide();
                            closeAllMenus();
                        }
                    }
                });
            }
        }

        // Select card (menu interactions won’t trigger selection due to stopPropagation)
        node.addEventListener('click', function() { handleSelectQuarter(quarterId, node); });

        quartersContainer.appendChild(node);
        return node;
    }

    // Removed history modal logic

    // Init
    updateCreateAvailability(0);
    fetchQuarters();
    // No filters to initialize

    // Expose for future reuse/debug
    window.quarterManager = {
        fetchQuarters,
        createNewQuarterElement,
        hideQuarterModal,
        hideEditQuarterModal,
        get quarterCounter() { return quarterCounter; }
    };
});
} // end init guard
