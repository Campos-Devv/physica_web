document.addEventListener('DOMContentLoaded', function () {
    console.log('Lesson management system initialized');

    // Detect managers (optional logs)
    if (!window.quarterManager) console.warn('quarterManager not found');
    if (!window.moduleManager) console.warn('moduleManager not found');

    // Page-level controls for the Create Quarter modal (delegates to quarter.js for real work)
    const openQuarterModalBtn =
        document.getElementById('open-quarter-modal') ||
        document.getElementById('open-quarter-modal-btn');
    const quarterForm = document.getElementById('quarter-form');
    const createQuarterModal = document.getElementById('create-quarter-modal');
    const closeQuarterModalBtn = document.getElementById('close-quarter-modal');
    const cancelQuarterBtn = document.getElementById('cancel-quarter-btn');

    const openQuarterModal = () => {
        quarterForm?.reset();
        createQuarterModal?.classList.remove('hidden');
        createQuarterModal?.classList.add('flex');
    };

    const hideQuarter = () => {
        // Prefer the component’s own hide function if available
        if (window.quarterManager?.hideQuarterModal) {
            window.quarterManager.hideQuarterModal();
            return;
        }
        // Fallback
        createQuarterModal?.classList.add('hidden');
        createQuarterModal?.classList.remove('flex');
    };

    openQuarterModalBtn?.addEventListener('click', openQuarterModal);
    closeQuarterModalBtn?.addEventListener('click', hideQuarter);
    cancelQuarterBtn?.addEventListener('click', hideQuarter);

    // Important: Do NOT handle create/edit/delete for quarters or modules here.
    // quarter.js owns quarter CRUD; module.js (if present) owns module CRUD.
});