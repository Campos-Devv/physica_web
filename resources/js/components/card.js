/**
 * Card component functionality
 */
export default class Card {
    constructor(element) {
        this.element = element;
        this.init();
    }
    
    init() {
        // Add hover effects or animations if needed
        this.element.addEventListener('mouseenter', () => {
            this.element.classList.add('shadow-lg');
        });
        
        this.element.addEventListener('mouseleave', () => {
            this.element.classList.remove('shadow-lg');
        });
    }
    
    // Static method to initialize all cards on page
    static initCards() {
        const cards = document.querySelectorAll('.content-card');
        cards.forEach(card => new Card(card));
    }
}

// Initialize cards when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Card.initCards();
});