// Modern Dashboard JavaScript

// Utility function to get current user ID
function getCurrentUserId() {
    // First try to get from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('userId');
    
    if (userIdFromUrl) {
        return userIdFromUrl;
    }
    
    // Try to get from localStorage
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            return user.id || user.userId || 1;
        } catch (e) {
            console.warn('Error parsing current user from localStorage:', e);
        }
    }
    
    // Default to user ID 1
    return 1;
}

class MealMateDashboard {
  constructor() {
    this.userId = null;
    this.userName = null;
    this.charts = {};
    this.data = {
      expenses: [],
      deposits: [],
      members: []
    };
    this.init();
  }

  init() {
    this.getUserInfo();
    this.loadDashboardData();
    this.setupEventListeners();
    this.initializeCharts();
    this.updateInsights();
    this.startRealTimeUpdates();
  }

  getUserInfo() {
    const urlParams = new URLSearchParams(window.location.search);
    // First try to get userId from URL
    this.userId = urlParams.get("userId") || 1;

    // Try to get user data from localStorage
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        this.userId = user.id || this.userId;
        // Prioritize fullName over firstName for consistent display
        this.userName = user.fullName || user.firstName || "User";
      } catch (e) {
        console.warn("Error parsing current user from localStorage:", e);
        this.userName = urlParams.get("user") || "User";
      }
    } else {
      this.userName = urlParams.get("user") || "User";
    }

    // Update user name in the modern header
    const userNameElement = document.querySelector(".user-name");
    if (userNameElement) {
      userNameElement.textContent = this.userName;
    }

    // Update user avatar to show first letter of name
    const avatarLetterElement = document.querySelector(".avatar-letter");
    if (avatarLetterElement && this.userName !== "User") {
      avatarLetterElement.textContent = this.userName.charAt(0).toUpperCase();
    }

    // Update welcome element if it exists (for backward compatibility)
    const welcomeElement = document.querySelector(".welcome-user");
    if (welcomeElement) {
      welcomeElement.textContent = this.userName;
    }

    // Update dynamic user name in welcome section
    const userNameDynamicElement = document.querySelector(".user-name-dynamic");
    if (userNameDynamicElement) {
      userNameDynamicElement.textContent = this.userName;
    }
  }

  async loadDashboardData() {
    try {
      // Load today's meal data
      await this.loadTodayMealRate();
      await this.loadTotalCost();
      await this.loadTotalDeposit();
      await this.loadTotalMeals();
      
      // Load enhanced dashboard data
      await this.loadEnhancedData();
      this.updateStats();
      this.loadRecentActivity();
      this.loadTopSpenders();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      this.showError("Failed to load dashboard data");
    }
  }

  async loadEnhancedData() {
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
      console.error('Error loading enhanced dashboard data:', error);
    }
  }

  async loadTodayMealRate() {
    try {
      const response = await fetch(
        `/api/today-meal-rate?userId=${this.userId}`
      );
      const data = await response.json();

      const element = document.querySelector(".today-meal-value");
      if (element) {
        element.textContent = `৳${data.rate || "0.00"}`;
      }

      const subtitleElement = document.querySelector(".today-meal-subtitle");
      if (subtitleElement) {
        subtitleElement.textContent = `${data.mealCount || 0} meals today`;
      }
    } catch (error) {
      console.error("Error loading today meal rate:", error);
      this.updateStatCard(".today-meal-value", "৳0.00");
    }
  }

  async loadTotalCost() {
    try {
      const response = await fetch(`/api/total-cost?userId=${this.userId}`);
      const data = await response.json();

      this.updateStatCard(".total-cost-value", `৳${data.totalCost || "0.00"}`);
      this.updateStatCard(
        ".total-cost-subtitle",
        `This month: ৳${data.monthlyTotal || "0.00"}`
      );

      // Update change indicator
      const changeElement = document.querySelector(".total-cost-change");
      if (changeElement && data.change) {
        changeElement.innerHTML = `
                    <i class="fas fa-${
                      data.change > 0 ? "arrow-up" : "arrow-down"
                    }"></i>
                    ${Math.abs(data.change)}% from last month
                `;
        changeElement.className = `stat-change ${
          data.change > 0 ? "positive" : "negative"
        }`;
      }
    } catch (error) {
      console.error("Error loading total cost:", error);
      this.updateStatCard(".total-cost-value", "৳0.00");
    }
  }

  async loadTotalDeposit() {
    try {
      const response = await fetch(`/api/total-deposit?userId=${this.userId}`);
      const data = await response.json();

      this.updateStatCard(".deposit-value", `৳${data.totalDeposit || "0.00"}`);
      this.updateStatCard(".deposit-subtitle", `Available balance`);

      // Update change indicator
      const changeElement = document.querySelector(".deposit-change");
      if (changeElement && data.lastDeposit) {
        changeElement.innerHTML = `
                    <i class="fas fa-plus"></i>
                    Last deposit: ৳${data.lastDeposit}
                `;
        changeElement.className = "stat-change positive";
      }
    } catch (error) {
      console.error("Error loading total deposit:", error);
      this.updateStatCard(".deposit-value", "৳0.00");
    }
  }

  async loadTotalMeals() {
    try {
      const response = await fetch(`/api/total-meals?userId=${this.userId}`);
      const data = await response.json();

      this.updateStatCard(".meal-count-value", data.totalMeals || "0");
      this.updateStatCard(
        ".meal-count-subtitle",
        `This month: ${data.monthlyMeals || 0} meals`
      );

      // Update change indicator
      const changeElement = document.querySelector(".meal-count-change");
      if (changeElement && data.avgPerDay) {
        changeElement.innerHTML = `
                    <i class="fas fa-chart-line"></i>
                    Avg: ${data.avgPerDay} meals/day
                `;
        changeElement.className = "stat-change positive";
      }
    } catch (error) {
      console.error("Error loading total meals:", error);
      this.updateStatCard(".meal-count-value", "0");
    }
  }

  updateStatCard(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
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

  updateStats() {
    if (!this.data.expenses || !this.data.deposits) return;
    
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
    
    if (previousMonthExpenses > 0) {
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
  }

  calculateMonthlyExpenses() {
    if (!this.data.expenses) return 0;
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return this.data.expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    }).reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);
  }

  calculatePreviousMonthExpenses() {
    if (!this.data.expenses) return 0;
    
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
    if (!activityContainer || !this.data.expenses || !this.data.deposits) return;

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
    if (!spendersContainer || !this.data.expenses) return;

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
    if (!this.charts.expense || !this.data.expenses) return;

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
    if (!this.data.expenses) return 0;
    
    return this.data.expenses.filter(expense => {
      const date = new Date(expense.date);
      const day = date.getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    }).reduce((sum, expense) => sum + parseFloat(expense.cost || 0), 0);
  }

  calculateWeekdayExpenses() {
    if (!this.data.expenses) return 0;
    
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

  setupEventListeners() {
    // Modern header dropdown functionality
    this.setupHeaderDropdown();

    // Logout functionality (both old and new selectors)
    const logoutBtns = document.querySelectorAll(
      ".logout-btn, .dropdown-item.logout-btn"
    );
    logoutBtns.forEach((btn) => {
      btn.addEventListener("click", this.logout.bind(this));
    });

    // Feature card navigation
    document.querySelectorAll(".feature-card").forEach((card) => {
      card.addEventListener("click", this.handleFeatureClick.bind(this));
    });

    // Quick action buttons
    document.querySelectorAll(".action-btn").forEach((btn) => {
      btn.addEventListener("click", this.handleQuickAction.bind(this));
    });

    // Enhanced dashboard event listeners
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

  setupHeaderDropdown() {
    const dropdown = document.querySelector(".dropdown");
    const dropdownMenu = document.querySelector(".dropdown-menu");

    if (dropdown && dropdownMenu) {
      // Handle click outside to close dropdown
      document.addEventListener("click", (event) => {
        if (!dropdown.contains(event.target)) {
          dropdownMenu.style.opacity = "0";
          dropdownMenu.style.visibility = "hidden";
          dropdownMenu.style.transform = "translateY(-10px)";
        }
      });

      // Handle dropdown item clicks
      const dropdownItems = document.querySelectorAll(
        ".dropdown-item:not(.logout-btn)"
      );
      dropdownItems.forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          const href = item.getAttribute("href");
          if (href) {
            window.location.href = href;
          }
        });
      });
    }

    // Enhanced dropdown functionality
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
      case "add-meal":
        this.showAddMealModal();
        break;
      case "add-deposit":
        this.showAddDepositModal();
        break;
      case "view-profile":
        window.location.href = "/profile";
        break;
      default:
        console.log("Action not implemented:", action);
    }
  }

  showAddMealModal() {
    // This would open a modal to add a meal entry
    alert("Add Meal functionality - Coming soon!");
  }

  showAddDepositModal() {
    // This would open a modal to add a deposit
    alert("Add Deposit functionality - Coming soon!");
  }

  logout() {
    // Clear any stored session data
    localStorage.removeItem("userToken");
    sessionStorage.clear();

    // Redirect to home page
    window.location.href = "/";
  }

  showError(message) {
    // Simple error notification
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-notification";
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
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  // Utility method to format date
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

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  if (document.querySelector(".modern-dashboard")) {
    window.mealMateDashboard = new MealMateDashboard();
  }

  // Initialize member management if on members page
  if (document.querySelector(".members-container")) {
    initializeMemberManagement();
  }

  // Enhanced dashboard initialization
  if (document.querySelector('.welcome-section')) {
    // Update navigation links with current user ID
    updateNavigationLinksWithUserId();
  }

  // Navigation functionality
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

// Export for potential use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = MealMateDashboard;
}

