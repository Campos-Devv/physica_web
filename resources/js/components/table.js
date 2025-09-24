/**
 * Table component functionality
 */
export default class Table {
    constructor(element) {
        this.element = element;
        this.rows = element.querySelectorAll('tbody tr');
        this.init();
    }
    
    init() {
        // Add row hover effects
        this.rows.forEach(row => {
            row.addEventListener('mouseenter', () => {
                row.classList.add('bg-gray-50');
            });
            
            row.addEventListener('mouseleave', () => {
                row.classList.remove('bg-gray-50');
            });
        });
        
        // Initialize sorting if needed
        this.initSorting();
    }
    
    initSorting() {
        const headers = this.element.querySelectorAll('th');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                // Implement sorting logic here if needed
                console.log(`Sorting by ${header.textContent}`);
            });
        });
    }
    
    // Static method to initialize all tables on page
    static initTables() {
        const tables = document.querySelectorAll('.data-table');
        tables.forEach(table => new Table(table));
    }
}

// Initialize tables when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Table.initTables();
});