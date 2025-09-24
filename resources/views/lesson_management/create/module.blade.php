<!-- Selected Quarter Modules Section (initially hidden) -->
<div id="selected-quarter-section" class="modules-section hidden">
    <div class="flex justify-between items-center mb-4">
        <div>
            <h2 class="text-xl font-semibold text-secondary">Modules for <span id="selected-quarter-name">Quarter</span></h2>
            <input type="hidden" id="selected-quarter-description">
        </div>
        <button id="create-module-btn" class="create-button create-module-btn">
            <i class="fas fa-plus mr-2"></i> Create Module
        </button>
    </div>
    
    <div id="modules-panel" class="modules-panel">
        <!-- Empty state when no modules -->
        <div id="empty-modules" class="empty-modules hidden"></div>
        
        <!-- Modules container -->
        <div id="modules-list-container" class="modules-grid hidden">
            <!-- Modules will be dynamically added here via JavaScript -->
        </div>
    </div>
</div>

<!-- Add Module Modal -->
<div id="add-module-modal" class="module-modal-overlay hidden">
    <div class="module-modal-content rounded-lg overflow-hidden">
        <div class="module-modal-header bg-secondary">
            <h3 class="text-lg font-semibold text-white">Add New Module</h3>
            <button id="close-module-modal" class="module-modal-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="module-modal-body">
            <!-- Error Message Area (Initially Hidden) -->
            <div id="module-form-error" class="module-form-error hidden">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="fas fa-exclamation-circle text-red-500"></i>
                    </div>
                    <div class="ml-3 error-message"></div>
                </div>
            </div>
            
            <form id="module-form">
                <input type="hidden" id="module-quarter-id">
                <input type="hidden" id="module-id">
                <div class="mb-4">
                    <label for="module-title" class="block text-sm font-medium text-primary mb-1">Module Title</label>
                    <input type="text" id="module-title" name="module-title" placeholder="e.g., Module 1, Module 2" 
                        class="module-input">
                </div>
                <div class="mb-4">
                    <label for="module-topic" class="block text-sm font-medium text-primary mb-1">Topic</label>
                    <input type="text" id="module-topic" name="module-topic" placeholder="e.g., Mechanics, Thermodynamics" 
                        class="module-input">
                </div>
            </form>
        </div>
        <div class="module-modal-footer">
            <button id="add-module-btn" class="btn btn-primary">
                Add Module
            </button>
        </div>
    </div>
</div>

{{-- Module UI templates --}}
<template id="tpl-notification">
  <div class="module-notification">
    <i class="icon mr-2"></i>
    <span class="message"></span>
    <button class="notification-close close-btn" type="button" aria-label="Close">
      <i class="fas fa-times"></i>
    </button>
  </div>
</template>

<template id="tpl-empty-modules">
  <div class="modules-empty-state">
    <i class="fas fa-book text-4xl mb-3"></i>
    <p>No modules created yet for this quarter. Click the button above to create your first module.</p>
  </div>
</template>

<template id="tpl-error-modules">
  <div class="modules-error-state">
    <i class="fas fa-exclamation-triangle text-4xl mb-3 text-red-500"></i>
    <p class="error-text"></p>
    <button class="modules-error-retry-btn retry-btn" type="button">Retry</button>
  </div>
</template>

<template id="tpl-module-card">
  <div class="module-item module-card" role="button" tabindex="0" aria-selected="false">
    <div class="module-card-header">
      <div>
        <h4 class="font-semibold text-lg">
          <span class="title text-secondary"></span>
        </h4>
      </div>
      <div class="dropdown relative">
        <button class="menu-trigger p-2 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none" aria-label="Module options" aria-haspopup="true" type="button">
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div class="dropdown-menu hidden" role="menu">
          <a href="#" class="dropdown-item edit-module-btn" role="menuitem">
            <i class="fas fa-edit mr-2"></i> Edit Module
          </a>
          <a href="#" class="dropdown-item dropdown-item-danger delete-module-btn" role="menuitem">
            <i class="fas fa-trash mr-2"></i> Delete Module
          </a>
        </div>
      </div>
    </div>

    <!-- Topic row -->
    <div class="topic module-topic hidden">
      <span class="topic-label">Topic:</span>
      <span class="topic-text ml-1"></span>
    </div>

    <div class="module-meta created-at"></div>

    <!-- Bottom meta -->
    <div class="module-footer-meta">
      <span class="meta-left">
        <i class="fas fa-book-reader mr-1 text-primary"></i>
        <span class="lesson-count">0</span> Lessons
      </span>
      <span class="text-gray-500"></span>
    </div>
  </div>
</template>
