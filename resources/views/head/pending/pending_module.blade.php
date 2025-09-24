<div class="pending-modules-wrapper">

    <div class="pending-module-section-header">
        <h2 class="pending-module-heading">
            Pending Modules
        </h2>
        <div class="pending-module-filters">
            <button type="button" class="pending-module-filter-btn is-active" data-filter="pending">
                <i class="fa-solid fa-clock text-xs"></i>
                Pending
            </button>
            <button type="button" class="pending-module-filter-btn" data-filter="under_review">
                <i class="fa-solid fa-magnifying-glass text-xs"></i>
                Under Review
            </button>
        </div>
    </div>

    {{-- Empty state --}}
    <div id="pending-modules-empty-state" class="pending-module-empty-state">
        <div class="pending-module-empty-icon">
            <i class="fa-solid fa-book-open text-4xl"></i>
        </div>
        <p data-el="emptyMessage" class="text-xl font-medium text-secondary">No pending modules created yet.</p>
    </div>

    <div id="pending-modules-container" class="pending-modules-container">
        <!-- JS injects cards -->
    </div>
</div>

{{-- Hidden template --}}
<div id="pending-module-template" class="hidden">
    <div class="pending-module-card">
        <div class="pending-module-header">
            <div class="pending-module-heading-group">
                <h3 class="pending-module-title">
                    <span data-el="title" class="line-clamp-2">Unknown</span>
                </h3>
                <span data-el="statusBadge" class="pm-badge pm-badge--pending">Unknown Status</span>
            </div>
            <button class="pending-module-view" aria-label="View module" title="View">
                <i class="fa-solid fa-eye text-lg"></i>
            </button>
        </div>
        <div class="pending-module-body">
            <span data-el="quarterBy" class="pending-module-quarter">
                Unknown Quarter
            </span>
            
            <p class="pending-module-created">
                Created on:
                <span data-el="createdOn" class=" text-gray-500">Unknown Date</span>
            </p>
        </div>
        <div class="pending-module-footer">
            <div class="pending-module-actions">
                <button class="pending-module-approve-btn gap-2">
                    <i class="fa-solid fa-thumbs-up text-sm"></i>
                    Approve
                </button>
                <button class="pending-module-reject-btn gap-2">
                    <i class="fa-solid fa-thumbs-down text-sm"></i>
                    Reject
                </button>
            </div>
        </div>
    </div>
</div>

{{-- Modal --}}
<div id="pending-module-modal" class="hidden" aria-hidden="true">
    <div class="pending-module-modal-overlay"></div>
    <div class="pending-module-modal-wrapper">
        <div class="pending-module-modal-panel">
            <div class="pending-module-header-modal">
                <h3 class="pending-module-title-modal">
                    Pending Module Details
                </h3>
                <button class="pending-module-close-button" aria-label="Close modal">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
            <div class="pending-module-body-modal">
                <!-- Details -->
                <p class="flex justify-between gap-4">
                    <span>Title:</span>
                    <span data-el="title" class="font-medium">Unknown Title</span>
                </p>
                <p class="flex justify-between gap-4">
                    <span>Topic:</span>
                    <span data-el="topic" class="font-medium">Unknown Topic</span>
                </p>
                <p class="flex justify-between gap-4">
                    <span>Created on:</span>
                    <span data-el="createdOn" class="font-medium">Unknown Date</span>
                </p>
                <p class="flex justify-between gap-4">
                    <span>Status:</span>
                    <span data-el="status" class="pm-badge bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs">Unknown Status</span>
                </p>
                <p class="flex justify-between gap-4">
                    <span>Created by:</span>
                    <span data-el="createdBy" class="font-medium">Unknown User</span>
                </p>
                <p class="flex justify-between gap-4">
                    <span>Role:</span>
                    <span data-el="role" class="font-medium">Unknown Role</span>
                </p>
                <p class="flex justify-between gap-4">
                    <span>Strand:</span>
                    <span data-el="strand" class="font-medium">Unknown Strand</span>
                </p>

                <!-- Review history -->
                <div class="pending-module-history mt-6 pm-accordion" data-el="historySection">
                    <button
                        type="button"
                        class="pm-accordion-btn"
                        data-el="historyToggle"
                        aria-expanded="false"
                        aria-controls="pm-history-content"
                    >
                        <span class="inline-flex items-center gap-2">
                            <i class="fa-solid fa-clock-rotate-left text-xs"></i>
                            <span id="pm-history-label" class="text-sm font-semibold">Review history</span>
                        </span>
                        <i class="fa-solid fa-chevron-down pm-accordion-caret text-xs"></i>
                    </button>
                    <div
                        id="pm-history-content"
                        class="pm-accordion-content"
                        data-el="historyContent"
                        aria-hidden="true"
                        role="region"
                        aria-labelledby="pm-history-label"
                    >
                        <div class="pm-accordion-panel">
                            <div data-el="historyLoading" class="text-sm text-gray-500 hidden">Loading history…</div>
                            <div data-el="historyEmpty" class="text-sm text-gray-500 hidden text-center">No history yet.</div>
                            <ul data-el="historyList" class="pm-history-list space-y-3"></ul>

                            <!-- Template for a single history item -->
                            <template id="pm-history-item-template">
                                <li class="pm-history-item">
                                    <span class="pm-history-bullet"></span>
                                    <div class="pm-history-content">
                                        <div data-el="action" class="pm-history-action">Action</div>
                                        <div data-el="comment" class="text-sm"></div>
                                        <div class="pm-history-meta">
                                            <span data-el="actor_name">Unknown</span>
                                            • <span data-el="actor_role">Unknown</span>
                                            • <span data-el="actor_strand">Unknown</span>
                                            • <span data-el="when">Unknown time</span>
                                        </div>
                                    </div>
                                </li>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
            <div class="pending-module-modal-footer">
                <!-- optional footer -->
            </div>
        </div>
    </div>
</div>