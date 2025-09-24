import { BaseChart } from './chart.js';

class StudentRegistrationChart extends BaseChart {
    constructor(elementId, options = {}, initialData = null) {
        // Log data being received from server before doing anything else
        console.log('StudentRegistrationChart initializing with data:', initialData);
        
        // Create default data structure for safety
        const defaultData = {
            today: { labels: [], values: [], total: 0 },
            daily: { labels: [], values: [], total: 0 },
            monthly: { labels: [], values: [], total: 0 }
        };
        
        // Call super FIRST before using 'this'
        super(elementId, initialData || defaultData, options);
        
        // Now we can safely use 'this' to validate data
        if (initialData) {
            this.data = this.validateServerData(initialData);
        }
        
        // Set chart colors
        this.primaryColor = '#509CDB';  
        this.backgroundColor = function(context) {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return null;
            
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');
            return gradient;
        };
        
        // Initialize chart immediately with provided data
        this.initializeChart();
        this.setupEventListeners();
    }
    
    /**
     * Validate and normalize server data to ensure it has the right structure
     */
    validateServerData(data) {
        try {
            // Safety check for data
            if (!data || typeof data !== 'object') {
                console.warn('Invalid or missing chart data from server');
                return this.getDefaultChartData();
            }
            
            const periods = ['today', 'daily', 'monthly'];
            const validData = {};
            let isDataValid = false;
            
            // Validate each period's data
            periods.forEach(period => {
                try {
                    if (data[period] && typeof data[period] === 'object') {
                        // Initialize with empty arrays for safety
                        validData[period] = {
                            labels: [],
                            values: [],
                            total: 0
                        };
                        
                        // Safely assign values if they exist
                        if (Array.isArray(data[period].labels)) {
                            validData[period].labels = [...data[period].labels];
                        }
                        
                        if (Array.isArray(data[period].values)) {
                            validData[period].values = [...data[period].values];
                        }
                        
                        if (typeof data[period].total === 'number') {
                            validData[period].total = data[period].total;
                        }
                        
                        // If we have any valid period data, mark data as partially valid
                        if (validData[period].labels.length > 0 || validData[period].values.length > 0) {
                            isDataValid = true;
                        }
                        
                        // Ensure labels and values have the same length
                        if (validData[period].labels.length !== validData[period].values.length) {
                            console.warn(`Length mismatch for ${period} period: labels (${validData[period].labels.length}) vs values (${validData[period].values.length})`);
                            
                            // Adjust arrays to match length
                            const maxLength = Math.max(validData[period].labels.length, validData[period].values.length);
                            
                            // Extend labels if needed
                            while (validData[period].labels.length < maxLength) {
                                validData[period].labels.push(`Item ${validData[period].labels.length + 1}`);
                            }
                            
                            // Extend values if needed
                            while (validData[period].values.length < maxLength) {
                                validData[period].values.push(0);
                            }
                        }
                    } else {
                        validData[period] = { labels: [], values: [], total: 0 };
                    }
                } catch (err) {
                    console.error(`Error validating ${period} period data:`, err);
                    validData[period] = { labels: [], values: [], total: 0 };
                }
            });
            
            // If no valid data was found, use default data
            if (!isDataValid) {
                console.warn('No valid chart data found in server response');
                return this.getDefaultChartData();
            }
            
            console.log('Validated chart data:', validData);
            return validData;
        } catch (error) {
            console.error('Error during data validation:', error);
            return this.getDefaultChartData();
        }
    }
    
    /**
     * Get default chart data when server data is invalid
     */
    getDefaultChartData() {
        return {
            today: { 
                labels: Array(24).fill('').map((_, i) => `${i}h`),
                values: Array(24).fill(0),
                total: 0
            },
            daily: { 
                labels: Array(31).fill('').map((_, i) => `${i+1}`),
                values: Array(31).fill(0),
                total: 0
            },
            monthly: { 
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                values: Array(12).fill(0),
                total: 0
            }
        };
    }
    
    getDatasets() {
        return [{
            label: 'Student Registrations',
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
        const baseOptions = super.getChartOptions();
        
        return {
            ...baseOptions,
            plugins: {
                ...baseOptions.plugins,
                tooltip: {
                    ...baseOptions.plugins.tooltip,
                    callbacks: {
                        title: (items) => items[0].label,
                        label: (context) => `Student Registrations: ${context.raw}`
                    }
                }
            }
        };
    }
}

// Make it available both as a module export and globally
export default StudentRegistrationChart;
window.StudentRegistrationChart = StudentRegistrationChart;