<!-- Quarters Section -->
<div class="quarters-section">
    <div class="quarters-header">
        <h2 class="quarters-title">Quarters</h2>
        <div class="quarters-actions">
            <button id="open-quarter-modal-btn" class="quarter-create-button" title="Create Quarter" aria-label="Create Quarter">
                <i class="fas fa-plus"></i>
            </button>
        </div>
    </div>
    
    <!-- Empty state when no quarters -->
    <div id="empty-quarters">
        <i class="fas fa-calendar-alt empty-icon"></i>
        <p class="empty-text">No quarters created yet. Click the button above to create your first quarter.</p>
    </div>
    
    <!-- Quarters container -->
    <div id="quarters-container" class="quarters-grid">
        <!-- Quarters will be dynamically added here via JavaScript -->
    </div>
</div>

<!-- Create Quarter Modal -->
<div id="create-quarter-modal" class="modal-overlay hidden">
    <div class="modal-content quarter-modal">
        <div class="quarter-modal-header">
            <h3 class="text-lg font-semibold">Create New Quarter</h3>
            <button id="close-quarter-modal" class="close-button-icon">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="modal-body">
            <form id="quarter-form">
                <div class="mb-4">
                    <label for="quarter-title" class="block text-sm font-medium text-gray-700 mb-1">Quarter Title</label>
                    <input type="text" id="quarter-title" name="quarter-title" placeholder="e.g., Quarter 1" class="quarter-input">
                    <p class="form-hint">Give your quarter a descriptive title</p>
                </div>
                <input type="hidden" id="quarter-description" name="quarter-description" value="">
            </form>
        </div>
        <div class="modal-footer">
            <button id="create-quarter-btn" class="btn btn-primary">
                Create Quarter
            </button>
        </div>
    </div>
</div>

<!-- Edit Quarter Modal -->
<div id="edit-quarter-modal" class="modal-overlay hidden">
    <div class="modal-content quarter-modal">
        <div class="quarter-modal-header">
            <h3 class="text-lg font-semibold">Edit Quarter</h3>
            <button id="close-edit-quarter-modal" class="close-button-icon" aria-label="Close edit modal">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="modal-body">
            <form id="edit-quarter-form">
                <input type="hidden" id="edit-quarter-id" />
                <div class="mb-4">
                    <label for="edit-quarter-title" class="block text-sm font-medium text-gray-700 mb-1">Quarter Title</label>
                    <input type="text" id="edit-quarter-title" class="quarter-input" placeholder="e.g., Quarter 1" />
                    <p class="form-hint">Update the title for this quarter</p>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button id="save-quarter-btn" class="btn btn-primary">Save Changes</button>
        </div>
    </div>
</div>

<!-- Removed review history modal (no status/review workflow) -->

<!-- Quarter Card Template -->
<template id="quarter-card-template">
    <div class="quarter-card"
         data-quarter-id="" data-quarter-title="" data-quarter-number="">
        <div class="quarter-header">
            <h3 class="quarter-title">
                <span data-el="title"></span>
            </h3>
            <div class="actions relative">
                <button class="menu-button-icon menu-trigger" aria-haspopup="true" aria-expanded="false" aria-label="Card actions">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="dropdown-menu hidden" role="menu">
                    <button class="dropdown-item edit-quarter-btn" role="menuitem">
                        <i class="fas fa-edit mr-2"></i> Edit Quarter
                    </button>
                    <button class="dropdown-item danger delete-quarter-btn" role="menuitem">
                        <i class="fas fa-trash mr-2"></i> Delete Quarter
                    </button>
                </div>
            </div>
        </div>
        <div class="quarter-created">
            Created: <span data-el="createdAt">Recently</span>
        </div>
        <div class="quarter-meta">
            <span class="stat">
                <i class="fas fa-book mr-1"></i>
                <span class="module-count" data-el="modulesCount">0</span> <span data-el="modulesLabel">Modules</span>
            </span>
        </div>

        <!-- Removed review/history UI -->
    </div>
</template>
