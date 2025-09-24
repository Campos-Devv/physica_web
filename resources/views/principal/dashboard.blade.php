@extends('layouts.app')

@section('content')
<div class="principal-dashboard">
    <div class="mt-8">
        <h1 class="dashboard-title">Dashboard</h1>
    </div>

    <div class="stats-grid">
        <!-- Stats Cards -->
        <div class="content-card group head-teacher-card">
            <div>
                <h5 class="stats-label">HEAD TEACHERS</h5>
                <h2 class="stats-value">{{ $headTeacherCount }}</h2>
            </div>
        </div>
        
        <div class="content-card group student-card">
            <div>
                <h5 class="stats-label">STUDENTS</h5>
                <h2 class="stats-value">{{ $studentCount }}</h2>
            </div>
        </div>
        
        <div class="content-card group science-teacher-card">
            <div>
                <h5 class="stats-label">SCIENCE TEACHER</h5>
                <h2 class="stats-value">{{ $scienceTeacherCount }}</h2>
            </div>
        </div>
    </div>
    
    <!-- Chart moved below the stats cards -->
    @include('partials.chart', [
        'chartId' => 'registration-chart',
        'chartTitle' => 'Student Registrations'
    ])
</div>
@endsection

@push('scripts')
<!-- Make sure Chart.js is loaded first -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<!-- Include your compiled JS which has the chart components -->
@vite(['resources/js/app.js'])
<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize chart without server data - it will fetch data itself
        new StudentRegistrationChart('registration-chart');
    });
</script>
@endpush



