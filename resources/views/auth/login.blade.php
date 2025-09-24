@extends('layouts.auth')

@section('content')
<div class="login-container"
     data-has-errors="{{ $errors->any() || session('error') ? 'true' : 'false' }}"
     data-error-message="{{ session('error') ?: ($errors->first('email') ?: $errors->first('password')) }}">
    <!-- Header -->
    <div class="auth-header">
        <h1 class="login-title">PHYSICA</h1>
    </div>

    <!-- Form -->
    <form class="login-form auth-form" method="POST" action="{{ url('/login') }}">
        @csrf
        
        <div class="form-group">
            <label for="username" class="form-label">Admin Email</label>
            <input id="username" type="email" 
                   class="form-input @error('email') is-invalid @enderror" 
                   name="email" value="{{ old('email') }}" 
                   required autocomplete="email" autofocus>
            <div class="invalid-feedback">
                <!-- Error messages from client-side validation will appear here -->
            </div>
        </div>
        
        <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <div class="password-input-container">
                <input id="password" type="password" 
                       class="form-input @error('password') is-invalid @enderror" 
                       name="password" required autocomplete="current-password">
                <button type="button" class="toggle-password" tabindex="-1">
                    <img src="{{ asset('assets/icons/visible_icon.png') }}" class="eye-icon eye-visible" alt="Show password">
                    <img src="{{ asset('assets/icons/not_visible_icon.png') }}" class="eye-icon eye-hidden hidden" alt="Hide password">
                </button>
            </div>
            <div class="invalid-feedback">
                <!-- Error messages from client-side validation will appear here -->
            </div>
            <div class="forgot-password-container">
                <a href="{{ route('login') }}" class="forgot-password-link">Forgot Password?</a>
            </div>
        </div>
        
        <div class="login-button-container">
            <button type="submit" class="login-button">
                Login
            </button>
        </div>
    </form>
</div>

<!-- Toast notification container - keep empty in HTML -->
<div class="toast-container">
  <!-- Toasts will be dynamically generated -->
</div>
@endsection

@section('scripts')
    @vite('resources/js/auth/login.js')
@endsection