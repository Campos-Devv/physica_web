<template id="ui-dialog-template">
  <div class="ui-dialog-overlay" role="presentation">
    <div class="ui-dialog max-w-md" role="dialog" aria-modal="true">
      <div class="ui-dialog-header">
        <button type="button" class="ui-dialog-x" aria-label="Close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="ui-dialog-body">
        <div class="ui-dialog-hero">
          <div class="ui-dialog-hero-badge">
            <i class="ui-dialog-hero-icon"></i>
          </div>
        </div>

        <h3 class="ui-dialog-title"></h3>
        <div class="ui-dialog-message"></div>
        <div class="ui-dialog-subtext"></div>

        <!-- Slot for extra content -->
        <div class="ui-dialog-extra">
          <!-- Reject comments area (hidden by default) -->
          <div class="ui-reject-area hidden" data-role="reject-area">
            <label class="block text-sm font-medium mb-1" for="reject-comments">Comments</label>
            <textarea id="reject-comments" class="form-input w-full" rows="4" placeholder="Add comments..."></textarea>
            <div class="text-xs text-gray-500 mt-1">
              Minimum <span data-role="reject-min">3</span> characters. Press Ctrl+Enter to submit.
            </div>
          </div>

          <!-- Respond message area (hidden by default) -->
          <div class="ui-respond-area hidden" data-role="respond-area">
            <label class="block text-sm font-medium mb-1" for="respond-message">Reply</label>
            <textarea id="respond-message" class="form-input w-full" rows="4" placeholder="Type your reply..."></textarea>
            <div class="text-xs text-gray-500 mt-1">
              Minimum <span data-role="respond-min">1</span> character. Press Ctrl+Enter to send.
            </div>
          </div>
        </div>
      </div>

      <div class="ui-dialog-footer"></div>
    </div>
  </div>
</template>