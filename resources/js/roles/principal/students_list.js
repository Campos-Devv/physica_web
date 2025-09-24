// Firebase handled server-side; no client SDK here to avoid double init

document.addEventListener('DOMContentLoaded', function() {
    // No client-side Firebase initialization

    // DOM elements
    const successModal = document.getElementById('success-modal');
    const successMessage = document.getElementById('success-message');
    const changeStatusModal = document.getElementById('change-status-modal');
    const closeStatusModalBtn = document.getElementById('close-status-modal');
    const cancelStatusChangeBtn = document.getElementById('cancel-status-change');
    const changeStatusForm = document.getElementById('change-status-form');
    const removeModal = document.getElementById('remove-modal');
    const removeCancelBtn = document.getElementById('remove-cancel-btn');
    const removeConfirmBtn = document.getElementById('remove-confirm-btn');

    // Status change and remove functionality

    // Close Status Change Modal
    if (closeStatusModalBtn) {
        closeStatusModalBtn.addEventListener('click', function() {
            changeStatusModal.classList.add('hidden');
        });
    }

    if (cancelStatusChangeBtn) {
        cancelStatusChangeBtn.addEventListener('click', function() {
            changeStatusModal.classList.add('hidden');
        });
    }

    // Nothing to replace with - removing the add student form submission handler

    // Handle Change Status Form Submission
    if (changeStatusForm) {
        changeStatusForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const studentId = document.getElementById('student-id').value;
            const newStatus = document.getElementById('new-status').value;
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            try {
                // Send request to Laravel controller instead of direct Firestore update
                const response = await fetch('/principal/students/update-status', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken
                    },
                    body: JSON.stringify({
                        student_id: studentId,
                        new_status: newStatus
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Show success message
                    successMessage.textContent = 'Student status updated successfully!';
                    changeStatusModal.classList.add('hidden');
                    successModal.classList.remove('hidden');
                    
                    // Close success message after animation
                    setTimeout(() => {
                        successModal.classList.add('hidden');
                        // Reload page to reflect changes
                        window.location.reload();
                    }, 3000);
                } else {
                    throw new Error(data.message || 'Failed to update status');
                }
                
            } catch (error) {
                console.error("Error updating student status: ", error);
                alert('An error occurred while updating the student status. Please try again.');
            }
        });
    }

    // Set up Change Status button click handlers
    const changeStatusButtons = document.querySelectorAll('.btn-change-status');
    changeStatusButtons.forEach(button => {
        button.addEventListener('click', function() {
            const studentId = this.dataset.studentId;
            const studentName = this.dataset.studentName;
            
            document.getElementById('student-id').value = studentId;
            document.getElementById('student-name-display').textContent = studentName;
            changeStatusModal.classList.remove('hidden');
        });
    });

    // Set up Remove button click handlers
    const removeButtons = document.querySelectorAll('.btn-remove');
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const studentId = this.dataset.studentId;
            const studentName = this.dataset.studentName;
            
            document.getElementById('remove-student-id').value = studentId;
            document.getElementById('remove-student-name').textContent = studentName;
            removeModal.classList.remove('hidden');
        });
    });

    // Handle Remove Student Confirmation
    if (removeConfirmBtn) {
        removeConfirmBtn.addEventListener('click', async function() {
            const studentId = document.getElementById('remove-student-id').value;
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            
            if (!studentId) {
                alert('Invalid student ID');
                return;
            }
            
            try {
                // Send request to Laravel controller instead of direct Firestore deletion
                const response = await fetch('/principal/students/destroy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken
                    },
                    body: JSON.stringify({
                        student_id: studentId
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Show success message
                    successMessage.textContent = 'Student removed successfully!';
                    removeModal.classList.add('hidden');
                    successModal.classList.remove('hidden');
                    
                    // Close success message after animation
                    setTimeout(() => {
                        successModal.classList.add('hidden');
                        // Reload page to reflect changes
                        window.location.reload();
                    }, 3000);
                } else {
                    throw new Error(data.message || 'Failed to remove student');
                }
                
            } catch (error) {
                console.error("Error removing student: ", error);
                alert('An error occurred while removing the student. Please try again.');
            }
        });
    }

    // Cancel Remove Student
    if (removeCancelBtn) {
        removeCancelBtn.addEventListener('click', function() {
            removeModal.classList.add('hidden');
        });
    }

    // No form validation needed since we removed the add student feature
});