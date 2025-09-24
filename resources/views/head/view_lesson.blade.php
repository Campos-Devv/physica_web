@extends('layouts.app')

@section('styles')
    <link href="{{ asset('css/roles/head/view_lesson.css') }}" rel="stylesheet">
@endsection

@section('content')
<div class="container mx-auto px-4 py-6">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">Lesson Content</h1>
    
    @if(isset($error))
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{{ $error }}</p>
        </div>
    @endif
    
    <!-- Quarters Section -->
    <div id="quarters-section" class="section-container mb-10">
        <h2 class="text-xl font-semibold mb-4">Quarters</h2>
        
        @if(count($quarters) > 0)
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                @foreach($quarters as $quarter)
                    <div class="quarter-card bg-white shadow-md rounded-lg p-5 border-l-4 border-blue-500 hover:shadow-lg transition duration-300 cursor-pointer" data-quarter-id="{{ $quarter['id'] }}">
                        <div class="flex justify-between items-start mb-3">
                            <h3 class="text-lg font-medium text-gray-800">{{ $quarter['name'] ?? 'Unnamed Quarter' }}</h3>
                            <span class="status-badge status-badge-approved">
                                Approved
                            </span>
                        </div>
                        
                        <div class="mt-2 text-sm text-gray-500">
                            <div class="flex items-center mb-1">
                                <i class="fas fa-user mr-1"></i>
                                <span>Created by: 
                                    @if(isset($quarter['creatorInfo']))
                                        @if(!empty($quarter['creatorInfo']['name']))
                                            {{ $quarter['creatorInfo']['name'] }}
                                        @elseif(!empty($quarter['creatorInfo']['firstName']) || !empty($quarter['creatorInfo']['lastName']))
                                            {{ ($quarter['creatorInfo']['firstName'] ?? '') . ' ' . ($quarter['creatorInfo']['lastName'] ?? '') }}
                                        @elseif(!empty($quarter['creatorInfo']['email']))
                                            {{ $quarter['creatorInfo']['email'] }}
                                        @else
                                            {{ $quarter['created_by'] ?? 'Unknown' }}
                                        @endif
                                    @else
                                        {{ $quarter['created_by'] ?? 'Unknown' }}
                                    @endif
                                </span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-calendar-alt mr-1"></i>
                                <span>Created at:
                                    @if(isset($quarter['created_at']))
                                        @php
                                            // Handle different timestamp formats
                                            $timestamp = $quarter['created_at'];
                                            if (is_array($timestamp) && isset($timestamp['_seconds'])) {
                                                // Firestore timestamp object format
                                                $date = \Carbon\Carbon::createFromTimestamp($timestamp['_seconds']);
                                            } elseif (is_numeric($timestamp)) {
                                                // Regular timestamp
                                                $date = \Carbon\Carbon::createFromTimestamp($timestamp);
                                            } else {
                                                // Try to parse as string
                                                try {
                                                    $date = \Carbon\Carbon::parse($timestamp);
                                                } catch (\Exception $e) {
                                                    $date = null;
                                                }
                                            }
                                        @endphp
                                        
                                        @if($date)
                                            {{ $date->format('M d, Y') }}
                                        @else
                                            Date unknown
                                        @endif
                                    @else
                                        Date unknown
                                    @endif
                                </span>
                            </div>
                        </div>
                        @if(isset($quarter['comment']) && !empty($quarter['comment']))
                            <div class="mt-3 pt-3 border-t border-gray-100 text-sm">
                                <p><span class="font-medium">Comment:</span> {{ $quarter['comment'] }}</p>
                            </div>
                        @endif
                    </div>
                @endforeach
            </div>
        @else
            <div class="bg-gray-50 p-4 rounded-lg text-center">
                <p class="text-gray-600">No approved quarters available.</p>
            </div>
        @endif
    </div>
    
    <!-- Modules Section -->
    <div id="modules-section" class="section-container mb-10 hidden">
        <div class="bg-white rounded-lg shadow-md p-5 mb-6">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                    <button class="back-to-quarters mr-2 p-1 text-sm bg-transparent hover:bg-gray-100 text-gray-600 rounded-full flex items-center">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h2 class="text-xl font-semibold">Modules for <span class="selected-quarter-name font-medium text-purple-700"></span></h2>
                </div>
            </div>
            
            <div class="modules-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Modules will be loaded here via AJAX -->
                <div class="col-span-3 text-center py-4 text-gray-500">Select a quarter to view its modules</div>
            </div>
        </div>
    </div>
    
    <!-- Lessons Section -->
    <div id="lessons-section" class="section-container mb-10 hidden">
        <div class="bg-white rounded-lg shadow-md p-5 mb-6">
            <div class="flex items-center mb-4">
                <button class="back-to-modules mr-2 p-1 text-sm bg-transparent hover:bg-gray-100 text-gray-600 rounded-full flex items-center">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <h2 class="text-xl font-semibold">Lessons for <span class="selected-module-name font-medium text-purple-700"></span></h2>
            </div>
            
            <div class="lessons-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Lessons will be loaded here via AJAX -->
                <div class="col-span-3 text-center py-4 text-gray-500">Select a module to view its lessons</div>
            </div>
        </div>
    </div>
    
    <!-- Lesson Details Section -->
    <div id="lesson-details-section" class="section-container hidden">
        <div class="bg-white rounded-lg shadow-md p-5 mb-6">
            <div class="flex items-center mb-4">
                <button class="back-to-lessons mr-2 p-1 text-sm bg-transparent hover:bg-gray-100 text-gray-600 rounded-full flex items-center">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <h2 class="text-xl font-semibold">Lesson Details</h2>
            </div>
            
            <div class="lesson-content">
                <!-- Lesson details will be loaded here via AJAX -->
                <div class="text-center py-4 text-gray-500">Select a lesson to view its details</div>
            </div>
        </div>
    </div>
</div>

@endsection

@section('scripts')
@vite('resources/js/roles/head/view_lesson.js')
@endsection
