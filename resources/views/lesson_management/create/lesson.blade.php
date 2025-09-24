<!-- Lessons Section -->
<div id="lessons-section" class="lesson-section hidden">
  <div class="flex justify-between items-center mb-4">
    <div>
      <h2 class="text-xl font-semibold text-secondary">
        Lessons for <span id="selected-module-name">Module</span>
      </h2>
    </div>
    <button id="create-lesson-btn" class="create-button create-lesson-btn">
      <i class="fas fa-plus mr-2"></i> Create Lesson
    </button>
  </div>

  <div id="lessons-panel" class="lesson-panel">
    <!-- Empty state when no lessons -->
    <div id="empty-lessons" class="empty-lessons hidden"></div>

    <!-- Lessons container -->
    <div id="lessons-list-container" class="lessons-grid hidden">
      <!-- Lessons will be dynamically added here via JavaScript -->
    </div>
  </div>
</div>

<!-- Add Lesson Modal -->
<div id="add-lesson-modal" class="lesson-modal-overlay hidden">
  <div class="lesson-modal-content rounded-lg overflow-hidden">
    <div class="lesson-modal-header bg-secondary">
      <h3 class="text-lg font-semibold text-white">Add New Lesson</h3>
      <button id="close-lesson-modal" class="lesson-modal-close" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="lesson-modal-body">
      <!-- Error Message Area (Initially Hidden) -->
      <div id="lesson-form-error" class="lesson-form-error hidden" role="alert" aria-live="polite">
        <div class="flex">
          <div class="flex-shrink-0">
            <i class="fas fa-exclamation-circle text-red-500" aria-hidden="true"></i>
          </div>
          <div class="ml-3 error-message"></div>
        </div>
      </div>

      <form id="lesson-form">
        <input type="hidden" id="lesson-id">

        <!-- Main title -->
        <div class="mb-4">
          <label for="lesson-title" class="block text-sm font-medium text-primary mb-1">Lesson Title</label>
          <input
            type="text"
            id="lesson-title"
            name="lesson-title"
            placeholder="e.g., Lesson 1"
            class="lesson-input"
          >
        </div>

        <!-- Lesson Topic -->
        <div class="mb-4">
          <label for="lesson-topic" class="block text-sm font-medium text-primary mb-1">Lesson Topic</label>
           <input
            type="text"
            id="lesson-topic"
            name="lesson-topic"
            placeholder="e.g., Gravity on Earth"
             class="lesson-input"
           >
        </div>

        <!-- Media (only) section -->
        <div id="lesson-contents-box" class="content-box">
          <div class="content-box-header">
            <h4 class="title">Media</h4>
            <span class="hint text-xs text-gray-500">Upload images, videos or audio files</span>
          </div>
          <div id="lesson-dynamic-sections" class="content-sections"></div>
          <div class="section-toolbar">
            <button type="button" id="btn-add-media" class="btn btn-secondary">
              <i class="fas fa-plus mr-1"></i> Add Media Block
            </button>
          </div>
        </div>
      </form>
    </div>

    <div class="lesson-modal-footer">
      <button id="add-lesson-btn" class="btn btn-primary">
        Add Lesson
      </button>
    </div>
  </div>
</div>

{{-- Optional section templates (media only) --}}
<template id="tpl-section-media">
  <div class="mb-4 section" data-section="media">
    <div class="section-header flex justify-between items-center mb-1">
      <div class="flex items-center gap-2">
        <button class="section-drag-handle" type="button" aria-label="Drag to reorder">
          <i class="fas fa-grip-vertical"></i>
        </button>
        <label for="lesson-media" class="block text-sm font-medium text-primary">Media</label>
      </div>
      <button type="button" class="section-remove text-red-600 text-sm hover:underline">Remove</button>
    </div>

    <div class="media-uploader">
      <!-- Preview first -->
      <div id="lesson-media-preview" class="media-previews-grid" aria-live="polite"></div>
      <div class="media-empty text-xs text-gray-500">No media selected yet.</div>

      <!-- Upload area below the preview -->
      <input
        type="file"
        id="lesson-media"
        name="lesson-media[]"
  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv"
        class="lesson-input hidden"
        multiple
      >
      <div class="media-dropzone" tabindex="0" role="button" aria-label="Click to choose files or drop them here">
        <i class="fas fa-upload text-gray-500 text-xl mr-2"></i>
        <div class="dz-text">
          <span class="dz-title">Drop files here</span>
          <span class="dz-subtitle">or click to browse</span>
        </div>
      </div>

      <div class="media-actions">
        <button type="button" class="btn btn-secondary btn-select-media">
          <i class="fas fa-folder-open mr-1"></i> Select files
        </button>
        <button type="button" class="btn btn-secondary btn-clear-media hidden">
          <i class="fas fa-times mr-1"></i> Clear all
        </button>
      </div>
    </div>
  </div>