// ===== ENHANCED QUICK ACTION FUNCTIONS =====

// Quick action functions
function quickAddExpense() {
  const userId = getCurrentUserId();
  window.location.href = `bazar.html?userId=${userId}&action=add`;
}

function viewReports() {
  const userId = getCurrentUserId();
  window.location.href = `reports.html?userId=${userId}`;
}

function addBazarRecord() {
  const userId = getCurrentUserId();
  window.location.href = `bazar.html?userId=${userId}&action=add`;
}

function addDeposit() {
  const userId = getCurrentUserId();
  window.location.href = `deposit.html?userId=${userId}&action=add`;
}

function manageMembers() {
  const userId = getCurrentUserId();
  window.location.href = `members.html?userId=${userId}`;
}

function manageBudget() {
  alert('Budget management feature coming soon!');
}

function viewAllActivity() {
  const userId = getCurrentUserId();
  window.location.href = `reports.html?userId=${userId}&tab=activity`;
}

// Function to update navigation links with user ID
function updateNavigationLinksWithUserId() {
  const userId = getCurrentUserId();
  
  // List of pages that should include userId
  const pagesWithUserId = ['dashboard.html', 'profile.html', 'members.html', 'reports.html', 'bazar.html', 'deposit.html'];
  
  // Update all navigation links
  const navLinks = document.querySelectorAll('a[href]');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    
    // Check if it's one of our pages that needs userId
    pagesWithUserId.forEach(page => {
      if (href === page || href.includes(page)) {
        const url = new URL(link.href, window.location.origin);
        url.searchParams.set('userId', userId);
        link.href = url.toString();
      }
    });
  });
}

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

