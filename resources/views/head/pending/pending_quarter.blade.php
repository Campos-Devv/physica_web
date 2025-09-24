<div class="pending-quarters-wrapper">

    <div class="pending-quarter-section-header">
        <h2 class="pending-quarter-heading">
            Pending Quarters
        </h2>
        <div class="pending-quarter-filters">
            <button type="button" class="pending-quarter-filter-btn is-active" data-filter="pending">
                <i class="fa-solid fa-clock text-xs"></i>
                Pending
            </button>
            <button type="button" class="pending-quarter-filter-btn" data-filter="under_review">
                <i class="fa-solid fa-magnifying-glass text-xs"></i>
                Under Review
            </button>
        </div>
    </div>

    {{-- Empty state --}}
    <div id="empty-state" class="pending-quarter-empty-state">
        <div class="pending-quarter-empty-icon">
            <i class="fa-solid fa-book text-4xl"></i>
        </div>
        <p data-el="emptyMessage" class="text-xl font-medium text-secondary">No pending quarters created yet.</p>
    </div>

    <div id="pending-quarters-container" class="pending-quarters-container">
        <!-- JS injects cards -->
    </div>
</div>

{{-- Hidden template --}}
<div id="pending-quarter-template" class="hidden">
    <div class="pending-quarter-card">
        <div class="pending-quarter-header">
            <div class="pending-quarter-heading-group">
                <h3 class="pending-quarter-title">
                    <span data-el="title" class="line-clamp-2">Unknown</span>
                </h3>
                <span data-el="statusBadge" class="pq-badge pq-badge--pending">Unknown Status</span>
            </div>
            <button class="pending-quarter-view" aria-label="View quarter" title="View">
                <i class="fa-solid fa-eye text-lg"></i>
            </button>
        </div>
        <div class="pending-quarter-body">
            <p class="pending-quarter-created">
                Created on:
                <span data-el="createdOn" class=" text-gray-500">Unknown Date</span>
            </p>
        </div>
        <div class="pending-quarter-footer">
            <div class="pending-quarter-actions">
                <button class="pending-quarter-approve-btn gap-2">
                    <i class="fa-solid fa-thumbs-up text-sm"></i>
                    Approve
                </button>
                <button class="pending-quarter-reject-btn gap-2">
                    <i class="fa-solid fa-thumbs-down text-sm"></i>
                    Reject
                </button>
            </div>
        </div>
    </div>
</div>

{{-- Modal --}}
<div id="pending-quarter-modal" class="hidden" aria-hidden="true">
    <div class="pending-quarter-modal-overlay"></div>
    <div class="pending-quarter-modal-wrapper">
        <div class="pending-quarter-modal-panel">
            <div class="pending-quarter-header-modal">
                <h3 class="pending-quarter-title-modal">
                    Pending Quarter Details
                </h3>
                <button class="pending-quarter-close-button" aria-label="Close modal">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
            <div class="pending-quarter-body-modal">
                <!-- Details -->
                <p class="flex justify-between gap-4">
                    <span>Title:</span>
                    <span data-el="title" class="font-medium">Unknown Title</span>
                </p>
                <p class="flex justify-between gap-4">
                    <span>Created on:</span>
                    <span data-el="createdOn" class="font-medium">Unknown Date</span>
                </p>
                <p class="flex justify-between gap-4">
                    <span>Status:</span>
                    <span data-el="status" class="pq-badge bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs">Unknown Status</span>
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
                <div class="pending-quarter-history mt-6 pq-accordion" data-el="historySection">
                    <button
                        type="button"
                        class="pq-accordion-btn"
                        data-el="historyToggle"
                        aria-expanded="false"
                        aria-controls="pq-history-content"
                    >
                        <span class="inline-flex items-center gap-2">
                            <i class="fa-solid fa-clock-rotate-left text-xs"></i>
                            <span id="pq-history-label" class="text-sm font-semibold">Review history</span>
                        </span>
                        <i class="fa-solid fa-chevron-down pq-accordion-caret text-xs"></i>
                    </button>
                    <div
                        id="pq-history-content"
                        class="pq-accordion-content"
                        data-el="historyContent"
                        aria-hidden="true"
                        role="region"
                        aria-labelledby="pq-history-label"
                    >
                        <div class="pq-accordion-panel">
                            <div data-el="historyLoading" class="text-sm text-gray-500 hidden">Loading history…</div>
                            <div data-el="historyEmpty" class="text-sm text-gray-500 hidden text-center">No history yet.</div>
                            <ul data-el="historyList" class="pq-history-list space-y-3"></ul>

                            <!-- Template for a single history item -->
                            <template id="pq-history-item-template">
                                <li class="pq-history-item">
                                    <span class="pq-history-bullet"></span>
                                    <div class="pq-history-content">
                                        <div data-el="action" class="pq-history-action">Action</div>
                                        <div data-el="comment" class="text-sm"></div>
                                        <div class="pq-history-meta">
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
            <div class="pending-quarter-modal-footer">
                <!-- optional footer -->
            </div>
        </div>
    </div>
</div>