</template>

{{-- Lesson UI templates --}}
<template id="tpl-lesson-notification">
  <div class="lesson-notification">
    <i class="icon mr-2" aria-hidden="true"></i>
    <span class="message"></span>
    <button class="notification-close close-btn" type="button" aria-label="Close">
      <i class="fas fa-times"></i>
    </button>
  </div>
</template>

<template id="tpl-empty-lessons">
  <div class="lessons-empty-state">
    <i class="fas fa-book-open text-4xl mb-3" aria-hidden="true"></i>
    <p>No lessons created yet. Click the button above to create your first lesson.</p>
  </div>
</template>

<template id="tpl-error-lessons">
  <div class="lessons-error-state">
    <i class="fas fa-exclamation-triangle text-4xl mb-3 text-red-500" aria-hidden="true"></i>
    <p class="error-text"></p>
    <button class="lessons-error-retry-btn retry-btn" type="button">Retry</button>
  </div>
</template>

<template id="tpl-lesson-card">
  <div class="lesson-item lesson-card" role="button" tabindex="0" aria-selected="false">
    <div class="lesson-card-header">
      <div class="flex items-start gap-2">
        <h4 class="font-semibold text-lg">
          <span class="title text-secondary"></span>
        </h4>
  <!-- status badge removed -->
      </div>
      <div class="dropdown relative">
        <button
          class="menu-trigger p-2 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
          aria-label="Lesson options"
          aria-haspopup="true"
          aria-expanded="false"
          type="button"
        >
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div class="dropdown-menu hidden" role="menu">
          <a href="#" class="dropdown-item view-lesson-btn" role="menuitem">
            <i class="fas fa-eye mr-2"></i> View Lesson
          </a>
          <a href="#" class="dropdown-item edit-lesson-btn" role="menuitem">
            <i class="fas fa-edit mr-2"></i> Edit Lesson
          </a>
          <a href="#" class="dropdown-item dropdown-item-danger delete-lesson-btn" role="menuitem">
            <i class="fas fa-trash mr-2"></i> Delete Lesson
          </a>
        </div>
      </div>
    </div>
    <!-- Optional description row (hidden until populated) -->
    <div class="lesson-description hidden">
      <span class="description-label">Description:</span>
      <span class="description-text ml-1"></span>
    </div>
    <div class="lesson-meta created-at"></div>
  </div>
</template>

<!-- View Lesson Modal -->
<div id="view-lesson-modal" class="lesson-modal-overlay hidden">
  <div class="lesson-modal-content rounded-lg overflow-hidden">
    <div class="lesson-modal-header bg-secondary">
      <h3 id="view-lesson-title" class="text-lg font-semibold text-white">Lesson Details</h3>
      <button id="close-view-lesson-modal" class="lesson-modal-close" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="lesson-modal-body">
      <div class="mb-4">
        <div class="text-sm text-gray-500">Lesson Title</div>
        <div id="view-lesson-title-text" class="text-base font-medium break-words"></div>
      </div>
      <div class="mb-4">
        <div class="text-sm text-gray-500">Topic</div>
        <div id="view-lesson-topic-text" class="text-base break-words"></div>
      </div>
      <div class="content-box">
        <div class="content-box-header">
          <h4 class="title">Contents</h4>
        </div>
        <div id="view-lesson-contents" class="space-y-4"></div>
      </div>
    </div>
  </div>
</div>

{{-- View-only section templates --}}
<!-- Removed subtext/paragraph/list view templates (media only) -->
<template id="tpl-view-section-media">
  <section class="border border-gray-200 rounded-md p-3 bg-white">
    <h5 class="text-sm font-medium text-secondary mb-2">Media</h5>
    <div data-role="grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"></div>
    <div data-role="empty" class="text-sm text-gray-500">No media attached.</div>
  </section>
</template>