// ===== MEMBER MANAGEMENT FUNCTIONS =====

let currentMemberToRemove = null;
let membersData = [];

function initializeMemberManagement() {
  // Set today's date as default for join date
  const joinDateInput = document.getElementById("joinDate");
  if (joinDateInput) {
    joinDateInput.value = new Date().toISOString().split("T")[0];
  }

  // Setup form submission handlers
  setupAddMemberForm();
  setupRemoveMemberForm();

  // Setup Add Member button click handlers
  setupAddMemberButtons();

  // Load existing members from database
  loadMembersFromDatabase();
}

function setupAddMemberButtons() {
  // Find all add member buttons and add click handlers
  const addMemberButtons = document.querySelectorAll(".add-member-btn");
  addMemberButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      openAddMemberModal();
    });
  });

  // Setup modal close buttons
  const closeButtons = document.querySelectorAll(
    '[data-action="close-add-modal"]'
  );
  closeButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      closeAddMemberModal();
    });
  });

  const closeRemoveButtons = document.querySelectorAll(
    '[data-action="close-remove-modal"]'
  );
  closeRemoveButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      closeRemoveMemberModal();
    });
  });
}

async function loadMembersFromDatabase() {
  try {
    const response = await fetch("/api/members?userId=1");
    const data = await response.json();

    if (data.success) {
      membersData = data.members.map((member) => ({
        id: member.id.toString(),
        name: member.name,
        joinDate: member.join_date,
        avatar: generateAvatar(member.name),
      }));

      renderMembers();
    } else {
      console.error("Failed to load members:", data.message);
      renderMembers(); // Show empty state
    }
  } catch (error) {
    console.error("Error loading members:", error);
    renderMembers(); // Show empty state
  }
}

