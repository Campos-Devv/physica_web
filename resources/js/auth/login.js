document.addEventListener('DOMContentLoaded', function() {
    // Toggle password visibility
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('#password');
    const eyeVisible = document.querySelector('.toggle-password .eye-visible');
    const eyeHidden = document.querySelector('.toggle-password .eye-hidden');

    if (togglePassword && passwordInput && eyeVisible && eyeHidden) {
        // Initial state check
        if (passwordInput.getAttribute('type') === 'password') {
            eyeVisible.classList.remove('hidden');
            eyeHidden.classList.add('hidden');
        } else {
            eyeVisible.classList.add('hidden');
            eyeHidden.classList.remove('hidden');
        }
        
        togglePassword.addEventListener('click', function() {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            
            // Toggle password type
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            
            // Toggle icon visibility - when showing password (text mode), show the hidden eye
            if (isPassword) {
                eyeVisible.classList.add('hidden');
                eyeHidden.classList.remove('hidden');
            } else {
                eyeVisible.classList.remove('hidden');
                eyeHidden.classList.add('hidden');
            }
        });
    }

    // Form validation
    const loginForm = document.querySelector('.login-form');
    
    if (loginForm) {
        // Cache form elements for better performance
        const username = document.querySelector('#username');
        const password = document.querySelector('#password');
        const loginButton = document.querySelector('.login-button');
        const originalButtonText = loginButton ? loginButton.textContent.trim() : 'Login';
        
        // Add input listeners to clear errors on typing
        if (username) {
            username.addEventListener('input', function() {
                clearError(this);
                validateInput(this, validateUsername);
            });
            
            // Add blur event to validate when leaving the field
            username.addEventListener('blur', function() {
                const value = this.value.trim();
                if (value) {
                    validateInput(this, validateUsername);
                }
            });
        }
        
        if (password) {
            password.addEventListener('input', function() {
                clearError(this);
                validateInput(this, validatePassword);
            });
            
            // Add blur event to validate when leaving the field
            password.addEventListener('blur', function() {
                const value = this.value.trim();
                if (value) {
                    validateInput(this, validatePassword);
                }
            });
        }
        
        loginForm.addEventListener('submit', function(event) {
            let isValid = true;
            
            // Validate username/email
            if (username) {
                if (!validateInput(username, validateUsername)) {
                    isValid = false;
                }
            }
            
            // Validate password
            if (password) {
                if (!validateInput(password, validatePassword)) {
                    isValid = false;
                }
            }
            
            if (!isValid) {
                event.preventDefault();
            } else if (loginButton) {
                // Add loading state
                loginButton.textContent = 'Loading...';
                loginButton.classList.add('loading');
                loginButton.disabled = true;
                
                // Allow form submission to continue
            }
        });
    }
    
    function validateInput(input, validationFn) {
        const value = input.value.trim();
        const validationResult = validationFn(value);
        
        if (!validationResult.valid) {
            showError(input, validationResult.message);
            return false;
        } else {
            showSuccess(input);
            return true;
        }
    }
    
    function validateUsername(value) {
        if (!value) {
            return { valid: false, message: 'Email is required' };
        }
        
        // Email format validation if it's an email
        if (value.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return { valid: false, message: 'Invalid email format' };
            }
        }
        
        return { valid: true };
    }
    
    function validatePassword(value) {
        if (!value) {
            return { valid: false, message: 'Password is required' };
        }
        
        if (value.length < 6) {
            return { valid: false, message: 'Password must be at least 6 characters' };
        }
        
        // Password strength check (optional, depending on requirements)
        const hasUpperCase = /[A-Z]/.test(value);
        const hasLowerCase = /[a-z]/.test(value);
        const hasNumbers = /\d/.test(value);
        
        if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
            return { 
                valid: false, 
                message: 'Include uppercase, lowercase letters and numbers' 
            };
        }
        
        return { valid: true };
    }
    
    function showError(input, message) {
        const formGroup = input.closest('.form-group');
        const errorElement = formGroup.querySelector('.invalid-feedback') || document.createElement('span');
        
        errorElement.className = 'invalid-feedback';
        errorElement.textContent = message;
        
        if (!formGroup.querySelector('.invalid-feedback')) {
            formGroup.appendChild(errorElement);
        }
        
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
    }
    
    function showSuccess(input) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        
        // Remove any existing error messages
        const formGroup = input.closest('.form-group');
        const errorElement = formGroup.querySelector('.invalid-feedback');
        if (errorElement) {
            errorElement.textContent = '';
        }
    }
    
    function clearError(input) {
        const value = input.value.trim();
        if (value) {
            input.classList.remove('is-invalid');
            
            // Only clear the error message, not the class yet
            const formGroup = input.closest('.form-group');
            const errorElement = formGroup.querySelector('.invalid-feedback');
            if (errorElement) {
                errorElement.textContent = '';
            }
        }
    }

    // Modal functionality
    initToastNotifications();

    function initToastNotifications() {
        // Use the existing toast container from HTML instead of creating a new one
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) return;
        
        // Hide any static toast examples that might be in the HTML
        const staticToasts = toastContainer.querySelectorAll('.toast');
        staticToasts.forEach(toast => {
            if (!toast.classList.contains('hidden')) {
                toast.classList.add('hidden');
            }
        });
        
        // Check for server-side errors from the login container
        const loginContainer = document.querySelector('.login-container');
        if (loginContainer) {
            const hasServerErrors = loginContainer.dataset.hasErrors === 'true';
            const errorMessage = loginContainer.dataset.errorMessage;
            
            if (hasServerErrors && errorMessage) {
                // Use specific error message from server
                showToast('Authentication Failed', errorMessage, 'error');
            }
        }
    }

    function showToast(title, message, type = 'error', duration = 5000) {
        // Get existing toast container
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) return;
        
        // Try to reuse existing toast of the same type first
        let toast = toastContainer.querySelector(`.toast-${type}.hidden`);
        
        if (!toast) {
            // Create new toast if no reusable one exists
            toast = document.createElement('div');
            toast.className = `toast toast-${type} hidden`;
            
            // Get the appropriate icon for this toast type
            let iconSvg;
            switch(type) {
                case 'error':
                    iconSvg = `<svg class="w-5 h-5 text-custom-red" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>`;
                    break;
                case 'success':
                    iconSvg = `<svg class="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>`;
                    break;
                case 'warning':
                    iconSvg = `<svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>`;
                    break;
                case 'info':
                    iconSvg = `<svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z" clip-rule="evenodd"/>
                    </svg>`;
                    break;
            }
            
            // Build toast structure
            toast.innerHTML = `
                <div class="toast-icon">${iconSvg}</div>
                <div class="toast-content">
                    <div class="toast-title font-semibold">${title}</div>
                    <div class="toast-message text-gray-600">${message}</div>
                </div>
                <button class="toast-close">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </button>
            `;
            
            toastContainer.appendChild(toast);
        } else {
            // Update existing toast content
            const titleEl = toast.querySelector('.toast-title');
            const messageEl = toast.querySelector('.toast-message');
            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = message;
        }
        
        // Show the toast
        toast.classList.remove('hidden');
        
        // Use a small delay to ensure the toast is in the DOM before animating
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
        });
        
        // Add close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => hideToast(toast));
        }
        
        // Auto hide after duration
        if (duration) {
            setTimeout(() => hideToast(toast), duration);
        }
        
        return toast;
    }

    function hideToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }
});