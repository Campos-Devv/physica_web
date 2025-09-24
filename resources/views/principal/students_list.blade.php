@extends('layouts.app')

@section('title', 'Student Accounts')

@section('styles')
    @vite('resources/css/roles/principal/students_list.css')
@endsection

@section('content')
<div class="page-container">
    <h1 class="page-title">Student Accounts</h1>
    
    <!-- Students Table -->
    <div class="table-section">
        <div class="section-header">
            <h2>Students</h2>
        </div>
        <div class="table-container">
            <table class="main-table">
                <thead class="table-head">
                    <tr class="table-row">
                        <th scope="col" class="table-header">Full Name</th>
                        <th scope="col" class="table-header">Email</th>
                        <th scope="col" class="table-header">LRN</th>
                        <th scope="col" class="table-header">Strand</th>
                        <th scope="col" class="table-header">Status</th>
                        <th scope="col" class="table-header">Action</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($students as $student)
                        <tr>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">{{ $student['name'] ?? 'N/A' }}</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">{{ $student['email'] ?? 'N/A' }}</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">{{ $student['lrn'] ?? 'N/A' }}</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">{{ $student['strand'] ?? 'N/A' }}</div>
                            </td>
                            <td class="table-cell">
                                <span class="status-badge status-{{ strtolower($student['status'] ?? 'inactive') }}">
                                    {{ ucfirst($student['status'] ?? 'Inactive') }}
                                </span>
                            </td>
                            <td class="table-cell">
                                <div class="action-cell">
                                    <button class="btn-change-status" data-student-id="{{ $student['id'] ?? '' }}" data-student-name="{{ $student['name'] ?? 'Unknown' }}">
                                        <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                        </svg>
                                        Change Status
                                    </button>
                                    <button class="btn-remove" data-student-id="{{ $student['id'] ?? '' }}" data-student-name="{{ $student['name'] ?? 'Unknown' }}">
                                        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Remove
                                    </button>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="table-cell">
                                <div class="empty-state">
                                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    </svg>
                                    <p class="empty-state-text">No student records found.</p>
                                </div>
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <!-- Add Student Modal removed -->

    <!-- Change Status Modal -->
    <div id="change-status-modal" class="modal-backdrop hidden">
        <div class="modal-container">
            <div class="modal-header">
                <h3 class="modal-title">Change Student Status</h3>
                <button id="close-status-modal" class="modal-close">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <form id="change-status-form" novalidate>
                @csrf
                <div class="form-content">
                    <p class="mb-4">You are changing the status for: <span id="student-name-display" class="font-medium"></span></p>
                    
                    <div class="form-group">
                        <label for="new-status" class="form-label">Select New Status</label>
                        <div class="select-wrapper">
                            <select id="new-status" name="new_status" class="form-select" required>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="graduated">Graduated</option>
                                <option value="suspended">Suspended</option>
                                <option value="transferred">Transferred</option>
                            </select>
                            <div class="select-icon">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="error-message hidden" id="new-status-error"></div>
                    </div>
                    
                    <input type="hidden" id="student-id" name="student_id">
                    
                    <div class="form-actions">
                        <button type="button" id="cancel-status-change" class="btn-cancel">Cancel</button>
                        <button type="submit" class="btn-submit">Update Status</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <!-- Success Modal -->
    <div id="success-modal" class="modal-backdrop hidden">
        <div class="modal-success-container">
            <div class="success-icon-container">
                <svg class="success-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <div class="success-message" id="success-message">Operation completed successfully!</div>
            <div class="success-animation"></div>
        </div>
    </div>

    <!-- Remove Student Confirmation Modal -->
    <div id="remove-modal" class="modal-backdrop hidden">
        <div class="bg-white rounded-lg p-6 max-w-sm mx-auto">
            <div class="text-center mb-4">
                <svg class="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-900 mt-2">Remove Student</h3>
                <p class="text-sm text-gray-500 mt-1">
                    Are you sure you want to remove <span id="remove-student-name" class="font-medium">this student</span>? 
                    This action cannot be undone.
                </p>
            </div>
            <div class="flex justify-center gap-4">
                <button type="button" id="remove-cancel-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400">
                    Cancel
                </button>
                <button type="button" id="remove-confirm-btn" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                    Remove
                </button>
                <input type="hidden" id="remove-student-id" value="">
            </div>
        </div>
    </div>
</div>

@push('scripts')
    @vite('resources/js/roles/principal/students_list.js')
@endpush
@endsection