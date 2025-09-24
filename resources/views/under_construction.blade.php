@extends('layouts.app')

@section('content')
<div class="container mt-5">
    <div class="card">
        <div class="card-body text-center">
            <i class="fas fa-hard-hat fa-5x text-warning mb-3"></i>
            <h2>Under Construction</h2>
            <p class="lead">This feature is currently being developed. Please check back later.</p>
            <a href="{{ route('dashboard') }}" class="btn btn-primary mt-3">
                <i class="fas fa-arrow-left mr-2"></i> Back to Dashboard
            </a>
        </div>
    </div>
</div>
@endsection