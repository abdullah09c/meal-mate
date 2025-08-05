// Modern Dashboard JavaScript

class MealMateDashboard {
    constructor() {
        this.userId = null;
        this.userName = null;
        this.init();
    }

    init() {
        this.getUserInfo();
        this.loadDashboardData();
        this.setupEventListeners();
    }

    getUserInfo() {
        const urlParams = new URLSearchParams(window.location.search);
        this.userName = urlParams.get('user') || 'User';
        // In a real app, you'd get userId from session/token
        this.userId = 1; // Default for now
        
        // Update user name in the modern header
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = this.userName;
        }

        // Update user avatar to show first letter of name
        const avatarLetterElement = document.querySelector('.avatar-letter');
        if (avatarLetterElement && this.userName !== 'User') {
            avatarLetterElement.textContent = this.userName.charAt(0).toUpperCase();
        }

        // Update welcome element if it exists (for backward compatibility)
        const welcomeElement = document.querySelector('.welcome-user');
        if (welcomeElement) {
            welcomeElement.textContent = this.userName;
        }
    }

    async loadDashboardData() {
        try {
            // Load today's meal data
            await this.loadTodayMealRate();
            await this.loadTotalCost();
            await this.loadTotalDeposit();
            await this.loadTotalMeals();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    async loadTodayMealRate() {
        try {
            const response = await fetch(`/api/today-meal-rate?userId=${this.userId}`);
            const data = await response.json();
            
            const element = document.querySelector('.today-meal-value');
            if (element) {
                element.textContent = `৳${data.rate || '0.00'}`;
            }

            const subtitleElement = document.querySelector('.today-meal-subtitle');
            if (subtitleElement) {
                subtitleElement.textContent = `${data.mealCount || 0} meals today`;
            }
        } catch (error) {
            console.error('Error loading today meal rate:', error);
            this.updateStatCard('.today-meal-value', '৳0.00');
        }
    }

    async loadTotalCost() {
        try {
            const response = await fetch(`/api/total-cost?userId=${this.userId}`);
            const data = await response.json();
            
            this.updateStatCard('.total-cost-value', `৳${data.totalCost || '0.00'}`);
            this.updateStatCard('.total-cost-subtitle', `This month: ৳${data.monthlyTotal || '0.00'}`);
            
            // Update change indicator
            const changeElement = document.querySelector('.total-cost-change');
            if (changeElement && data.change) {
                changeElement.innerHTML = `
                    <i class="fas fa-${data.change > 0 ? 'arrow-up' : 'arrow-down'}"></i>
                    ${Math.abs(data.change)}% from last month
                `;
                changeElement.className = `stat-change ${data.change > 0 ? 'positive' : 'negative'}`;
            }
        } catch (error) {
            console.error('Error loading total cost:', error);
            this.updateStatCard('.total-cost-value', '৳0.00');
        }
    }

    async loadTotalDeposit() {
        try {
            const response = await fetch(`/api/total-deposit?userId=${this.userId}`);
            const data = await response.json();
            
            this.updateStatCard('.deposit-value', `৳${data.totalDeposit || '0.00'}`);
            this.updateStatCard('.deposit-subtitle', `Available balance`);
            
            // Update change indicator
            const changeElement = document.querySelector('.deposit-change');
            if (changeElement && data.lastDeposit) {
                changeElement.innerHTML = `
                    <i class="fas fa-plus"></i>
                    Last deposit: ৳${data.lastDeposit}
                `;
                changeElement.className = 'stat-change positive';
            }
        } catch (error) {
            console.error('Error loading total deposit:', error);
            this.updateStatCard('.deposit-value', '৳0.00');
        }
    }

    async loadTotalMeals() {
        try {
            const response = await fetch(`/api/total-meals?userId=${this.userId}`);
            const data = await response.json();
            
            this.updateStatCard('.meal-count-value', data.totalMeals || '0');
            this.updateStatCard('.meal-count-subtitle', `This month: ${data.monthlyMeals || 0} meals`);
            
            // Update change indicator
            const changeElement = document.querySelector('.meal-count-change');
            if (changeElement && data.avgPerDay) {
                changeElement.innerHTML = `
                    <i class="fas fa-chart-line"></i>
                    Avg: ${data.avgPerDay} meals/day
                `;
                changeElement.className = 'stat-change positive';
            }
        } catch (error) {
            console.error('Error loading total meals:', error);
            this.updateStatCard('.meal-count-value', '0');
        }
    }

    updateStatCard(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    setupEventListeners() {
        // Modern header dropdown functionality
        this.setupHeaderDropdown();
        
        // Logout functionality (both old and new selectors)
        const logoutBtns = document.querySelectorAll('.logout-btn, .dropdown-item.logout-btn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', this.logout.bind(this));
        });

        // Feature card navigation
        document.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('click', this.handleFeatureClick.bind(this));
        });

        // Quick action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', this.handleQuickAction.bind(this));
        });
    }

    setupHeaderDropdown() {
        const dropdown = document.querySelector('.dropdown');
        const dropdownMenu = document.querySelector('.dropdown-menu');
        
        if (dropdown && dropdownMenu) {
            // Handle click outside to close dropdown
            document.addEventListener('click', (event) => {
                if (!dropdown.contains(event.target)) {
                    dropdownMenu.style.opacity = '0';
                    dropdownMenu.style.visibility = 'hidden';
                    dropdownMenu.style.transform = 'translateY(-10px)';
                }
            });
            
            // Handle dropdown item clicks
            const dropdownItems = document.querySelectorAll('.dropdown-item:not(.logout-btn)');
            dropdownItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const href = item.getAttribute('href');
                    if (href) {
                        window.location.href = href;
                    }
                });
            });
        }
    }

    handleFeatureClick(event) {
        const card = event.currentTarget;
        const target = card.dataset.target;
        
        if (target) {
            window.location.href = target;
        }
    }

    handleQuickAction(event) {
        const btn = event.currentTarget;
        const action = btn.dataset.action;
        
        switch (action) {
            case 'add-meal':
                this.showAddMealModal();
                break;
            case 'add-deposit':
                this.showAddDepositModal();
                break;
            case 'view-profile':
                window.location.href = '/profile';
                break;
            default:
                console.log('Action not implemented:', action);
        }
    }

    showAddMealModal() {
        // This would open a modal to add a meal entry
        alert('Add Meal functionality - Coming soon!');
    }

    showAddDepositModal() {
        // This would open a modal to add a deposit
        alert('Add Deposit functionality - Coming soon!');
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear any stored session data
            localStorage.removeItem('userToken');
            sessionStorage.clear();
            
            // Redirect to home page
            window.location.href = '/';
        }
    }

    showError(message) {
        // Simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 1000;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
    }

    // Utility method to format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('bn-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Utility method to format date
    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(date));
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.modern-dashboard')) {
        new MealMateDashboard();
    }
});

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MealMateDashboard;
}