function setupAddMemberForm() {
  const form = document.getElementById("addMemberForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Clear previous errors
    clearFormErrors();

    // Get form data
    const formData = {
      name: document.getElementById("memberName").value.trim(),
      joinDate: document.getElementById("joinDate").value,
      password: document.getElementById("adminPassword").value,
    };

    // Validate form
    if (!validateAddMemberForm(formData)) {
      return;
    }

    // Simulate password verification (in real app, verify with backend)
    if (!verifyAdminPassword(formData.password)) {
      showFormError("password-error", "Incorrect password. Please try again.");
      return;
    }

    // Add member
    await addNewMember(formData);
  });
}

function setupRemoveMemberForm() {
  const form = document.getElementById("removeMemberForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Clear previous errors
    clearFormErrors();

    const password = document.getElementById("confirmPassword").value;

    // Verify password
    if (!verifyAdminPassword(password)) {
      showFormError(
        "confirm-password-error",
        "Incorrect password. Please try again."
      );
      return;
    }

    // Remove member
    await removeMemberById(currentMemberToRemove);
  });
}

function validateAddMemberForm(data) {
  let isValid = true;

  if (!data.name) {
    showFormError("name-error", "Please enter the member name");
    isValid = false;
  }

  if (!data.password) {
    showFormError(
      "password-error",
      "Please enter your password for confirmation"
    );
    isValid = false;
  }

  return isValid;
}

function verifyAdminPassword(password) {
  // In a real application, this would verify against the server
  // For demo purposes, we'll accept any non-empty password
  return password.length > 0;
}

async function addNewMember(data) {
  try {
    // Show loading state
    const submitBtn = document.querySelector(".submit-btn");
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Adding Member...';
    submitBtn.disabled = true;

    // Send data to backend
    const response = await fetch("/api/members?userId=1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        joinDate: data.joinDate,
        adminPassword: data.password,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Reload members from database
      await loadMembersFromDatabase();

      // Close modal and reset form
      closeAddMemberModal();
      document.getElementById("addMemberForm").reset();

      // Set join date to today for next use
      document.getElementById("joinDate").value = new Date()
        .toISOString()
        .split("T")[0];

      // Show success message
      showSuccessMessage(`${data.name} has been added successfully!`);
    } else {
      showFormError("password-error", result.message);
    }

    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  } catch (error) {
    console.error("Error adding member:", error);
    showFormError("password-error", "Failed to add member. Please try again.");

    // Reset button
    const submitBtn = document.querySelector(".submit-btn");
    submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Add Member';
    submitBtn.disabled = false;
  }
}

async function removeMemberById(memberId) {
  try {
    // Show loading state
    const deleteBtn = document.querySelector(".delete-btn");
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';
    deleteBtn.disabled = true;

    // Find member name for success message
    const member = membersData.find((m) => m.id === memberId);
    const memberName = member ? member.name : "Member";

    // Get password from form
    const password = document.getElementById("confirmPassword").value;

    // Send delete request to backend
    const response = await fetch(`/api/members/${memberId}?userId=1`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminPassword: password,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Reload members from database
      await loadMembersFromDatabase();

      // Close modal
      closeRemoveMemberModal();

      // Show success message
      showSuccessMessage(result.message);
    } else {
      showFormError("confirm-password-error", result.message);
    }

    // Reset button
    deleteBtn.innerHTML = originalText;
    deleteBtn.disabled = false;
  } catch (error) {
    console.error("Error removing member:", error);
    showFormError(
      "confirm-password-error",
      "Failed to remove member. Please try again."
    );

    // Reset button
    const deleteBtn = document.querySelector(".delete-btn");
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Remove Member';
    deleteBtn.disabled = false;
  }
}

