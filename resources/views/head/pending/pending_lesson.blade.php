<div class="pending-lessons-wrapper">

    <div class="pending-lesson-section-header">
        <h2 class="pending-lesson-heading">
            Pending Lessons
        </h2>
        <div class="pending-lesson-filters">
            <button type="button" class="pending-lesson-filter-btn is-active" data-filter="pending">
                <i class="fa-solid fa-clock text-xs"></i>
                Pending
            </button>
            <button type="button" class="pending-lesson-filter-btn" data-filter="under_review">
                <i class="fa-solid fa-magnifying-glass text-xs"></i>
                Under Review
            </button>
        </div>
    </div>

    <!-- Empty state -->
    <div id="pending-lessons-empty-state" class="pending-lesson-empty-state">
        <div class="pending-lesson-empty-icon">
            <i class="fa-solid fa-file-lines text-4xl"></i>
        </div>
        <p data-el="emptyMessage" class="text-xl font-medium text-secondary">No pending lessons created yet.</p>
    </div>

    <div id="pending-lessons-container" class="pending-lessons-container">
        <!-- JS injects cards -->
    </div>
</div>

<!-- Hidden template -->
<div id="pending-lesson-template" class="hidden">
    <div class="pending-lesson-card">
        <div class="pending-lesson-header">
            <div class="pending-lesson-heading-group">
                <h3 class="pending-lesson-title">
                    <span data-el="title" class="line-clamp-2">Unknown</span>
                </h3>
                <span data-el="statusBadge" class="pl-badge pl-badge--pending">Unknown Status</span>
            </div>
            <button class="pending-lesson-view" aria-label="View lesson" title="View">
                <i class="fa-solid fa-eye text-lg"></i>
            </button>
        </div>
        <div class="pending-lesson-body">
            <div class="flex gap-2 flex-wrap mb-2">
                <span data-el="quarterBy" class="pending-lesson-quarter">Unknown Quarter</span>
                <span class="pending-lesson-sep" aria-hidden="true">&gt;</span>
                <span data-el="moduleBy" class="pending-lesson-module">Unknown Module</span>
            </div>
            <p class="pending-lesson-created">
                Created on:
                <span data-el="createdOn" class="text-gray-500">Unknown Date</span>
            </p>
        </div>
        <div class="pending-lesson-footer">
            <div class="pending-lesson-actions">
                <button class="pending-lesson-approve-btn gap-2">
                    <i class="fa-solid fa-thumbs-up text-sm"></i>
                    Approve
                </button>
                <button class="pending-lesson-reject-btn gap-2">
                    <i class="fa-solid fa-thumbs-down text-sm"></i>
                    Reject
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Modal -->
<div id="pending-lesson-modal" class="hidden" aria-hidden="true">
    <div class="pending-lesson-modal-overlay"></div>
    <div class="pending-lesson-modal-wrapper">
        <div class="pending-lesson-modal-panel">
            <div class="pending-lesson-header-modal">
                <h3 class="pending-lesson-title-modal">
                    Pending Lesson Details
                </h3>
                <button class="pending-lesson-close-button" aria-label="Close modal">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
            <div class="pending-lesson-body-modal">
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
                    <span data-el="status" class="pl-badge bg-slate-100 text-slate-700 text-xs">Unknown Status</span>
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

                <!-- Content (accordion) -->
                <div class="pending-lesson-content mt-6 pl-accordion" data-el="contentSection">
                    <button
                        type="button"
                        class="pl-accordion-btn"
                        data-el="contentToggle"
                        aria-expanded="false"
                        aria-controls="pl-content-list"
                    >
                        <span class="inline-flex items-center gap-2">
                            <i class="fa-solid fa-list text-xs"></i>
                            <span id="pl-content-label" class="text-sm font-semibold">Content</span>
                        </span>
                        <i class="fa-solid fa-chevron-down pl-accordion-caret text-xs"></i>
                    </button>
                    <div
                        id="pl-content-list"
                        class="pl-accordion-content"
                        data-el="contentContent"
                        aria-hidden="true"
                        role="region"
                        aria-labelledby="pl-content-label"
                    >
                        <div class="pl-accordion-panel">
                            <div data-el="contentLoading" class="text-sm text-gray-500 hidden">Loading content…</div>
                            <div data-el="contentEmpty" class="text-sm text-gray-500 hidden text-center">No content.</div>
                            <ul data-el="contentList" class="pl-content-list space-y-3"></ul>

                            <template id="pl-content-item-template">
                                <li class="pl-content-item text-sm text-gray-700"></li>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- Review history -->
                <div class="pending-lesson-history mt-6 pl-accordion" data-el="historySection">
                    <button
                        type="button"
                        class="pl-accordion-btn"
                        data-el="historyToggle"
                        aria-expanded="false"
                        aria-controls="pl-history-content"
                    >
                        <span class="inline-flex items-center gap-2">
                            <i class="fa-solid fa-clock-rotate-left text-xs"></i>
                            <span id="pl-history-label" class="text-sm font-semibold">Review history</span>
                        </span>
                        <i class="fa-solid fa-chevron-down pl-accordion-caret text-xs"></i>
                    </button>
                    <div
                        id="pl-history-content"
                        class="pl-accordion-content"
                        data-el="historyContent"
                        aria-hidden="true"
                        role="region"
                        aria-labelledby="pl-history-label"
                    >
                        <div class="pl-accordion-panel">
                            <div data-el="historyLoading" class="text-sm text-gray-500 hidden">Loading history…</div>
                            <div data-el="historyEmpty" class="text-sm text-gray-500 hidden text-center">No history yet.</div>
                            <ul data-el="historyList" class="pl-history-list space-y-3"></ul>
                            <template id="pl-history-item-template">
                                <li class="pl-history-item">
                                    <span class="pl-history-bullet"></span>
                                    <div class="pl-history-content">
                                        <div data-el="action" class="pl-history-action">Action</div>
                                        <div data-el="comment" class="text-sm"></div>
                                        <div class="pl-history-meta">
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
            <div class="pending-lesson-modal-footer">
                <!-- optional footer -->
            </div>
        </div>
    </div>
</div>