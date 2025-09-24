import './bootstrap';

// Import your chart components
import { BaseChart } from './components/chart';
import StudentRegistrationChart from './components/student_registration_chart';

// Make components available globally
window.BaseChart = BaseChart;
window.StudentRegistrationChart = StudentRegistrationChart;

// Import role-specific scripts
import './roles/head/pending_content.js';
import './roles/head/view_lesson';
import './lesson_management/create/quarter.js';
import './lesson_management/create/module.js';   // if you have it
import './roles/science/create_lesson.js';

// Add other initialization code if needed
console.log('Application initialized');

// No need to call any specific initialization function here
// as initCharts() is automatically called when the DOM is loaded