/**
 * Button component functionality
 */
export default class Button {
    constructor(element) {
        this.element = element;
        this.init();
    }
    
    init() {
        // Add click effects or animations
        this.element.addEventListener('click', (e) => {
            // Add ripple effect or other animations if needed
            this.addClickEffect(e);
        });
    }
    
    addClickEffect(e) {
        // Example: Simple ripple effect
        const ripple = document.createElement('span');
        ripple.classList.add('absolute', 'inset-0', 'bg-white', 'opacity-30', 'rounded');
        this.element.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            ripple.remove();
        }, 300);
    }
    
    // Initialize tab buttons
    static initTabButtons() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                tabButtons.forEach(btn => {
                    btn.classList.remove('tab-active');
                    btn.classList.add('tab-inactive');
                });
                
                // Add active class to clicked button
                button.classList.add('tab-active');
                button.classList.remove('tab-inactive');
            });
        });
    }
    
    // Static method to initialize all buttons
    static initButtons() {
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => new Button(button));
        
        // Initialize tab buttons
        Button.initTabButtons();
    }
}

// Initialize buttons when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Button.initButtons();
});