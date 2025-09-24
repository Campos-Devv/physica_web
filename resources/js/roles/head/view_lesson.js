// View lessons JavaScript functionality

// Module cache to prevent unnecessary reloading and flickering
const moduleCache = new Map();
let currentQuarterId = null;
let loadingInProgress = false;

/**
 * Main initialization function
 * This ensures all our code runs after the DOM is fully loaded
 * and handles retries if elements aren't available yet
 */
function initViewLessonApp(retryCount = 0) {
    console.log("View Lesson App initializing... (attempt " + (retryCount + 1) + ")");
    
    // Check if we're on the view_lesson page - look for specific element
    const quartersSection = document.getElementById('quarters-section');
    
    // If we're not on the view_lesson page, don't continue with initialization
    if (!quartersSection) {
        if (retryCount < 5) {
            console.log(`Retrying initialization in ${200 * (retryCount + 1)}ms...`);
            setTimeout(() => initViewLessonApp(retryCount + 1), 200 * (retryCount + 1));
            return;
        } else {
            // Not an error, just exit quietly if we're not on the correct page
            console.log("Not on view_lesson page, stopping initialization");
            return;
        }
    }
    
    // Check if the required containers exist in the DOM
    const sectionsContainer = document.querySelectorAll('.section-container');
    if (sectionsContainer.length === 0) {
        console.error("Section containers not found. DOM may not be fully loaded.");
        if (retryCount < 5) {
            console.log(`Retrying initialization in ${200 * (retryCount + 1)}ms...`);
            setTimeout(() => initViewLessonApp(retryCount + 1), 200 * (retryCount + 1));
            return;
        } else {
            console.error("Failed to initialize after multiple attempts. Section containers not found.");
            return;
        }
    }
    
    // Check if quarter cards are available in the DOM
    const quarterCards = document.querySelectorAll('.quarter-card');
    console.log(`Found ${quarterCards.length} quarter cards`);
    
    // Initialize section navigation
    initSectionNavigation();
    
    // Initialize quarter card click handlers
    initQuarterCardHandlers();
    
    // Reset sections state - ensure proper initial visibility
    // Quarters section is visible by default (it doesn't have a hidden class initially)
    // Make sure other sections start hidden
    document.querySelector('#modules-section')?.classList.add('hidden');
    document.querySelector('#lessons-section')?.classList.add('hidden');
    document.querySelector('#lesson-details-section')?.classList.add('hidden');
    
    console.log("View Lesson App successfully initialized!");
}

// Multiple ways to ensure the script runs when DOM is ready
// 1. DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded - Starting initialization");
    setTimeout(initViewLessonApp, 100);
});

