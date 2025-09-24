import Chart from 'chart.js/auto';

class BaseChart {
    constructor(elementId, data = {}, options = {}) {
        this.chartElement = document.getElementById(elementId);
        if (!this.chartElement) return;
        
        this.canvas = this.chartElement.querySelector('canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.data = data;
        this.options = options;
        this.currentPeriod = 'today';
        
        // Colors - can be overridden by child classes
        this.primaryColor = '#3b82f6'; // blue-500
        this.backgroundColor = 'rgba(59, 130, 246, 0.1)'; // blue-500 with low opacity
        this.gridColor = 'rgba(209, 213, 219, 0.2)'; // Reduced opacity for better blending
        this.textColor = '#FAFAFA';
    }
    
    initializeChart(chartType = 'line') {
        try {
            // Ensure we have context to draw the chart
            if (!this.ctx) {
                console.error('Unable to get canvas 2D context for chart');
                return;
            }
            
            // Log chart initialization
            console.log(`Initializing ${chartType} chart with ${this.currentPeriod} period`);
            
            // Ensure data exists for current period
            if (!this.data || !this.data[this.currentPeriod]) {
                console.warn(`No data available for ${this.currentPeriod} period`);
                // Still proceed with empty data
            }
            
            // Create chart
            this.chart = new Chart(this.ctx, {
                type: chartType,
                data: {
                    labels: this.data[this.currentPeriod]?.labels || [],
                    datasets: this.getDatasets()
                },
                options: this.getChartOptions()
            });
            
            console.log(`Chart initialized with ${this.currentPeriod} data:`, {
                labels: this.data[this.currentPeriod]?.labels || [],
                values: this.data[this.currentPeriod]?.values || []
            });
            
            // Update display
            this.updateTotalValue();
        } catch (error) {
            console.error('Error initializing chart:', error);
        }
    }
    
    getDatasets() {
        // Default dataset - can be overridden by child classes
        return [{
            label: 'Data',
            data: this.data[this.currentPeriod]?.values || [],
            fill: true,
            backgroundColor: this.backgroundColor,
            borderColor: this.primaryColor,
            borderWidth: 3,
            tension: 0.4,
            pointBackgroundColor: this.primaryColor,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
        }];
    }
    
    getChartOptions() {
        // Default options - can be overridden by child classes
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: '#ffffff',
                    titleColor: '#1f2937',
                    bodyColor: '#1f2937',
                    borderColor: '#e5e7eb',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                },
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        color: this.gridColor,
                    },
                    ticks: {
                        color: this.textColor,
                    },
                },
                y: {
                    grid: {
                        display: true,
                        color: this.gridColor,
                    },
                    ticks: {
                        color: this.textColor,
                        precision: 0,
                    },
                    beginAtZero: true,
                },
            },
            ...this.options
        };
    }
    
    setupEventListeners() {
        const periodButtons = this.chartElement.querySelectorAll('.chart-metric');
        periodButtons.forEach(button => {
            button.addEventListener('click', () => {
                const period = button.dataset.period;
                this.switchPeriod(period);
                
                periodButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    }
    
    updateTotalValue() {
        try {
            const totalElement = this.chartElement.querySelector('.chart-value');
            if (!totalElement) {
                console.warn('Chart value element not found');
                return;
            }
            
            // Make sure data exists for current period
            if (!this.data || !this.data[this.currentPeriod]) {
                console.warn(`No data available for period: ${this.currentPeriod}`);
                totalElement.textContent = '0';
                return;
            }
            
            // Get total from data or default to 0
            const total = this.data[this.currentPeriod].total ?? 0;
            totalElement.textContent = total;
            
            // Log total update
            console.log(`Updated ${this.currentPeriod} total to: ${total}`);
            
            // Update the date context
            this.updateDateContext();
        } catch (error) {
            console.error('Error updating total value:', error);
        }
    }
    
    updateDateContext() {
        try {
            const dateContextElement = this.chartElement.querySelector('.chart-date-context');
            if (!dateContextElement) {
                console.warn('Date context element not found');
                return;
            }
            
            const now = new Date();
            let dateContext = '';
            
            // Set context text based on period
            switch (this.currentPeriod) {
                case 'today':
                    dateContext = `${now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
                    break;
                case 'daily':
                    dateContext = `${now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
                    break;
                case 'monthly':
                    dateContext = `${now.getFullYear()}`;
                    break;
                default:
                    dateContext = '';
            }
            
            dateContextElement.textContent = dateContext;
            console.log(`Updated date context for ${this.currentPeriod} to: ${dateContext}`);
        } catch (error) {
            console.error('Error updating date context:', error);
        }
    }
    
    switchPeriod(period) {
        try {
            // Log switch attempt
            console.log(`Attempting to switch chart from ${this.currentPeriod} to ${period}`);
            
            // Validate period exists
            if (!this.data || !this.data[period]) {
                console.warn(`Cannot switch to period ${period} - data not available`);
                return;
            }
            
            // Skip if same period
            if (this.currentPeriod === period) {
                console.log(`Already displaying ${period} period`);
                return;
            }
            
            // Switch period
            this.currentPeriod = period;
            console.log(`Switched to ${period} period`);
            
            // Update chart with new data
            this.updateChartData();
        } catch (error) {
            console.error('Error switching chart period:', error);
        }
    }
    
    updateChartData() {
        try {
            // Validate chart exists
            if (!this.chart) {
                console.error('Cannot update chart - chart not initialized');
                return;
            }
            
            // Validate data exists
            if (!this.data || !this.data[this.currentPeriod]) {
                console.error(`Cannot update chart - no data for ${this.currentPeriod} period`);
                return;
            }
            
            // Get data for current period
            const periodData = this.data[this.currentPeriod];
            
            // Log data being used
            console.log(`Updating chart with ${this.currentPeriod} data:`, {
                labels: periodData.labels || [],
                values: periodData.values || [],
                total: periodData.total || 0
            });
            
            // Update chart data
            this.chart.data.labels = periodData.labels || [];
            this.chart.data.datasets[0].data = periodData.values || [];
            this.chart.update();
            
            // Update total value display
            this.updateTotalValue();
        } catch (error) {
            console.error('Error updating chart data:', error);
        }
    }
}

// Export as both default and named export for flexibility
export default BaseChart;
export { BaseChart };
