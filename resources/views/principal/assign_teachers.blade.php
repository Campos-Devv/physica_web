@extends('layouts.app')

@section('title', 'Assign Teachers')

@push('styles')
    @vite('resources/css/roles/principal/assign_teachers.css')
@endpush

@section('content')
<div class="page-container">
    <h1 class="page-title">Assign Teachers</h1>
    
    <!-- Table Controls -->
    <div class="table-controls">
        <div class="flex-grow"></div> <!-- Spacer to push button to right -->
        
        <button id="add-teacher-btn" class="btn-submit flex items-center">
            <span class="mr-1">+</span> Add Teacher
        </button>
    </div>
    
    <!-- Head Teachers Table -->
    <div class="table-section">
        <div class="section-header">
            <h2>Head Teachers</h2>
        </div>
        <div class="table-container">
            <table class="main-table">
                <thead class="table-head">
                    <tr class="table-row">
                        <th scope="col" class="table-header">Full Name</th>
                        <th scope="col" class="table-header">Email</th>
                        <th scope="col" class="table-header">Strand</th>
                        <th scope="col" class="table-header">Status</th>
                        <th scope="col" class="table-header">Action</th>
                    </tr>
                </thead>
                <tbody>
                    @if(count($headTeachers) > 0)
                        @foreach($headTeachers as $teacher)
                        <tr>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">{{ $teacher['name'] }}</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">{{ $teacher['email'] }}</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">{{ $teacher['strand'] }}</div>
                            </td>
                            <td class="table-cell">
                                <span class="status-badge status-{{ $teacher['status'] === 'active' ? 'active' : 'inactive' }}">
                                    {{ ucfirst($teacher['status']) }}
                                </span>
                            </td>
                            <td class="table-cell">
                                <div class="action-cell">
                                    @if($teacher['status'] === 'active')
                                        <button class="btn-deactivate" data-teacher-id="{{ $teacher['id'] }}" data-teacher-name="{{ $teacher['name'] }}">
                                            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                                            </svg>
                                            Deactivate
                                        </button>
                                    @else
                                        <button class="btn-activate" data-teacher-id="{{ $teacher['id'] }}" data-teacher-name="{{ $teacher['name'] }}">
                                            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Activate
                                        </button>
                                    @endif
                                    <button class="btn-remove" data-teacher-id="{{ $teacher['id'] }}" data-teacher-name="{{ $teacher['name'] }}">
                                        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Remove
                                    </button>
                                </div>
                            </td>
                        </tr>
                        @endforeach
                    @else
                        <tr>
                            <td colspan="5" class="table-cell">
                                <div class="empty-state">
                                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    </svg>
                                    <p class="empty-state-text">No head teachers found. Click 'Add Teacher' to create one.</p>
                                </div>
                            </td>
                        </tr>
                    @endif
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Science Teachers Table -->
    <div class="table-section">
        <div class="section-header">
            <h2>Science Teachers</h2>
        </div>
        <div class="table-container">
            <table class="main-table">
                <thead class="table-head">
                    <tr class="table-row">
                        <th scope="col" class="table-header">Full Name</th>
                        <th scope="col" class="table-header">Email</th>
                        <th scope="col" class="table-header">Strand</th>
                        <th scope="col" class="table-header">Status</th>
                        <th scope="col" class="table-header">Action</th>
                    </tr>
                </thead>
                <tbody>
                    @if(count($scienceTeachers) > 0)
                        @foreach($scienceTeachers as $teacher)
                        <tr>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">{{ $teacher['name'] }}</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">{{ $teacher['email'] }}</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">{{ $teacher['strand'] }}</div>
                            </td>
                            <td class="table-cell">
                                <span class="status-badge status-{{ $teacher['status'] === 'active' ? 'active' : 'inactive' }}">
                                    {{ ucfirst($teacher['status']) }}
                                </span>
                            </td>
                            <td class="table-cell">
                                <div class="action-cell">
                                    @if($teacher['status'] === 'active')
                                        <button class="btn-deactivate" data-teacher-id="{{ $teacher['id'] }}" data-teacher-name="{{ $teacher['name'] }}">
                                            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                                            </svg>
                                            Deactivate
                                        </button>
                                    @else
                                        <button class="btn-activate" data-teacher-id="{{ $teacher['id'] }}" data-teacher-name="{{ $teacher['name'] }}">
                                            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Activate
                                        </button>
                                    @endif
                                    <button class="btn-remove" data-teacher-id="{{ $teacher['id'] }}" data-teacher-name="{{ $teacher['name'] }}">
                                        <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Remove
                                    </button>
                                </div>
                            </td>
                        </tr>
                        @endforeach
                    @else
                        <tr>
                            <td colspan="5" class="table-cell">
                                <div class="empty-state">
                                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    </svg>
                                    <p class="empty-state-text">No science teachers found. Click 'Add Teacher' to create one.</p>
                                </div>
                            </td>
                        </tr>
                    @endif
                </tbody>
            </table>
        </div>
    </div>

    <!-- Add Teacher Modal -->
    <div id="add-teacher-modal" class="modal-backdrop hidden">
        <div class="modal-container">
            <div class="modal-header">
                <h3 class="modal-title" id="modal-title">Add New Teacher</h3>
                <button id="close-modal" class="modal-close">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <form id="add-teacher-form" novalidate>
                @csrf
                <div class="form-grid">
                    <!-- First Name -->
                    <div class="form-group">
                        <label for="first-name" class="form-label">First Name</label>
                        <input type="text" id="first-name" name="first_name" class="form-input" 
                               placeholder="Enter first name" required minlength="2" maxlength="50">
                        <div class="error-message hidden" id="first-name-error"></div>
                    </div>
                    
                    <!-- Last Name -->
                    <div class="form-group">
                        <label for="last-name" class="form-label">Last Name</label>
                        <input type="text" id="last-name" name="last_name" class="form-input" 
                               placeholder="Enter last name" required minlength="2" maxlength="50">
                        <div class="error-message hidden" id="last-name-error"></div>
                    </div>
                
                    <!-- Email -->
                    <div class="form-group">
                        <label for="email" class="form-label">Email</label>
                        <input type="email" id="email" name="email" class="form-input" 
                               placeholder="teacher@example.com" required>
                        <div class="error-message hidden" id="email-error"></div>
                    </div>
                    
                    <!-- Teacher Role -->
                    <div class="form-group">
                        <label for="teacher-role" class="form-label">Teacher Role</label>
                        <div class="select-wrapper">
                            <select id="teacher-role" name="teacher_role" class="form-select" required>
                                <option value="">Select Role</option>
                                <option value="Head Teacher">Head Teacher</option>
                                <option value="Science Teacher">Science Teacher</option>
                            </select>
                            <div class="select-icon">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="error-message hidden" id="teacher-role-error"></div>
                    </div>
                    
                    <!-- Strand -->
                    <div class="form-group">
                        <label for="strand" class="form-label">Strand</label>
                        <div class="select-wrapper">
                            <select id="strand" name="strand" class="form-select" required>
                                <option value="">Select Strand</option>
                                <option value="STEM">STEM</option>
                                <option value="HUMSS">HUMSS</option>
                                <option value="ABM">ABM</option>
                                <option value="TVL">TVL</option>
                            </select>
                            <div class="select-icon">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="error-message hidden" id="strand-error"></div>
                    </div>
                    
                    <!-- Status -->
                    <div class="form-group">
                        <label for="status" class="form-label">Status</label>
                        <div class="select-wrapper">
                            <select id="status" name="status" class="form-select" required>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                            <div class="select-icon">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="error-message hidden" id="status-error"></div>
                    </div>
                    
                    <!-- Password - Full Width -->
                    <div class="form-group full-width">
                        <label for="password" class="form-label">Password</label>
                        <div class="password-field">
                            <input type="password" id="password" name="password" class="form-input" placeholder="Enter password" required>
                            <button type="button" class="password-toggle">
                                <svg class="eye-open w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                <svg class="eye-closed w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="error-message hidden" id="password-error"></div>
                    </div>

                    <!-- Confirm Password - Full Width -->
                    <div class="form-group full-width">
                        <label for="password-confirm" class="form-label">Confirm Password</label>
                        <div class="password-field">
                            <input type="password" id="password-confirm" name="password_confirmation" class="form-input" placeholder="Confirm password" required>
                            <button type="button" class="password-toggle">
                                <svg class="eye-open w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                <svg class="eye-closed w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="error-message hidden" id="password-confirm-error"></div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn-submit">Create Account</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Success Modal - Improved Design -->
    <div id="success-modal" class="modal-backdrop hidden">
        <div class="modal-success-container">
            <div class="success-icon-container">
                <svg class="success-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <div class="success-message" id="success-message">Teacher created successfully!</div>
            <div class="success-animation"></div>
        </div>
    </div>

    <!-- Status Change Confirmation Modal -->
    <div id="status-modal" class="modal-backdrop hidden">
        <div class="bg-white rounded-lg p-6 max-w-sm mx-auto">
            <div class="text-center mb-4">
                <svg id="status-icon" class="mx-auto h-12 w-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <!-- Icon path will be updated by JS -->
                </svg>
                <h3 class="text-lg font-medium text-gray-900 mt-2" id="status-title">Update Status</h3>
                <p class="text-sm text-gray-500 mt-1">
                    Are you sure you want to <span id="status-action-text">update status for</span> 
                    <span id="status-teacher-name" class="font-medium">this teacher</span>?
                </p>
            </div>
            <div class="flex justify-center gap-4">
                <button type="button" id="status-cancel-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400">
                    Cancel
                </button>
                <button type="button" id="status-confirm-btn" class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    Confirm
                </button>
                <input type="hidden" id="status-teacher-id" value="">
                <input type="hidden" id="status-new-value" value="">
            </div>
        </div>
    </div>

    <!-- Remove Teacher Confirmation Modal -->
    <div id="remove-modal" class="modal-backdrop hidden">
        <div class="bg-white rounded-lg p-6 max-w-sm mx-auto">
            <div class="text-center mb-4">
                <svg class="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-900 mt-2">Remove Teacher</h3>
                <p class="text-sm text-gray-500 mt-1">
                    Are you sure you want to remove <span id="remove-teacher-name" class="font-medium">this teacher</span>? 
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
                <input type="hidden" id="remove-teacher-id" value="">
                <input type="hidden" id="remove-teacher-type" value="">
            </div>
        </div>
    </div>
</div>

@push('scripts')
    @vite('resources/js/roles/principal/assign_teachers.js')
@endpush
@endsection