// 2. Backup method if DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log(`Document already ${document.readyState} - Running backup initialization`);
    setTimeout(initViewLessonApp, 100);
}
    
    /**
     * Initialize section navigation with back buttons
     */
    function initSectionNavigation() {
        // Back to quarters button handler - just collapses the modules section
        document.querySelector('.back-to-quarters')?.addEventListener('click', function() {
            document.querySelector('#modules-section').classList.add('hidden');
            // If lessons section is visible, hide it too
            document.querySelector('#lessons-section').classList.add('hidden');
            // If lesson details section is visible, hide it too
            document.querySelector('#lesson-details-section').classList.add('hidden');
        });
        
        // Back to modules button handler - just collapses the lessons section
        document.querySelector('.back-to-modules')?.addEventListener('click', function() {
            document.querySelector('#lessons-section').classList.add('hidden');
            // If lesson details section is visible, hide it too
            document.querySelector('#lesson-details-section').classList.add('hidden');
        });
        
        // Back to lessons button handler - just collapses the lesson details section
        document.querySelector('.back-to-lessons')?.addEventListener('click', function() {
            document.querySelector('#lesson-details-section').classList.add('hidden');
        });
    }
    
    /**
     * Initialize click handlers for quarter cards
     * Uses event delegation for more robust handling
     */
    function initQuarterCardHandlers() {
        console.log("Initializing quarter card handlers");
        
        // Get all quarter cards
        const cards = document.querySelectorAll('.quarter-card');
        console.log(`Found ${cards.length} quarter cards to attach handlers to`);
        
        // Use event delegation for more reliable click handling
        document.querySelector('.section-container').addEventListener('click', function(event) {
            // Find closest quarter card if clicked on a child element
            const card = event.target.closest('.quarter-card');
            
            // If click was on or within a quarter card
            if (card) {
                console.log("Quarter card clicked:", card);
                const quarterId = card.getAttribute('data-quarter-id');
                const quarterName = card.querySelector('h3').textContent;
                console.log(`Loading quarter: ${quarterName} (ID: ${quarterId})`);
                
                loadQuarterModules(quarterId, quarterName);
            }
        });
        
        // Also add direct handlers to each card for redundancy
        cards.forEach(card => {
            card.addEventListener('click', function() {
                const quarterId = this.getAttribute('data-quarter-id');
                const quarterName = this.querySelector('h3').textContent;
                console.log(`Direct card click: ${quarterName} (ID: ${quarterId})`);
                
                loadQuarterModules(quarterId, quarterName);
            });
        });
    }
    
    /**
     * Load modules for a quarter
     */
    function loadQuarterModules(quarterId, quarterName) {
        // Prevent multiple simultaneous loads and rapid switching glitches
        if (loadingInProgress) {
            console.log("Loading already in progress, ignoring request");
            return;
        }
        
        // If this is the same quarter we're already viewing, don't reload
        if (currentQuarterId === quarterId) {
            console.log(`Quarter ${quarterName} is already selected, not reloading`);
            return;
        }
        
        // Update state
        currentQuarterId = quarterId;
        loadingInProgress = true;
        
        // Update UI first to provide immediate feedback
        document.querySelector('.selected-quarter-name').textContent = quarterName;
        
        // Make sure the modules section is visible
        document.querySelector('#modules-section').classList.remove('hidden');
        
        // Check if we have cached data for this quarter
        if (moduleCache.has(quarterId)) {
            console.log(`Using cached modules data for quarter "${quarterName}"`);
            const cachedData = moduleCache.get(quarterId);
            renderModules(cachedData.modules, quarterName);
            loadingInProgress = false;
            return;
        }
        
        // If not cached, show loading state and fetch
        document.querySelector('.modules-container').innerHTML = createLoadingHTML(`Loading modules for ${quarterName}...`);
        
        // Fetch modules for this quarter from top-level collection
        fetch(`/head/quarters/${quarterId}/modules`)
            .then(handleResponse)
            .then(data => {
                loadingInProgress = false;
                if (data.success) {
                    // Cache the results
                    moduleCache.set(quarterId, {
                        modules: data.modules,
                        timestamp: Date.now()
                    });
                    // Only render if this is still the selected quarter (user might have clicked another)
                    if (currentQuarterId === quarterId) {
                        renderModules(data.modules, quarterName);
                    }
                } else {
                    console.error('Failed to load modules:', data.message || 'Unknown error');
                    if (currentQuarterId === quarterId) {
                        renderModules([], quarterName); 
                    }
                }
            })
            .catch(error => {
                loadingInProgress = false;
                console.error('Error fetching modules:', error);
                if (currentQuarterId === quarterId) {
                    renderModules([], quarterName);
                }
            });
    }
    
    /**
     * Render modules in the container
     * @param {Array} modules - The modules data to render
     * @param {string} quarterName - The name of the current quarter
     */
    function renderModules(modules, quarterName) {
        const container = document.querySelector('.modules-container');
        
        // Handle empty modules case with better UI
        if (!modules || modules.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-8">
                    <div class="bg-gray-50 rounded-lg p-6 shadow-sm">
                        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-700">No modules available</h3>
                        <p class="text-gray-500 mt-2">There are no modules assigned to ${quarterName} yet.</p>
                    </div>
                </div>`;
            return;
        }
        
        // Filter to only show approved modules
        const approvedModules = modules.filter(module => module.status === 'approved');
        
        // Handle no approved modules case
        if (approvedModules.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-8">
                    <div class="bg-gray-50 rounded-lg p-6 shadow-sm">
                        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-700">No approved modules</h3>
                        <p class="text-gray-500 mt-2">There are ${modules.length} module(s) for ${quarterName}, but none are approved yet.</p>
                    </div>
                </div>`;
            return;
        }
        
        // Generate HTML for approved modules
        let html = '';
        approvedModules.forEach(module => {
            html += createModuleCardHTML(module);
        });
        
        // No summary info at the top anymore
        
        container.innerHTML = html;
        
        // Add click event listeners to the newly created module cards
        initModuleCardHandlers();
    }
    
    /**
     * Initialize click handlers for module cards
     */
    function initModuleCardHandlers() {
        document.querySelectorAll('.module-card').forEach(card => {
            card.addEventListener('click', function() {
                const moduleId = this.getAttribute('data-module-id');
                const moduleName = this.querySelector('h3').textContent;
                
                loadModuleLessons(moduleId, moduleName);
            });
        });
    }
    
    /**
     * Load lessons for a module
     */
    function loadModuleLessons(moduleId, moduleName) {
        // Show loading state
        document.querySelector('.lessons-container').innerHTML = createLoadingHTML('Loading lessons...');
        
        // Update UI
        document.querySelector('.selected-module-name').textContent = moduleName;
        
        // Instead of hiding modules section, we'll keep it visible and expand below
        document.querySelector('#lessons-section').classList.remove('hidden');
        
        // Fetch lessons for this module
        fetch(`/head/modules/${moduleId}/lessons`)
            .then(handleResponse)
            .then(data => {
                if (data.success) {
                    renderLessons(data.lessons);
                } else {
                    // Handle error silently in the background
                    console.error('Failed to load lessons:', data.message || 'Unknown error');
                    renderLessons([]); // Render empty state instead of error message
                }
            })
            .catch(error => {
                console.error('Error fetching lessons:', error);
                // Render empty state instead of error message
                renderLessons([]);
            });
    }
    
    /**
     * Render lessons in the container
     * @param {Array} lessons - The lessons data to render
     */
    function renderLessons(lessons) {
        const container = document.querySelector('.lessons-container');
        const moduleName = document.querySelector('.selected-module-name').textContent;
        
        if (!lessons || lessons.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-8">
                    <div class="bg-gray-50 rounded-lg p-6 shadow-sm">
                        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-700">No lessons available</h3>
                        <p class="text-gray-500 mt-2">There are no lessons in the module "${moduleName}".</p>
                    </div>
                </div>`;
            return;
        }
        
        // Filter to show only approved lessons
        const approvedLessons = lessons.filter(lesson => lesson.status === 'approved');
        
        if (approvedLessons.length === 0) {
            container.innerHTML = `
                <div class="col-span-3 text-center py-8">
                    <div class="bg-gray-50 rounded-lg p-6 shadow-sm">
                        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <h3 class="text-lg font-medium text-gray-700">No approved lessons</h3>
                        <p class="text-gray-500 mt-2">There are ${lessons.length} lesson(s) in this module, but none are approved yet.</p>
                    </div>
                </div>`;
            return;
        }
        
        // No summary info at the top anymore for consistency with module cards
        
        // Generate HTML for lessons
        let lessonsHtml = '';
        approvedLessons.forEach(lesson => {
            lessonsHtml += createLessonCardHTML(lesson);
        });
        
        container.innerHTML = lessonsHtml;
        
        // Add click event listeners to the newly created lesson cards
        initLessonCardHandlers();
    }
    
    /**
     * Initialize click handlers for lesson cards
     */
    function initLessonCardHandlers() {
        document.querySelectorAll('.lesson-card').forEach(card => {
            card.addEventListener('click', function() {
                const lessonId = this.getAttribute('data-lesson-id');
                
                loadLessonDetails(lessonId);
            });
        });
    }
    
    /**
     * Load details for a lesson
     */
    function loadLessonDetails(lessonId) {
        // Show loading state
        document.querySelector('.lesson-content').innerHTML = createLoadingHTML('Loading lesson details...');
        
        // Update UI
        // Instead of hiding lessons section, we'll keep it visible and expand below
        document.querySelector('#lesson-details-section').classList.remove('hidden');
        
        // Fetch lesson details
        fetch(`/head/lessons/${lessonId}`)
            .then(handleResponse)
            .then(data => {
                if (data.success) {
                    renderLessonDetails(data.lesson);
                } else {
                    // Handle error silently in the background
                    console.error('Failed to load lesson details:', data.message || 'Unknown error');
                    // Create empty lesson object with the id
                    renderLessonDetails({
                        id: lessonId,
                        title: 'Lesson Not Found',
                        description: 'The lesson details could not be loaded.',
                        content: 'The lesson content is unavailable at this time.'
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching lesson details:', error);
                // Provide a fallback lesson object
                renderLessonDetails({
                    id: lessonId,
                    title: 'Error Loading Lesson',
                    description: 'There was a problem loading this lesson.',
                    content: 'Please try again later or contact support if the problem persists.'
                });
            });
    }
    
    /**
     * Render lesson details
     */
    function renderLessonDetails(lesson) {
        const container = document.querySelector('.lesson-content');
        container.innerHTML = createLessonDetailsHTML(lesson);
    }
    
    /**
     * Helper function to create HTML for module card
     * @param {Object} module - The module data to render
     * @return {string} HTML for the module card
     */
    function createModuleCardHTML(module) {
        // Helper function to format dates consistently
        function formatDate(dateValue) {
            if (!dateValue) return 'Unknown';
            
            try {
                if (typeof dateValue === 'object' && dateValue._seconds) {
                    return new Date(dateValue._seconds * 1000).toLocaleDateString();
                } else if (typeof dateValue === 'number') {
                    return new Date(dateValue * 1000).toLocaleDateString();
                } else {
                    return new Date(dateValue).toLocaleDateString();
                }
            } catch (e) {
                return 'Unknown';
            }
        }
        
        // Format dates using the helper function
        const createdDate = formatDate(module.created_at);
        const updatedDate = formatDate(module.updated_at);
        
        // Get module info with fallbacks
        const moduleTitle = module.title || module.name || 'Untitled Module';
        const moduleDescription = module.description || '';
        const createdBy = module.created_by_name || module.created_by || 'Unknown';
        const topic = module.topic || 'General';
        
        return `
            <div class="module-card bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition duration-300 cursor-pointer" data-module-id="${module.id}">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-lg font-medium text-gray-800">${moduleTitle}</h3>
                    <span class="status-badge status-badge-approved">Approved</span>
                </div>
                
                <div class="flex items-center mb-2">
                    <span class="text-xs text-gray-500 mr-4">Topic: <strong>${topic}</strong></span>
                    <span class="text-xs text-gray-500">Created by: <strong>${createdBy}</strong></span>
                </div>
                
                <p class="text-sm text-gray-600 mb-3">${moduleDescription}</p>
                
                <div class="flex justify-between text-xs text-gray-500 border-t pt-2">
                    <div class="flex items-center">
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                        </svg>
                        <span>Created: <strong>${createdDate}</strong></span>
                    </div>
                    <div class="flex items-center">
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                        </svg>
                        <span>Updated: <strong>${updatedDate}</strong></span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Helper function to create HTML for lesson card
     */
    function createLessonCardHTML(lesson) {
        // Helper function to format dates consistently
        function formatDate(dateValue) {
            if (!dateValue) return 'Unknown';
            
            try {
                if (typeof dateValue === 'object' && dateValue._seconds) {
                    return new Date(dateValue._seconds * 1000).toLocaleDateString();
                } else if (typeof dateValue === 'number') {
                    return new Date(dateValue * 1000).toLocaleDateString();
                } else {
                    return new Date(dateValue).toLocaleDateString();
                }
            } catch (e) {
                return 'Unknown';
            }
        }
        
        // Format dates using the helper function
        const createdDate = formatDate(lesson.created_at);
        const updatedDate = formatDate(lesson.updated_at);
        
        return `
            <div class="lesson-card bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition duration-300 cursor-pointer" data-lesson-id="${lesson.id}">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="text-lg font-medium text-gray-800">${lesson.title || 'Untitled Lesson'}</h3>
                    <span class="status-badge status-badge-approved">Approved</span>
                </div>
                
                <div class="flex items-center mb-2">
                    <span class="text-xs text-gray-500 mr-4">Subject: <strong>${lesson.subject || 'General'}</strong></span>
                    <span class="text-xs text-gray-500">Created by: <strong>${lesson.created_by_name || 'Unknown'}</strong></span>
                </div>
                
                <p class="text-sm text-gray-600 mb-3">${lesson.description || ''}</p>
                
                <div class="flex justify-between text-xs text-gray-500 border-t pt-2">
                    <div class="flex items-center">
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                        </svg>
                        <span>Created: <strong>${createdDate}</strong></span>
                    </div>
                    <div class="flex items-center">
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                        </svg>
                        <span>Updated: <strong>${updatedDate}</strong></span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Helper function to create HTML for lesson details
     */
    function createLessonDetailsHTML(lesson) {
        return `
            <h1 class="text-2xl font-bold mb-4">${lesson.title || 'Untitled Lesson'}</h1>
            <div class="mb-4">
                <span class="status-badge status-badge-approved mr-2">
                    Approved
                </span>
                <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    ${lesson.subject || 'No Subject'}
                </span>
            </div>
            
            <div class="mb-4 text-sm text-gray-500">
                <p><strong>Created by:</strong> ${lesson.created_by_name || 'Unknown'}</p>
                <p><strong>Approved on:</strong> ${lesson.processed_at ? new Date(lesson.processed_at).toLocaleDateString() : 'Unknown'}</p>
            </div>
            
            <div class="lesson-detail-section">
                <h3 class="text-lg font-semibold mb-2">Description</h3>
                <p>${lesson.description || 'No description provided.'}</p>
            </div>
            
            <div class="lesson-detail-section">
                <h3 class="text-lg font-semibold mb-2">Content</h3>
                <div class="prose max-w-none">
                    ${lesson.content || 'No content available.'}
                </div>
            </div>
        `;
    }
    
    /**
     * Helper function to create loading HTML
     */
    function createLoadingHTML(message) {
        return `
            <div class="loading-indicator col-span-3">
                <div class="loading-spinner"></div>
                <p class="mt-2 text-gray-500">${message}</p>
            </div>
        `;
    }
    
    /**
     * Helper function to show error message
     */
    function showError(container, message) {
        document.querySelector(container).innerHTML = 
            `<div class="col-span-3 text-center py-4 text-red-600">${message}</div>`;
    }
    
    /**
     * Helper function to handle fetch response
     */
    function handleResponse(response) {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    }
    
    /**
     * Helper function to hide a section
     */
    function hideSection(selector) {
        const section = document.querySelector(selector);
        if (section) {
            // Add the hidden class
            section.classList.add('hidden');
            // Smoothly scroll to the top of the section above it
            setTimeout(() => {
                const sectionAbove = section.previousElementSibling;
                if (sectionAbove && !sectionAbove.classList.contains('hidden')) {
                    sectionAbove.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
        }
    }
    
    /**
     * Helper function to show a section
     */
    function showSection(selector) {
        const section = document.querySelector(selector);
        if (section) {
            // Remove the hidden class
            section.classList.remove('hidden');
            // Smoothly scroll to this section
            setTimeout(() => {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    }
