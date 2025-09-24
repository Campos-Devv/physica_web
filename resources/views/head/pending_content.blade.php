@extends('layouts.app')

@section('styles')
    @vite([
        'resources/css/head/pending/pending_lesson.css',
        'resources/css/head/pending/pending_module.css',
        'resources/css/head/pending/pending_quarter.css'
    ])
@endsection

@section('scripts')
    @vite([
        'resources/js/head/pending/pending_lesson.js',
        'resources/js/head/pending/pending_module.js',
        'resources/js/head/pending/pending_quarter.js'
    ])
@endsection

@section('content')
    <div class="container mx-auto p-6">
        <h1 class="text-2xl font-bold mt-10 mb-10 text-secondary">Pending Content</h1>


    {{-- Pending Quarters --}}
    @include('head.pending.pending_quarter')

    {{-- Pending Modules --}}
    @include('head.pending.pending_module')

    {{-- Pending Lessons --}}
    @include('head.pending.pending_lesson')
    </div>

@endsection