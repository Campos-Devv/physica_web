@extends('layouts.app')

@section('styles')
    @vite('resources/css/roles/science/science.css')
@endsection

@section('content')
<div class="teacher-dashboard">
    <div class="dashboard-header">
        <h1 class="text-2xl font-bold text-secondary mb-1">Teacher Dashboard</h1>
        <p class="text-secondary">Welcome back, {{ session('user.name') }}</p>
    </div>

    <div class="dashboard-main-content">
        <div class="table-section">
            <div class="section-header">
                <h2 >Student Leaderboard</h2>
                <div class="leaderboard-controls">
                    <div class="select-wrapper">
                        <select class="select-filter form-select">
                            <option value="all">All Strands</option>
                            <option value="stem">STEM</option>
                            <option value="humss">HUMSS</option>
                            <option value="abm">ABM</option>
                            <option value="gas">GAS</option>
                        </select>
                        <div class="select-icon">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </div>
                    </div>
                    <button class="refresh-btn" id="refreshLeaderboard">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="table-container">
                <table class="main-table">
                    <thead class="table-head">
                        <tr class="table-row">
                            <th scope="col" class="table-header">Rank</th>
                            <th scope="col" class="table-header">Full Name</th>
                            <th scope="col" class="table-header">Strand</th>
                            <th scope="col" class="table-header text-right">Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="table-cell">
                                <div class="table-text">1</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">Juan Dela Cruz</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">STEM</div>
                            </td>
                            <td class="table-cell text-right">
                                <div class="table-text-bold">950</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="table-cell">
                                <div class="table-text">2</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">Maria Santos</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">STEM</div>
                            </td>
                            <td class="table-cell text-right">
                                <div class="table-text-bold">920</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="table-cell">
                                <div class="table-text">3</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">Pedro Reyes</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">HUMSS</div>
                            </td>
                            <td class="table-cell text-right">
                                <div class="table-text-bold">895</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="table-cell">
                                <div class="table-text">4</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">Ana Gonzales</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">ABM</div>
                            </td>
                            <td class="table-cell text-right">
                                <div class="table-text-bold">870</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="table-cell">
                                <div class="table-text">5</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">Manuel Tan</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">STEM</div>
                            </td>
                            <td class="table-cell text-right">
                                <div class="table-text-bold">860</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="table-cell">
                                <div class="table-text">6</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">Sofia Lim</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">GAS</div>
                            </td>
                            <td class="table-cell text-right">
                                <div class="table-text-bold">840</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="table-cell">
                                <div class="table-text">7</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">Carlos Bautista</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">STEM</div>
                            </td>
                            <td class="table-cell text-right">
                                <div class="table-text-bold">830</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="table-cell">
                                <div class="table-text">8</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">Isabella Cruz</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">HUMSS</div>
                            </td>
                            <td class="table-cell text-right">
                                <div class="table-text-bold">825</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="table-cell">
                                <div class="table-text">9</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">Rafael Mendoza</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">ABM</div>
                            </td>
                            <td class="table-cell text-right">
                                <div class="table-text-bold">810</div>
                            </td>
                        </tr>
                        <tr>
                            <td class="table-cell">
                                <div class="table-text">10</div>
                            </td>
                            <td class="table-cell">
                                <div class="table-cell-name">
                                    <div class="table-text-bold">Olivia Garcia</div>
                                </div>
                            </td>
                            <td class="table-cell">
                                <div class="table-text">STEM</div>
                            </td>
                            <td class="table-cell text-right">
                                <div class="table-text-bold">800</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
    @vite('resources/js/roles/science/science.js')
@endpush