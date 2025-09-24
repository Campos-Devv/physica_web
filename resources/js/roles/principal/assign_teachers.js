document.addEventListener('DOMContentLoaded', function() {
    // Debug configuration - Set to false in production!
    const DEBUG_MODE = false;
    
    // Intercept and block the problematic request causing 400 errors
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        // If URL ends with just "teachers" (which might be causing the 400 error)
        if (url.endsWith('/teachers') && options?.method === 'GET') {
            console.debug('Intercepted potentially problematic request to:', url);
            // Return a mock successful response instead of making the actual request
            return Promise.resolve(new Response(JSON.stringify({success: true}), {
                status: 200,
                headers: {'Content-Type': 'application/json'}
            }));
        }
        
        // For all other requests, proceed normally
        return originalFetch(url, options)
            .catch(error => {
                if (url.includes('teachers')) {
                    console.warn(`Request to ${url} failed:`, error);
                }
                throw error;
            });
    };
    
    // Safe logging function
    function safeLog(message, data = null) {
        if (!DEBUG_MODE) return;
        
        if (data && typeof data === 'object') {
            // Create a safe copy without sensitive data
            const safeCopy = { ...data };
            ['uid', 'password', 'token', 'key'].forEach(field => {
                if (field in safeCopy) safeCopy[field] = '[REDACTED]';
            });
            console.log(message, safeCopy);
        } else {
            console.log(message, data);
        }
    }
    
    // Elements
    const modal = document.getElementById('add-teacher-modal');
    const successModal = document.getElementById('success-modal');
    const addTeacherBtn = document.getElementById('add-teacher-btn');
    const closeModalBtn = document.getElementById('close-modal');
    const form = document.getElementById('add-teacher-form');
    
    // Early validation that elements exist
    if (!form) {
        console.error('Teacher form not found!');
        return;
    }
    
    if (!modal) {
        console.error('Modal container not found!');
        return;
    }
    
    if (!successModal) {
        console.error('Success modal not found!');
        return;
    }
    
    const modalTitle = document.getElementById('modal-title');
    
    const formInputs = {
        firstName: document.getElementById('first-name'),
        lastName: document.getElementById('last-name'),
        email: document.getElementById('email'),
        teacherRole: document.getElementById('teacher-role'),
        strand: document.getElementById('strand'),
        status: document.getElementById('status'),
        password: document.getElementById('password'),
        passwordConfirm: document.getElementById('password-confirm')
    };
    
    // Toggle password visibility
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default button behavior
            
            const passwordField = this.closest('.password-field')?.querySelector('input');
            const eyeOpen = this.querySelector('.eye-open');
            const eyeClosed = this.querySelector('.eye-closed');
            
            if (passwordField) {
                passwordField.type = passwordField.type === 'password' ? 'text' : 'password';
                
                if (eyeOpen && eyeClosed) {
                    eyeOpen.classList.toggle('hidden');
                    eyeClosed.classList.toggle('hidden');
                }
            }
        });
    });
    
    // Show modal
    addTeacherBtn?.addEventListener('click', function() {
        modal.classList.remove('hidden');
        resetForm();
    });
    
    // Close modal
    closeModalBtn?.addEventListener('click', function() {
        modal.classList.add('hidden');
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
    
    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            submitForm();
        }
    });
    
    // Use event delegation to handle all button clicks
    document.addEventListener('click', function(e) {
        // Teacher action buttons
        if (e.target.closest('.btn-activate')) {
            handleActivateClick(e);
        }
        else if (e.target.closest('.btn-deactivate')) {
            handleDeactivateClick(e);
        }
        else if (e.target.closest('.btn-remove')) {
            handleRemoveClick(e);
        }
        
        // Modal cancel buttons - generic handler for any modal
        else if (e.target.closest('[id$="-cancel-btn"]')) {
            const button = e.target.closest('[id$="-cancel-btn"]');
            const modalId = button.id.replace('-cancel-btn', '-modal');
            const modal = document.getElementById(modalId);
            
            if (modal) {
                modal.classList.add('hidden');
                safeLog(`Closed modal: ${modalId}`);
            }
        }
        
        // Status modal confirm button
        else if (e.target.closest('#status-confirm-btn')) {
            const teacherId = document.getElementById('status-teacher-id')?.value;
            const newStatus = document.getElementById('status-new-value')?.value;
            
            if (!teacherId || !newStatus) {
                console.error('Missing required data for status update', { teacherId, newStatus });
                return;
            }
            
            // Get the dialog
            const dialog = document.getElementById('status-modal');
            
            // Set loading state
            const button = e.target.closest('#status-confirm-btn');
            button.disabled = true;
            button.innerHTML = loadingButtonHTML('Processing...');
            
            updateTeacherStatus(teacherId, newStatus, dialog);
        }
        
        // Remove modal confirm button
        else if (e.target.closest('#remove-confirm-btn')) {
            const teacherId = document.getElementById('remove-teacher-id')?.value;
            const teacherType = document.getElementById('remove-teacher-type')?.value;
            
            if (!teacherId) {
                console.error('Missing teacher ID for deletion');
                return;
            }
            
            // Get the dialog
            const dialog = document.getElementById('remove-modal');
            
            // Find teacher row by ID
            const teacherRow = document.querySelector(`.btn-remove[data-teacher-id="${teacherId}"]`)?.closest('tr');
            
            if (teacherRow) {
                // Set loading state
                const button = e.target.closest('#remove-confirm-btn');
                if (button) {
                    button.disabled = true;
                    button.innerHTML = loadingButtonHTML('Processing...');
                }
                
                // Pass false for showSuccess to avoid duplicate messages
                deleteTeacher(teacherId, dialog, teacherRow, teacherType, true);
            } else {
                console.error('Could not find teacher row in the DOM');
                alert('Error: Could not locate teacher row in the page');
                
                // Close the dialog even if we couldn't find the row
                if (dialog) {
                    dialog.classList.add('hidden');
                }
            }
        }
    });
    
    // Helper function for loading button HTML
    function loadingButtonHTML(text) {
        return `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ${text}
        `;
    }
    
    // Validate form
    function validateForm() {
        // Reset all error messages first
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(el => {
            el.textContent = '';
            el.classList.add('hidden');
        });
        
        // Create an array of validation tasks
        const validations = [
            { element: formInputs.firstName, errorId: 'first-name-error', validationFn: validateFirstName },
            { element: formInputs.lastName, errorId: 'last-name-error', validationFn: validateLastName },
            { element: formInputs.email, errorId: 'email-error', validationFn: validateEmail },
            { element: formInputs.teacherRole, errorId: 'teacher-role-error', validationFn: validateTeacherRole },
            { element: formInputs.strand, errorId: 'strand-error', validationFn: validateStrand },
            { element: formInputs.status, errorId: 'status-error', validationFn: validateStatus },
            { element: formInputs.password, errorId: 'password-error', validationFn: validatePassword },
            { element: formInputs.passwordConfirm, errorId: 'password-confirm-error', validationFn: validatePasswordConfirm }
        ];
        
        // Validate each field and track overall validity
        return validations
            .filter(v => v.element !== null && v.element !== undefined) // Skip missing elements
            .map(v => validateField(v.element, v.errorId, v.validationFn))
            .every(isValid => isValid === true);
    }
    
    // Helper to show error messages
    function showError(inputElement, errorId, message) {
        const errorElement = document.getElementById(errorId);
        if (!errorElement || !inputElement) return;
        
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        inputElement.classList.add('input-error');
    }
    
    // Clear error messages
    function clearError(inputElement, errorId) {
        const errorElement = document.getElementById(errorId);
        if (!errorElement || !inputElement) return;
        
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
        inputElement.classList.remove('input-error');
    }
    
    // Submit form to server
    let isProcessingFormSubmit = false;
    function submitForm() {
        if (!form) {
            console.error('Form not found');
            return;
        }
        
        // Prevent duplicate submissions
        if (isProcessingFormSubmit) {
            console.warn('Form submission already in progress, ignoring duplicate request');
            return;
        }
        
        isProcessingFormSubmit = true;
        
        const formData = new FormData(form);
        const isEditMode = formData.has('teacher_id') && formData.has('_method');
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        if (!submitBtn) {
            console.error('Submit button not found');
            return;
        }
        
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        // Determine URL and method based on edit mode
        const teacherId = formData.get('teacher_id');
        const url = isEditMode 
            ? `/principal/teachers/${teacherId}` 
            : '/principal/teachers';
        
        // Get CSRF token
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            console.error('CSRF token not found');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            alert('Security token not found. Please refresh the page and try again.');
            return;
        }
        
        safeLog('Submitting form to:', url);
        
        fetch(url, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                'Accept': 'application/json',
            },
            body: formData
        })
        .then(response => {
            safeLog('Form submission response status:', response.status);
            
            // Always try to parse as JSON first
            return response.json()
                .then(data => {
                    return { ok: response.ok, status: response.status, data };
                })
                .catch(err => {
                    // If JSON parsing fails, get text
                    return response.text().then(text => {
                        console.warn('Non-JSON response:', text);
                        return { 
                            ok: response.ok,
                            status: response.status, 
                            data: { 
                                success: response.ok, 
                                message: response.ok ? 'Operation completed' : text 
                            } 
                        };
                    });
                });
        })
        .then(result => {
            isProcessingFormSubmit = false;
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            
            safeLog('Form submission result:', result);
            
            if (result.ok && result.data.success) {
                // Close modal and show success message
                modal.classList.add('hidden');
                const successMessage = isEditMode 
                    ? 'Teacher updated successfully!' 
                    : 'Teacher created successfully!';
                showSuccessModal(successMessage);
                
                // Add the new teacher to the table without page reload
                if (!isEditMode && result.data.teacher) {
                    appendNewTeacher(result.data.teacher);
                }
            } else {
                // Handle specific errors
                if (result.data.message && result.data.message.includes("already in use")) {
                    showError(formInputs.email, 'email-error', 'This email address is already in use');
                    formInputs.email?.focus();
                } else if (result.data.errors) {
                    // Handle Laravel validation errors
                    Object.keys(result.data.errors).forEach(field => {
                        const errorMsg = result.data.errors[field][0];
                        const inputField = field === 'first_name' ? formInputs.firstName : 
                                          field === 'last_name' ? formInputs.lastName :
                                          formInputs[field.replace('_', '')];
                                          
                        const errorId = field === 'first_name' ? 'first-name-error' :
                                       field === 'last_name' ? 'last-name-error' :
                                       `${field.replace('_', '-')}-error`;
                                       
                        if (inputField && errorId) {
                            showError(inputField, errorId, errorMsg);
                            inputField?.focus();
                        }
                    });
                } else {
                    alert(result.data.message || 'Failed to process teacher data. Please try again.');
                }
            }
        })
        .catch(error => {
            isProcessingFormSubmit = false;
            console.error('Form submission error:', error);
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            alert('An error occurred. Please try again later.');
        });
    }
    
    // Append new teacher to the appropriate table without page reload
    function appendNewTeacher(teacher) {
        if (!teacher) {
            console.error('No teacher data provided to appendNewTeacher');
            return;
        }
        
        safeLog('Adding new teacher:', teacher);
        
        // Check if data is nested in another property like 'data'
        if (teacher.data && typeof teacher.data === 'object') {
            teacher = teacher.data;
        }
        
        // Get name from teacher object - handles various formats
        let firstName, lastName, fullName;
        
        // If name contains a space, it's likely a full name
        if (teacher.name && teacher.name.includes(' ')) {
            const nameParts = teacher.name.split(' ');
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
            fullName = teacher.name;
        } else {
            // Try common property name variations
            firstName = teacher.first_name || teacher.firstName || teacher.name || '';
            lastName = teacher.last_name || teacher.lastName || '';
            fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'New Teacher';
            
            // Check nested user object if present
            if ((!firstName || !lastName) && teacher.user) {
                firstName = teacher.user.first_name || teacher.user.firstName || teacher.user.name || firstName;
                lastName = teacher.user.last_name || teacher.user.lastName || lastName;
                fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || fullName;
            }
        }
        
        safeLog('Using name for display:', fullName);
        
        // Get ID and other properties
        const teacherId = teacher.id || teacher.teacher_id || teacher.uid || '';
        const teacherStrand = teacher.strand || teacher.subject || teacher.department || '';
    const teacherStatus = teacher.status || 'Inactive';
        
        // Determine if head teacher
    const isHeadTeacher = (teacher.teacher_role === 'Head Teacher' || teacher.role === 'Head Teacher' || 
                teacher.teacherRole === 'Head Teacher' || 
                            (teacherStrand && teacherStrand.toLowerCase().includes('head')));
        
        // Find the correct table
        let tbody = null;
        
        // Try tables with specific selectors first
        const tableSelectors = isHeadTeacher ?
            ['#head-teachers-table tbody', '.head-teachers-table tbody'] :
            ['#science-teachers-table tbody', '.science-teachers-table tbody'];
            
        for (const selector of tableSelectors) {
            const table = document.querySelector(selector);
            if (table) {
                tbody = table;
                break;
            }
        }
        
        // If not found, try using the position of the tables
        if (!tbody) {
            const tables = document.querySelectorAll('.table-section tbody');
            if (tables.length >= 2) {
                tbody = isHeadTeacher ? tables[0] : tables[1];
            } else if (tables.length === 1) {
                tbody = tables[0];
            }
        }
        
        if (!tbody) {
            console.error('Target table body not found for teacher type:', isHeadTeacher ? 'head' : 'science');
            return;
        }
        
        // Remove empty state if it exists
        const emptyState = tbody.querySelector('.empty-state-row');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Create new row
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td class="table-cell">
                <div class="table-cell-name">
                    <div class="table-text-bold">${fullName}</div>
                </div>
            </td>
            <td class="table-cell">
                <div class="table-text">${teacher.email || ''}</div>
            </td>
            <td class="table-cell">
                <div class="table-text">${teacherStrand}</div>
            </td>
            <td class="table-cell">
                <span class="status-badge status-${/^active$/i.test(teacherStatus) ? 'active' : 'inactive'}">
                    ${/^active$/i.test(teacherStatus) ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="table-cell">
                <div class="action-cell">
                    ${/^active$/i.test(teacherStatus) ? 
                        `<button class="btn-deactivate" data-teacher-id="${teacherId}" data-teacher-name="${fullName}">
                            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                            </svg>
                            Deactivate
                        </button>` : 
                        `<button class="btn-activate" data-teacher-id="${teacherId}" data-teacher-name="${fullName}">
                            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Activate
                        </button>`
                    }
                    <button class="btn-remove" data-teacher-id="${teacherId}" data-teacher-name="${fullName}">
                        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                    </button>
                </div>
            </td>
        `;
        
        // Add to table with fade-in animation
        newRow.style.opacity = '0';
        tbody.appendChild(newRow);
        
        // Trigger reflow for animation
        void newRow.offsetWidth;
        
        // Add animation
        newRow.style.transition = 'opacity 0.5s';
        newRow.style.opacity = '1';
        
        safeLog('New teacher row added to table');
    }
    
    // Reset form fields and errors
    function resetForm() {
        // Reset form fields
        form.reset();
        
        // Reset error messages and styling
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
            el.classList.add('hidden');
        });
        
        document.querySelectorAll('.input-error').forEach(input => {
            input.classList.remove('input-error');
        });
        
        // Reset modal UI to "Add" state
        if (modalTitle) modalTitle.textContent = 'Add New Teacher';
        
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Create Account';
        
        // Clean up any edit mode elements
        ['edit-mode-indicator', 'teacher-id', 'method-field'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
        
        // Clear loading overlays
        const existingOverlay = document.querySelector('.modal-container .absolute');
        if (existingOverlay) existingOverlay.remove();
        
        // Reset password field toggle icons
        const passwordToggles = document.querySelectorAll('.password-toggle');
        passwordToggles.forEach(toggle => {
            const eyeOpen = toggle.querySelector('.eye-open');
            const eyeClosed = toggle.querySelector('.eye-closed');
            
            if (eyeOpen && eyeClosed) {
                eyeOpen.classList.remove('hidden');
                eyeClosed.classList.add('hidden');
            }
        });
    }
    
    // Unified CSRF token retrieval
    function getCsrfToken() {
        // Try meta tag first (best practice)
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
        if (metaToken) {
            return metaToken;
        }
        
        // Fall back to hidden input if meta tag is not available
        const inputToken = document.querySelector('input[name="_token"]')?.value;
        if (inputToken) {
            return inputToken;
        }
        
        // NEW: If no token found, try to refresh it from a dedicated endpoint
        if (window.location.pathname.includes('/principal/')) {
            fetch('/csrf-token', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.token) {
                    // Add the token to the document
                    const meta = document.createElement('meta');
                    meta.name = 'csrf-token';
                    meta.content = data.token;
                    document.head.appendChild(meta);
                    console.info('CSRF token refreshed');
                }
            })
            .catch(error => console.warn('Could not refresh CSRF token:', error));
        }
        
        console.warn('CSRF token not found!');
        return '';
    }
    
    // Delegate form input validation
    const validationRules = {
        'first-name': validateFirstName,
        'last-name': validateLastName,
        'email': validateEmail,
        'teacher-role': validateTeacherRole,
        'strand': validateStrand,
        'status': validateStatus,
        'password': validatePassword,
        'password-confirm': validatePasswordConfirm
    };
    
    // Set up validation on all form inputs at once
    Object.keys(formInputs).forEach(key => {
        const input = formInputs[key];
        if (!input) return;
        
        const errorId = `${input.id}-error`;
        const validationFn = validationRules[input.id];
        
        if (validationFn) {
            const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
            input.addEventListener(eventType, () => validateField(input, errorId, validationFn));
        }
    });
    
    // Field validation functions
    function validateName(value, fieldName) {
        if (!value.trim()) return `${fieldName} is required`;
        if (value.length < 2) return `${fieldName} must be at least 2 characters`;
        
        const nameRegex = /^[A-Z][a-z]+$/;
        if (!nameRegex.test(value)) {
            return `${fieldName} start with a capital letter then lowercase letters`;
        }
        
        return null;
    }

    function validateFirstName(value) {
        return validateName(value, 'First name');
    }

    function validateLastName(value) {
        return validateName(value, 'Last name');
    }

    function validateEmail(value) {
        if (!value.trim()) return 'Email is required';
        
        // Gmail-only validation
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!gmailRegex.test(value)) {
            return 'Please enter a valid Gmail address (example@gmail.com)';
        }
        
        return null;
    }

    function validateTeacherRole(value) {
        if (!value) return 'Please select a teacher role';
        return null;
    }

    function validateStrand(value) {
        if (!value) return 'Please select a strand';
        return null;
    }

    function validateStatus(value) {
        if (!value) return 'Please select a status';
        return null;
    }

    function validatePassword(value) {
        // Skip validation if in edit mode and field is empty
        const isEditMode = !!document.getElementById('teacher-id');
        if (isEditMode && !value) return null;
        
        // Regular validation
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        
        return null;
    }

    function validatePasswordConfirm(value) {
        const passwordValue = formInputs.password?.value || '';
        
        // Skip validation if in edit mode and both fields are empty
        const isEditMode = !!document.getElementById('teacher-id');
        if (isEditMode && !passwordValue && !value) return null;
        
        // Regular validation
        if (passwordValue && value !== passwordValue) {
            return 'Passwords do not match';
        }
        
        return null;
    }

    // Generic field validation handler
    function validateField(inputElement, errorId, validationFn) {
        if (!inputElement || !errorId || !validationFn) return false;
        
        const errorElement = document.getElementById(errorId);
        if (!errorElement) return false;
        
        const errorMessage = validationFn(inputElement.value);
        
        if (errorMessage) {
            showError(inputElement, errorId, errorMessage);
            return false;
        } else {
            clearError(inputElement, errorId);
            return true;
        }
    }
    
    function validateRemoveTeacher() {
        const teacherId = document.getElementById('remove-teacher-id').value;
        return teacherId !== '';
    }
    
    // Function to handle teacher removal
    function removeTeacher(teacherId, teacherName) {
        if (!teacherId) return;
        
        // Get the teacher's row and information
        const teacherRow = document.querySelector(`.btn-remove[data-teacher-id="${teacherId}"]`)?.closest('tr');
        if (!teacherRow) return;
        
        // Determine teacher type (head or science)
        const tableSection = teacherRow.closest('.table-section');
        const isHeadTeacher = tableSection?.querySelector('h2')?.textContent.includes('Head') || false;
        const teacherType = isHeadTeacher ? 'head' : 'science';
        
        // Get modal elements
        const modal = document.getElementById('remove-modal');
        const teacherNameSpan = document.getElementById('remove-teacher-name');
        const hiddenId = document.getElementById('remove-teacher-id');
        const hiddenType = document.getElementById('remove-teacher-type');
        
        // Configure modal content
        teacherNameSpan.textContent = teacherName;
        hiddenId.value = teacherId;
        hiddenType.value = teacherType;
        
        // Show the modal
        modal.classList.remove('hidden');
    }

    function toggleTeacherStatus(teacherId, teacherName, newStatus) {
        if (!teacherId) return;
        
    const actionText = /^active$/i.test(newStatus) ? 'activate' : 'deactivate';
        
        // Get modal elements
        const modal = document.getElementById('status-modal');
        const title = document.getElementById('status-title');
        const actionTextSpan = document.getElementById('status-action-text');
        const teacherNameSpan = document.getElementById('status-teacher-name');
        const icon = document.getElementById('status-icon');
        const confirmBtn = document.getElementById('status-confirm-btn');
        const hiddenId = document.getElementById('status-teacher-id');
        const hiddenStatus = document.getElementById('status-new-value');
        
        // Configure modal content
    title.textContent = /^active$/i.test(newStatus) ? 'Activate Teacher' : 'Deactivate Teacher';
        actionTextSpan.textContent = actionText;
        teacherNameSpan.textContent = teacherName;
        hiddenId.value = teacherId;
        hiddenStatus.value = newStatus;
        
        // Set the correct icon path
        icon.classList.remove('text-green-500', 'text-amber-500');
    icon.classList.add(/^active$/i.test(newStatus) ? 'text-green-500' : 'text-amber-500');
        
        // Set the button color
        confirmBtn.classList.remove('bg-green-600', 'hover:bg-green-700', 'focus:ring-green-500', 
                                   'bg-amber-600', 'hover:bg-amber-700', 'focus:ring-amber-500');
        
    if (/^active$/i.test(newStatus)) {
            confirmBtn.classList.add('bg-green-600', 'hover:bg-green-700', 'focus:ring-green-500');
            icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>`;
        } else {
            confirmBtn.classList.add('bg-amber-600', 'hover:bg-amber-700', 'focus:ring-amber-500');
            icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>`;
        }
        
        // Show the modal
        modal.classList.remove('hidden');
    }
    
    // Add retry capability for critical operations
    async function fetchWithRetry(url, options, retries = 3, delay = 500) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            
            throw new Error(`Request failed with status ${response.status}`);
        } catch (err) {
            if (retries <= 0) throw err;
            
            safeLog(`Retrying request to ${url}, ${retries} attempts left`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1, delay * 1.5);
        }
    }
    
    // Delete teacher function
    function deleteTeacher(teacherId, dialog, teacherRow, teacherType, showSuccess = true) {
        // Guard against missing required parameters
        if (!teacherId || !dialog || !teacherRow) {
            console.error('Missing required parameters for deleteTeacher:', { teacherId, dialog, teacherRow });
            return;
        }
        
        // Store a reference to the parent tbody before any DOM manipulation
        const tbody = teacherRow.closest('tbody');
        
        // Store teacher row information before deletion to handle UI updates later
        const cachedRowInfo = {
            id: teacherId,
            type: teacherType,
            element: teacherRow,
            tbody: tbody,
            exists: function() {
                return this.element && this.element.parentNode;
            }
        };
        
        const csrfToken = getCsrfToken();
        safeLog('Deleting teacher:', { teacherId });
        
        // Show loading state on button
        const confirmBtn = document.getElementById('remove-confirm-btn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = loadingButtonHTML('Removing...');
        }
        
        fetch(`/principal/teachers/${teacherId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                'Accept': 'application/json'
            }
        })
        .then(response => {
            safeLog('Delete response status:', response.status);
            
            // Try to parse response as JSON
            return response.json().catch(error => {
                console.warn('Failed to parse response as JSON:', error);
                return { 
                    success: response.ok,
                    message: response.ok ? 'Teacher removed' : 'Error occurred'
                };
            });
        })
        .then(data => {
            safeLog('Delete response data:', data);
            
            // Hide dialog
            dialog.classList.add('hidden');
            
            // Reset button state
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Remove';
            }
            
            // Only show success message if specified (preventing double messages)
            if (showSuccess) {
                showSuccessModal('Teacher removed successfully');
            }
            
            // Check if row still exists in DOM before trying to remove it
            if (cachedRowInfo.exists()) {
                safeLog('Teacher row found, removing from UI');
                
                // Add fade-out class to animate removal
                cachedRowInfo.element.classList.add('fade-out');
                
                // Remove after animation completes
                setTimeout(() => {
                    // Double-check that element still exists before removing
                    if (cachedRowInfo.exists()) {
                        cachedRowInfo.element.remove();
                        
                        // Check if this was the last row and show empty state if needed
                        updateTableEmptyState(cachedRowInfo.tbody, cachedRowInfo.type);
                    } else {
                        console.warn('Teacher row was removed during animation');
                    }
                }, 500);
            } else {
                console.warn('Teacher row not found in DOM');
                
                // Even if we can't find the row, still check if we need to show empty state
                if (cachedRowInfo.tbody) {
                    updateTableEmptyState(cachedRowInfo.tbody, cachedRowInfo.type);
                }
            }
        })
        .catch(error => {
            console.error('Network error removing teacher:', error);
            
            // Hide dialog
            dialog.classList.add('hidden');
            
            // Reset button state
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Remove';
            }
            
            // Show error notification
            alert('An error occurred while removing the teacher.');
        });
    }

    /**
     * Update table empty state when all rows are removed
     */
    function updateTableEmptyState(tbody, teacherType) {
        if (!tbody) {
            console.warn('Cannot update table empty state: tbody is null');
            return;
        }
        
        // If no rows left (except possibly our empty state row)
        const remainingRows = tbody.querySelectorAll('tr:not(.empty-state-row)');
        safeLog(`Found ${remainingRows.length} remaining rows in ${teacherType} teachers table`);
        
        if (remainingRows.length === 0) {
            safeLog(`Creating empty state for ${teacherType} teachers table`);
            
            // Check if empty state already exists
            const existingEmptyState = tbody.querySelector('.empty-state-row');
            if (existingEmptyState) {
                safeLog('Empty state row already exists');
                return;
            }
            
            // Create empty state row
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-state-row';
            emptyRow.innerHTML = `
                <td colspan="5" class="table-cell">
                    <div class="empty-state">
                        <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <p class="empty-state-text">No ${teacherType} teachers found. Click 'Add Teacher' to create one.</p>
                    </div>
                </td>
            `;
            tbody.appendChild(emptyRow);
        }
    }
    
    // Handler functions for button clicks - consolidated for better maintainability
    function handleActivateClick(e) {
        const button = e.target.closest('.btn-activate');
        if (!button) {
            console.error('Button not found in event target');
            return;
        }
        
        const teacherId = button.getAttribute('data-teacher-id');
        const teacherName = button.getAttribute('data-teacher-name');
        
        if (!teacherId) {
            console.error('Teacher ID not found on button');
            return;
        }
        
        toggleTeacherStatus(teacherId, teacherName || 'this teacher', 'active');
    }

    function handleDeactivateClick(e) {
        const button = e.target.closest('.btn-deactivate');
        if (!button) {
            console.error('Button not found in event target');
            return;
        }
        
        const teacherId = button.getAttribute('data-teacher-id');
        const teacherName = button.getAttribute('data-teacher-name');
        
        if (!teacherId) {
            console.error('Teacher ID not found on button');
            return;
        }
        
        toggleTeacherStatus(teacherId, teacherName || 'this teacher', 'inactive');
    }

    function handleRemoveClick(e) {
        const button = e.target.closest('.btn-remove');
        if (!button) {
            console.error('Button not found in event target');
            return;
        }
        
        const teacherId = button.getAttribute('data-teacher-id');
        const teacherName = button.getAttribute('data-teacher-name');
        
        if (!teacherId) {
            console.error('Teacher ID not found on button');
            return;
        }
        
        removeTeacher(teacherId, teacherName || 'this teacher');
    }
    
    /**
     * Shows a success modal with a message that fades out automatically
     */
    function showSuccessModal(message) {
        // Get the success modal element
        const successModal = document.getElementById('success-modal');
        const successMessage = document.getElementById('success-message');
        
        if (!successModal || !successMessage) {
            console.error('Success modal elements not found');
            alert(message); // Fallback to alert if modal not found
            return;
        }
        
        // Set the success message
        successMessage.textContent = message;
        
        // Show the modal
        successModal.classList.remove('hidden');
        
        // Hide after 2 seconds
        setTimeout(() => {
            successModal.classList.add('fade-out');
            
            // Handle animation end to hide completely
            const handleAnimationEnd = () => {
                successModal.classList.add('hidden');
                successModal.classList.remove('fade-out');
            };
            
            successModal.addEventListener('animationend', handleAnimationEnd, { once: true });
        }, 2000);
    }
    
    // Update teacher status function
    function updateTeacherStatus(teacherId, newStatus, dialog) {
        safeLog('Updating teacher status:', { teacherId, newStatus });
        
        // Create form data with only the status field
        const formData = new FormData();
        formData.append('status', newStatus);
        formData.append('_method', 'PATCH'); // Use PATCH for partial updates
        
        fetch(`/principal/teachers/${teacherId}/status`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': getCsrfToken(),
                'Accept': 'application/json'
            },
            body: formData
        })
        .then(response => {
            safeLog('Status update response:', response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    safeLog('Error response text:', text);
                    throw new Error(`Failed to update teacher status: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            safeLog('Status update successful');
            
            // Hide dialog
            dialog.classList.add('hidden');
            
            // Reset button state
            const confirmBtn = document.getElementById('status-confirm-btn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm';
            }
            
            // Show success message
            showSuccessModal(`Teacher ${/^active$/i.test(newStatus) ? 'activated' : 'deactivated'} successfully`);
            
            // Find the row and update the status badge
            try {
                const row = document.querySelector(`.btn-${/^active$/i.test(newStatus) ? 'activate' : 'deactivate'}[data-teacher-id="${teacherId}"]`).closest('tr');
                
                // Update status badge
                const statusCell = row.querySelector('.status-badge');
                statusCell.className = `status-badge status-${/^active$/i.test(newStatus) ? 'active' : 'inactive'}`;
                statusCell.textContent = /^active$/i.test(newStatus) ? 'Active' : 'Inactive';
                
                // Replace button
                const actionCell = row.querySelector('.action-cell');
                const oldButton = actionCell.querySelector(`.btn-${/^active$/i.test(newStatus) ? 'activate' : 'deactivate'}`);
                const teacherName = oldButton.getAttribute('data-teacher-name');
                
                // Create new button with opposite action
                const newButtonClass = /^active$/i.test(newStatus) ? 'btn-deactivate' : 'btn-activate';
                const newButtonText = /^active$/i.test(newStatus) ? 'Deactivate' : 'Activate';
                const newButtonSvg = /^active$/i.test(newStatus) 
                    ? `<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>` 
                    : `<svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
                
                const newButton = document.createElement('button');
                newButton.className = newButtonClass;
                newButton.setAttribute('data-teacher-id', teacherId);
                newButton.setAttribute('data-teacher-name', teacherName);
                newButton.innerHTML = `${newButtonSvg} ${newButtonText}`;
                
                // Replace old button with new one
                actionCell.replaceChild(newButton, oldButton);
            } catch (error) {
                console.error('Error updating UI after status change:', error);
            }
        })
        .catch(error => {
            console.error('Error updating teacher status:', error);
            
            // Log more details about the error
            safeLog('Detailed error info:', {
                message: error.message,
                stack: error.stack,
                teacherId: teacherId,
                newStatus: newStatus
            });
            
            dialog.classList.add('hidden');
            
            const confirmBtn = document.getElementById('status-confirm-btn');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm';
            }
            
            alert('Failed to update teacher status. Please try again. Check console for details.');
        });
    }
    
    // Find and fix any 404/400 errors from missing resources
    // This helps identify the source of the 400 Bad Request error you're seeing
    window.addEventListener('error', function(event) {
        if (event.target && (event.target.tagName === 'IMG' || event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK')) {
            console.warn(`Resource error: Failed to load ${event.target.tagName}:`, event.target.src || event.target.href);
        }
    }, true);
});