function renderMembers() {
  const membersGrid = document.getElementById("membersGrid");
  const emptyState = document.getElementById("emptyState");

  if (!membersGrid || !emptyState) return;

  if (membersData.length === 0) {
    membersGrid.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  membersGrid.style.display = "grid";
  emptyState.style.display = "none";

  membersGrid.innerHTML = membersData
    .map(
      (member) => `
        <div class="member-card">
            <div class="member-avatar">
                <span class="avatar-letter">${member.avatar}</span>
            </div>
            <div class="member-info">
                <h3 class="member-name">${member.name}</h3>
                <p class="member-joined">Joined: ${formatDisplayDate(
                  member.joinDate
                )}</p>
            </div>
            <div class="member-actions">
                <button class="action-btn edit" onclick="editMember('${
                  member.id
                }')" title="Edit Member">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="removeMember('${
                  member.id
                }')" title="Remove Member">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

// Modal Functions
function openAddMemberModal() {
  console.log("Opening add member modal..."); // Debug log
  const modal = document.getElementById("addMemberModal");
  if (modal) {
    modal.classList.add("active");
    // Focus on first input
    setTimeout(() => {
      document.getElementById("memberName")?.focus();
    }, 100);
  }
}

function closeAddMemberModal() {
  const modal = document.getElementById("addMemberModal");
  if (modal) {
    modal.classList.remove("active");
    clearFormErrors();
  }
}

function removeMember(memberId) {
  const member = membersData.find((m) => m.id === memberId);
  if (!member) return;

  currentMemberToRemove = memberId;

  // Update modal with member name
  const memberToRemoveElement = document.getElementById("memberToRemove");
  if (memberToRemoveElement) {
    memberToRemoveElement.textContent = member.name;
  }

  // Open remove modal
  const modal = document.getElementById("removeMemberModal");
  if (modal) {
    modal.classList.add("active");
    // Focus on password input
    setTimeout(() => {
      document.getElementById("confirmPassword")?.focus();
    }, 100);
  }
}

function closeRemoveMemberModal() {
  const modal = document.getElementById("removeMemberModal");
  if (modal) {
    modal.classList.remove("active");
    document.getElementById("confirmPassword").value = "";
    clearFormErrors();
  }
  currentMemberToRemove = null;
}

function editMember(memberId) {
  // For now, just show an alert. In a real app, this would open an edit modal
  const member = membersData.find((m) => m.id === memberId);
  if (member) {
    alert(`Edit functionality for ${member.name} will be implemented soon!`);
  }
}

// Utility Functions
function generateMemberId(name) {
  return name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
}

function generateAvatar(name) {
  const words = name.trim().split(" ");
  if (words.length >= 2) {
    return words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase();
  }
  return name.charAt(0).toUpperCase() + (name.charAt(1) || "").toUpperCase();
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDisplayDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function showFormError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add("show");
  }
}

function clearFormErrors() {
  const errorElements = document.querySelectorAll(".error-message");
  errorElements.forEach((element) => {
    element.textContent = "";
    element.classList.remove("show");
  });
}

function showSuccessMessage(message) {
  // Create a temporary success notification
  const notification = document.createElement("div");
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        z-index: 1001;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
    `;

  notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
    `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Add CSS animations for notifications
if (!document.querySelector("#member-notification-styles")) {
  const style = document.createElement("style");
  style.id = "member-notification-styles";
  style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
  document.head.appendChild(style);
}

// Close modals when clicking outside
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("modal-overlay")) {
    if (e.target.id === "addMemberModal") {
      closeAddMemberModal();
    } else if (e.target.id === "removeMemberModal") {
      closeRemoveMemberModal();
    }
  }
});

//  Ensure username is updated from database

document.addEventListener("DOMContentLoaded", function () {
  // Function to update username from localStorage or URL
  function updateUserName() {
    const urlParams = new URLSearchParams(window.location.search);
    let userName = "User"; // Default fallback

    // Try to get user data from localStorage first
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        userName = user.firstName || "User";
      } catch (e) {
        console.warn("Error parsing current user from localStorage:", e);
      }
    }

    // Update all user name elements
    const userNameElements = document.querySelectorAll(
      ".user-name, .user-name-dynamic"
    );
    userNameElements.forEach((element) => {
      if (element) {
        element.textContent = userName;
      }
    });

    // Update avatar letter
    const avatarLetterElement = document.querySelector(".avatar-letter");
    if (avatarLetterElement && userName !== "User") {
      avatarLetterElement.textContent = userName.charAt(0).toUpperCase();
    }
  }

  // Update immediately
  updateUserName();

  // Also update after a short delay to ensure all scripts have loaded
  setTimeout(updateUserName, 100);
});
