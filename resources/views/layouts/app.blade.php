<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'PHYSICA') }}</title>

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Styles -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])

    <!-- Page-specific styles -->
    @yield('styles')
</head>
<body class="bg-custom-white w-full" id="app-body">
    @include('partials.sidebar')
    
    <div class="main-content">
        @yield('content')
    </div>

    {{-- Global dialog template for dialog.js --}}
    @include('components.dialog')

    <!-- Page-specific scripts -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Page-specific scripts yield -->
    @yield('scripts')
    
    @stack('scripts')
</body>
</html>


<!-- Add this to your sidebar or navbar -->
@if(Session::has('user'))
<form method="POST" action="{{ route('logout') }}" class="mt-auto">
  
</form>
@endif