document.addEventListener('DOMContentLoaded', function() {
    // Handle leaderboard filter change
    const filterSelect = document.querySelector('.select-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            filterLeaderboard(this.value);
        });
    }

    // Handle refresh button click
    const refreshBtn = document.getElementById('refreshLeaderboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshLeaderboard();
        });
    }

    // Function to filter leaderboard by strand
    function filterLeaderboard(strand) {
        const tableRows = document.querySelectorAll('.main-table tbody tr');
        
        // Apply filtering without unnecessary animation
        tableRows.forEach(row => {
            const rowStrand = row.querySelector('td:nth-child(3) .table-text').textContent;
            
            if (strand === 'all' || rowStrand === strand) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Function to refresh leaderboard (simplified)
    function refreshLeaderboard() {
        // Show refresh animation
        const refreshIcon = refreshBtn.querySelector('svg');
        refreshIcon.classList.add('animate-spin');
        
        // Simulate API call - in production this would be a fetch request
        setTimeout(() => {
            refreshIcon.classList.remove('animate-spin');
        }, 600);
    }
});