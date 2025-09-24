@extends('layouts.app')

@section('content')
<div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
    
    <!-- Simple Stats Card -->
    <div class="bg-white p-4 rounded shadow mb-6">
        <h2 class="text-lg font-semibold mb-2">Students</h2>
        <p class="text-3xl font-bold">{{ $totalStudents }}</p>
    </div>
    
    <!-- Recent Students -->
    <div class="bg-white p-4 rounded shadow">
        <h2 class="text-lg font-semibold mb-2">Recent Students</h2>
        
        <div class="space-y-2">
            @foreach ($recentStudents as $student)
                <div class="border-b pb-2">
                    <p class="font-medium">{{ $student['name'] }}</p>
                    <p class="text-gray-600 text-sm">{{ $student['email'] }}</p>
                </div>
            @endforeach
        </div>
    </div>
</div>
@endsection
