// Enhanced Dashboard JavaScript
class ModernDashboard {
    constructor() {
        this.charts = {};
        this.data = {
            expenses: [],
            deposits: [],
            members: []
        };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.initializeCharts();
        await this.loadDashboardData();
        this.updateStats();
        this.loadRecentActivity();
        this.loadTopSpenders();
        this.updateInsights();
        this.startRealTimeUpdates();
    }

    setupEventListeners() {
        // Period selector
        document.getElementById('statsPeriod')?.addEventListener('change', (e) => {
            this.updateStatsPeriod(e.target.value);
        });

        // Chart period buttons
        document.querySelectorAll('.chart-period').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chart-period').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateExpenseChart(e.target.dataset.period);
            });
        });

        // Dropdown functionality
        document.querySelector('.dropdown-toggle')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = e.target.closest('.dropdown');
            dropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        });

        // Feature card hover effects
        document.querySelectorAll('.feature-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }

    initializeCharts() {
        // Mini trend chart
        const miniCtx = document.getElementById('miniTrendChart');
        if (miniCtx) {
            this.charts.miniTrend = new Chart(miniCtx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        data: [120, 190, 300, 500, 200, 300, 450],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    },
                    elements: {
                        point: { radius: 0 }
                    }
                }
            });
        }

        // Main expense chart
        const expenseCtx = document.getElementById('expenseChart');
        if (expenseCtx) {
            this.charts.expense = new Chart(expenseCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Daily Expenses',
                        data: [],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#667eea',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: '#667eea',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return `Expense: ৳${context.parsed.y.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#6b7280'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(107, 114, 128, 0.1)'
                            },
                            ticks: {
                                color: '#6b7280',
                                callback: function(value) {
                                    return '৳' + value;
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }
    }

    async loadDashboardData() {
        try {
            // Load all data in parallel
            const [expensesRes, depositsRes, membersRes] = await Promise.all([
                fetch('/api/bazar'),
                fetch('/api/deposits'),
                fetch('/api/members')
            ]);

            this.data.expenses = await expensesRes.json();
            this.data.deposits = await depositsRes.json();
            this.data.members = await membersRes.json();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showErrorToast('Failed to load dashboard data');
        }
    }

    updateStats() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // Calculate totals
        const totalExpenses = this.data.expenses.reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);
        const totalDeposits = this.data.deposits.reduce((sum, deposit) => sum + parseFloat(deposit.amount || 0), 0);
        const availableBalance = totalDeposits - totalExpenses;

        // Calculate monthly data
        const monthlyExpenses = this.data.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        }).reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const currentDay = currentDate.getDate();
        const dailyAverage = monthlyExpenses / currentDay;

        // Today's expenses
        const today = currentDate.toISOString().split('T')[0];
        const todayExpenses = this.data.expenses.filter(expense => 
            expense.date === today
        ).reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);

        // Update UI elements
        this.updateElement('totalExpenses', `৳${totalExpenses.toFixed(2)}`);
        this.updateElement('totalDeposits', `৳${totalDeposits.toFixed(2)}`);
        this.updateElement('availableBalance', `৳${availableBalance.toFixed(2)}`);
        this.updateElement('dailyAverage', `৳${dailyAverage.toFixed(2)}`);
        this.updateElement('todayExpenses', `৳${todayExpenses.toFixed(2)}`);
        this.updateElement('currentBalance', `৳${availableBalance.toFixed(2)}`);
        this.updateElement('monthlyBudget', '৳5,000');

        // Update budget status
        const monthlyBudget = 5000;
        const budgetUsed = (monthlyExpenses / monthlyBudget) * 100;
        this.updateElement('monthlyBudgetAmount', `৳${monthlyBudget.toFixed(2)}`);
        this.updateElement('monthlySpent', `৳${monthlyExpenses.toFixed(2)}`);
        this.updateElement('budgetRemaining', `৳${(monthlyBudget - monthlyExpenses).toFixed(2)}`);
        this.updateElement('budgetProgressFill', '', 'style', `width: ${Math.min(budgetUsed, 100)}%`);

        // Update progress bars and trends
        this.updateProgressBars();
        this.updateTrends();
    }

    updateProgressBars() {
        const monthlyBudget = 5000;
        const monthlyExpenses = this.calculateMonthlyExpenses();
        const expensesProgress = (monthlyExpenses / monthlyBudget) * 100;
        
        const progressElement = document.getElementById('expensesProgress');
        if (progressElement) {
            progressElement.style.width = `${Math.min(expensesProgress, 100)}%`;
        }
    }

    updateTrends() {
        // Calculate trends compared to previous periods
        const currentMonthExpenses = this.calculateMonthlyExpenses();
        const previousMonthExpenses = this.calculatePreviousMonthExpenses();
        
        const expensesTrend = ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100;
        
        const trendsElement = document.getElementById('expensesTrend');
        if (trendsElement) {
            const isPositive = expensesTrend > 0;
            trendsElement.innerHTML = `
                <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                ${isPositive ? '+' : ''}${expensesTrend.toFixed(1)}%
            `;
            trendsElement.className = `trend-indicator ${isPositive ? 'negative' : 'positive'}`;
        }
    }

    calculateMonthlyExpenses() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        return this.data.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        }).reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);
    }

    calculatePreviousMonthExpenses() {
        const currentDate = new Date();
        const previousMonth = currentDate.getMonth() - 1;
        const year = previousMonth < 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
        const month = previousMonth < 0 ? 11 : previousMonth;

        return this.data.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
        }).reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);
    }

    async loadRecentActivity() {
        const activityContainer = document.getElementById('recentActivity');
        if (!activityContainer) return;

        try {
            // Combine recent expenses and deposits
            const recentItems = [
                ...this.data.expenses.slice(-5).map(item => ({
                    type: 'expense',
                    icon: 'fas fa-shopping-cart',
                    title: item.items || 'Bazar Expense',
                    amount: parseFloat(item.cost || 0),
                    date: item.date,
                    member: item.member_name || 'Unknown'
                })),
                ...this.data.deposits.slice(-5).map(item => ({
                    type: 'deposit',
                    icon: 'fas fa-plus-circle',
                    title: 'Deposit',
                    amount: parseFloat(item.amount || 0),
                    date: item.date,
                    member: item.member_name || 'Unknown'
                }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

            activityContainer.innerHTML = recentItems.length ? recentItems.map(item => `
                <div class="activity-item">
                    <div class="activity-icon ${item.type}">
                        <i class="${item.icon}"></i>
                    </div>
                    <div class="activity-details">
                        <div class="activity-title">${item.title}</div>
                        <div class="activity-meta">
                            <span class="activity-member">${item.member}</span>
                            <span class="activity-date">${this.formatDate(item.date)}</span>
                        </div>
                    </div>
                    <div class="activity-amount ${item.type}">
                        ${item.type === 'expense' ? '-' : '+'}৳${item.amount.toFixed(2)}
                    </div>
                </div>
            `).join('') : '<div class="no-activity">No recent activity</div>';
        } catch (error) {
            console.error('Error loading recent activity:', error);
            activityContainer.innerHTML = '<div class="error-activity">Failed to load activity</div>';
        }
    }

    async loadTopSpenders() {
        const spendersContainer = document.getElementById('topSpenders');
        if (!spendersContainer) return;

        try {
            // Calculate spending by member
            const spendingByMember = {};
            this.data.expenses.forEach(expense => {
                const member = expense.member_name || 'Unknown';
                spendingByMember[member] = (spendingByMember[member] || 0) + parseFloat(expense.cost || 0);
            });

            const topSpenders = Object.entries(spendingByMember)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);

            spendersContainer.innerHTML = topSpenders.length ? topSpenders.map(([member, amount], index) => `
                <div class="spender-item">
                    <div class="spender-rank">${index + 1}</div>
                    <div class="spender-info">
                        <div class="spender-name">${member}</div>
                        <div class="spender-amount">৳${amount.toFixed(2)}</div>
                    </div>
                    <div class="spender-bar">
                        <div class="spender-progress" style="width: ${(amount / topSpenders[0][1]) * 100}%"></div>
                    </div>
                </div>
            `).join('') : '<div class="no-spenders">No spending data available</div>';
        } catch (error) {
            console.error('Error loading top spenders:', error);
            spendersContainer.innerHTML = '<div class="error-spenders">Failed to load spender data</div>';
        }
    }

    updateExpenseChart(days = 30) {
        if (!this.charts.expense) return;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(days));

        const chartData = this.generateChartData(startDate, endDate);
        
        this.charts.expense.data.labels = chartData.labels;
        this.charts.expense.data.datasets[0].data = chartData.data;
        this.charts.expense.update('active');
    }

    generateChartData(startDate, endDate) {
        const labels = [];
        const data = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            labels.push(this.formatChartDate(currentDate));
            
            const dayExpenses = this.data.expenses.filter(expense => 
                expense.date === dateStr
            ).reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);
            
            data.push(dayExpenses);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return { labels, data };
    }

    updateInsights() {
        const insightsContainer = document.getElementById('smartInsights');
        if (!insightsContainer) return;

        const insights = this.generateSmartInsights();
        
        insightsContainer.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-text">
                    <strong>${insight.title}:</strong> ${insight.message}
                </div>
            </div>
        `).join('');
    }

    generateSmartInsights() {
        const insights = [];
        const currentMonthExpenses = this.calculateMonthlyExpenses();
        const previousMonthExpenses = this.calculatePreviousMonthExpenses();
        const monthlyBudget = 5000;

        // Budget insights
        const budgetUsage = (currentMonthExpenses / monthlyBudget) * 100;
        if (budgetUsage > 90) {
            insights.push({
                icon: '⚠️',
                title: 'Budget Alert',
                message: 'You\'ve used over 90% of your monthly budget. Consider reducing expenses.'
            });
        } else if (budgetUsage < 50) {
            insights.push({
                icon: '💰',
                title: 'Budget Status',
                message: 'Great job! You\'re well within your budget this month.'
            });
        }

        // Spending trend insights
        if (previousMonthExpenses > 0) {
            const trendPercentage = ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses) * 100;
            if (trendPercentage > 20) {
                insights.push({
                    icon: '📈',
                    title: 'Spending Alert',
                    message: `Your spending is ${trendPercentage.toFixed(1)}% higher than last month.`
                });
            } else if (trendPercentage < -10) {
                insights.push({
                    icon: '💡',
                    title: 'Spending Tip',
                    message: `Excellent! You're spending ${Math.abs(trendPercentage).toFixed(1)}% less than last month.`
                });
            }
        }

        // Pattern insights
        const weekendExpenses = this.calculateWeekendExpenses();
        const weekdayExpenses = this.calculateWeekdayExpenses();
        if (weekendExpenses > weekdayExpenses * 1.5) {
            insights.push({
                icon: '📊',
                title: 'Pattern Alert',
                message: 'You tend to spend more on weekends. Consider planning ahead.'
            });
        }

        return insights.length ? insights : [{
            icon: '📊',
            title: 'Analysis',
            message: 'Keep tracking your expenses for better insights.'
        }];
    }

    calculateWeekendExpenses() {
        return this.data.expenses.filter(expense => {
            const date = new Date(expense.date);
            const day = date.getDay();
            return day === 0 || day === 6; // Sunday or Saturday
        }).reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);
    }

    calculateWeekdayExpenses() {
        return this.data.expenses.filter(expense => {
            const date = new Date(expense.date);
            const day = date.getDay();
            return day > 0 && day < 6; // Monday to Friday
        }).reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);
    }

    startRealTimeUpdates() {
        // Update dashboard every 5 minutes
        setInterval(() => {
            this.loadDashboardData().then(() => {
                this.updateStats();
                this.loadRecentActivity();
                this.loadTopSpenders();
                this.updateInsights();
            });
        }, 300000); // 5 minutes
    }

    updateStatsPeriod(period) {
        // Update stats based on selected period
        console.log('Updating stats for period:', period);
        // Implement period-specific calculations
    }

    // Utility functions
    updateElement(id, content, attribute = 'textContent', value = null) {
        const element = document.getElementById(id);
        if (element) {
            if (attribute === 'textContent') {
                element.textContent = content;
            } else {
                element.setAttribute(attribute, value || content);
            }
        }
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    formatChartDate(date) {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    showErrorToast(message) {
        // Create and show error toast
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Quick action functions
function quickAddExpense() {
    window.location.href = 'bazar.html?action=add';
}

function viewReports() {
    window.location.href = 'reports.html';
}

function addBazarRecord() {
    window.location.href = 'bazar.html?action=add';
}

function addDeposit() {
    window.location.href = 'deposit.html?action=add';
}

function manageMembers() {
    window.location.href = 'members.html';
}

function manageBudget() {
    alert('Budget management feature coming soon!');
}

function viewAllActivity() {
    window.location.href = 'reports.html?tab=activity';
}

// Initialize enhanced dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.welcome-section')) {
        new ModernDashboard();
    }
});

// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    const currentPage = window.location.pathname.split('/').pop();
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
});

// Modern loading animation
function showLoading() {
    const loader = document.createElement('div');
    loader.className = 'modern-loader';
    loader.innerHTML = `
        <div class="loader-spinner">
            <div class="spinner"></div>
        </div>
        <p>Loading dashboard...</p>
    `;
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.querySelector('.modern-loader');
    if (loader) {
        loader.remove();
    }
}
