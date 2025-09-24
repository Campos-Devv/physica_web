/**
 * Sidebar functionality
 */
export default class Sidebar {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.toggleButton = document.getElementById('sidebar-toggle');
        this.links = document.querySelectorAll('.sidebar a');
        this.mainContent = document.querySelector('.main-content');
        
        if (this.sidebar && this.toggleButton) {
            this.init();
            console.log('Sidebar initialized');
        } else {
            console.warn('Sidebar elements not found:', {
                sidebar: !!this.sidebar,
                toggleButton: !!this.toggleButton
            });
        }
    }
    
    init() {
        // Apply saved state on page load
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (sidebarCollapsed && this.sidebar) {
            this.sidebar.classList.add('collapsed');
            document.body.classList.add('sidebar-collapsed');
        }
        
        // Setup toggle functionality if button exists
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleSidebar();
                console.log('Sidebar toggled, collapsed:', this.sidebar.classList.contains('collapsed'));
            });
        }
        
        // Handle active links if they exist
        if (this.links && this.links.length > 0) {
            this.links.forEach(link => {
                // Check if link href matches current URL
                if (link.href === window.location.href) {
                    link.classList.add('active');
                }
                
                // Add transition effects
                link.addEventListener('mouseenter', () => {
                    if (!link.classList.contains('active')) {
                        link.classList.add('hover:bg-gray-700');
                    }
                });
            });
        }
    }
    
    toggleSidebar() {
        if (!this.sidebar) return;
        
        this.sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed');
        
        // Save state to localStorage
        localStorage.setItem('sidebarCollapsed', this.sidebar.classList.contains('collapsed'));
    }
}