@extends('layouts.app')

@section('styles')
    @vite([
        'resources/css/roles/science/create_lesson.css',
        'resources/css/lesson_management/create/quarter.css',
        'resources/css/lesson_management/create/module.css',
        'resources/css/lesson_management/create/lesson.css'
    ])
@endsection

@section('content')
    <div class="container mx-auto p-6">
        <h1 class="text-2xl font-bold mt-10 mb-10 text-secondary">Lesson Management</h1>
        
        <!-- Include the quarter management component -->
        @include('lesson_management.create.quarter')
        
        <!-- Selected Quarter Modules Section (initially hidden) -->
        @include('lesson_management.create.module')
        
        <!-- Selected Module Lessons Section (initially hidden) -->
        @include('lesson_management.create.lesson')
    </div>
@endsection

@section('scripts')
    @vite([
        'resources/js/roles/science/create_lesson.js',
        'resources/js/lesson_management/create/quarter.js',
        'resources/js/lesson_management/create/module.js',
        'resources/js/lesson_management/create/lesson.js'
    ])
@endsection