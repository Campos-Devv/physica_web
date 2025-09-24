
<div id="{{ $chartId ?? 'registration-chart' }}" class="chart-container">
    <div class="chart-header">
        <div>
            <h2 class="chart-value">0</h2>
            <p class="text-white">{{ $chartTitle ?? 'Student Registrations' }}</p>
            <p class="chart-date-context text-white text-sm opacity-75"></p>
        </div>
        
        <div class="chart-metrics">
            <button class="chart-metric active" data-period="today">Today</button>
            <button class="chart-metric" data-period="daily">Daily</button>
            <button class="chart-metric" data-period="monthly">Monthly</button>
        </div>
    </div>
    
    <div class="chart-graph">
        <canvas></canvas>
    </div>
</div>