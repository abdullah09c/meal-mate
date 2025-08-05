// Reports & Analytics JavaScript

let reportData = {
    expenses: [],
    deposits: [],
    members: [],
    currentPeriod: 'month'
};

let charts = {
    expenseChart: null,
    memberChart: null
};

// Initialize reports page
document.addEventListener('DOMContentLoaded', function() {
    initializeReports();
});

function initializeReports() {
    // Set default date range
    setDefaultDateRange();
    
    // Load initial data
    loadReportData();
    
    // Update last updated time
    updateLastUpdatedTime();
    
    // Initialize charts after a short delay
    setTimeout(() => {
        initializeCharts();
    }, 100);
}

function setDefaultDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
}

function updateLastUpdatedTime() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        lastUpdatedElement.textContent = timeString;
    }
}

async function loadReportData() {
    try {
        showLoadingState();
        
        // Load expenses (bazar data)
        const expenseResponse = await fetch('/api/bazar');
        if (expenseResponse.ok) {
            reportData.expenses = await expenseResponse.json();
        }
        
        // Load deposits
        const depositResponse = await fetch('/api/deposits');
        if (depositResponse.ok) {
            reportData.deposits = await depositResponse.json();
        }
        
        // Load members
        const memberResponse = await fetch('/api/members');
        if (memberResponse.ok) {
            reportData.members = await memberResponse.json();
            populateMemberFilter();
        }
        
        // Update all displays
        updateOverviewCards();
        updateChartsData();
        updateReportsTable();
        updateInsights();
        
        hideLoadingState();
        showToast('Report data loaded successfully', 'success');
        
    } catch (error) {
        console.error('Error loading report data:', error);
        showToast('Error loading report data', 'error');
        hideLoadingState();
    }
}

function showLoadingState() {
    // Show loading indicators
    const loadingRows = document.querySelectorAll('.loading-row');
    loadingRows.forEach(row => {
        if (row) row.style.display = 'table-row';
    });
}

function hideLoadingState() {
    // Hide loading indicators
    const loadingRows = document.querySelectorAll('.loading-row');
    loadingRows.forEach(row => {
        if (row) row.style.display = 'none';
    });
}

function populateMemberFilter() {
    const memberFilter = document.getElementById('memberFilter');
    if (!memberFilter) return;
    
    memberFilter.innerHTML = '<option value="">All Members</option>';
    
    reportData.members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.full_name || member.name;
        memberFilter.appendChild(option);
    });
}

function updateOverviewCards() {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    
    // Filter data by date range
    const filteredExpenses = reportData.expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
    });
    
    const filteredDeposits = reportData.deposits.filter(deposit => {
        const depositDate = new Date(deposit.date);
        return depositDate >= startDate && depositDate <= endDate;
    });
    
    // Calculate totals
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.total_cost || 0), 0);
    const totalDeposits = filteredDeposits.reduce((sum, dep) => sum + parseFloat(dep.amount || 0), 0);
    const currentBalance = totalDeposits - totalExpenses;
    
    // Calculate daily average
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
    const avgDaily = totalExpenses / daysDiff;
    
    // Update DOM elements
    document.getElementById('totalExpenses').textContent = `৳${totalExpenses.toFixed(2)}`;
    document.getElementById('totalDeposits').textContent = `৳${totalDeposits.toFixed(2)}`;
    document.getElementById('currentBalance').textContent = `৳${currentBalance.toFixed(2)}`;
    document.getElementById('avgDaily').textContent = `৳${avgDaily.toFixed(2)}`;
    
    // Update balance status
    const balanceStatus = document.getElementById('balanceStatus');
    if (currentBalance > 1000) {
        balanceStatus.textContent = 'Healthy';
        balanceStatus.className = 'overview-change positive';
    } else if (currentBalance > 0) {
        balanceStatus.textContent = 'Moderate';
        balanceStatus.className = 'overview-change neutral';
    } else {
        balanceStatus.textContent = 'Low';
        balanceStatus.className = 'overview-change negative';
    }
}

function initializeCharts() {
    initializeExpenseChart();
    initializeMemberChart();
}

function initializeExpenseChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    
    // Prepare data for the last 30 days
    const last30Days = [];
    const expenseData = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last30Days.push(date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }));
        
        // Calculate expenses for this date
        const dayExpenses = reportData.expenses
            .filter(exp => new Date(exp.date).toDateString() === date.toDateString())
            .reduce((sum, exp) => sum + parseFloat(exp.total_cost || 0), 0);
        
        expenseData.push(dayExpenses);
    }
    
    charts.expenseChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last30Days,
            datasets: [{
                label: 'Daily Expenses (৳)',
                data: expenseData,
                borderColor: '#059669',
                backgroundColor: 'rgba(5, 150, 105, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '৳' + value;
                        }
                    }
                }
            }
        }
    });
}

function initializeMemberChart() {
    const ctx = document.getElementById('memberChart');
    if (!ctx) return;
    
    // Calculate member-wise expenses
    const memberExpenses = {};
    const memberNames = {};
    
    reportData.members.forEach(member => {
        memberNames[member.id] = member.full_name || member.name;
        memberExpenses[member.id] = 0;
    });
    
    reportData.expenses.forEach(expense => {
        if (memberExpenses.hasOwnProperty(expense.member_id)) {
            memberExpenses[expense.member_id] += parseFloat(expense.total_cost || 0);
        }
    });
    
    const labels = Object.keys(memberExpenses).map(id => memberNames[id] || 'Unknown');
    const data = Object.values(memberExpenses);
    const colors = [
        '#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
        '#10b981', '#6366f1', '#f97316', '#ec4899', '#84cc16'
    ];
    
    charts.memberChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateChartsData() {
    if (charts.expenseChart) {
        charts.expenseChart.destroy();
    }
    if (charts.memberChart) {
        charts.memberChart.destroy();
    }
    
    setTimeout(() => {
        initializeCharts();
    }, 100);
}

function updateReportsTable() {
    const tbody = document.getElementById('reportsTableBody');
    if (!tbody) return;
    
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    
    // Combine expenses and deposits
    const allTransactions = [];
    
    // Add expenses
    reportData.expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= startDate && expDate <= endDate;
        })
        .forEach(exp => {
            allTransactions.push({
                date: exp.date,
                type: 'Expense',
                member: exp.member_name,
                amount: -parseFloat(exp.total_cost),
                description: exp.description || 'Grocery Shopping',
                impact: 'Debit'
            });
        });
    
    // Add deposits
    reportData.deposits
        .filter(dep => {
            const depDate = new Date(dep.date);
            return depDate >= startDate && depDate <= endDate;
        })
        .forEach(dep => {
            allTransactions.push({
                date: dep.date,
                type: 'Deposit',
                member: dep.member_name || 'System',
                amount: parseFloat(dep.amount),
                description: dep.description || 'Account Deposit',
                impact: 'Credit'
            });
        });
    
    // Sort by date (newest first)
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Generate table rows
    tbody.innerHTML = allTransactions.slice(0, 50).map(transaction => `
        <tr>
            <td>${formatDate(transaction.date)}</td>
            <td>
                <span class="transaction-type ${transaction.type.toLowerCase()}">
                    <i class="fas ${transaction.type === 'Expense' ? 'fa-shopping-cart' : 'fa-piggy-bank'}"></i>
                    ${transaction.type}
                </span>
            </td>
            <td>${transaction.member}</td>
            <td class="${transaction.amount >= 0 ? 'positive' : 'negative'}">
                ৳${Math.abs(transaction.amount).toFixed(2)}
            </td>
            <td>${transaction.description}</td>
            <td>
                <span class="balance-impact ${transaction.impact.toLowerCase()}">
                    ${transaction.impact}
                </span>
            </td>
        </tr>
    `).join('');
    
    if (allTransactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: #6b7280;">
                    No transactions found for the selected period
                </td>
            </tr>
        `;
    }
}

function updateInsights() {
    updateTopCategories();
    updateMonthlyComparison();
    updateFinancialInsights();
}

function updateTopCategories() {
    const container = document.getElementById('topCategories');
    if (!container) return;
    
    // For now, we'll show top spending members
    const memberSpending = {};
    
    reportData.expenses.forEach(expense => {
        const memberName = expense.member_name;
        if (!memberSpending[memberName]) {
            memberSpending[memberName] = 0;
        }
        memberSpending[memberName] += parseFloat(expense.total_cost || 0);
    });
    
    const sortedMembers = Object.entries(memberSpending)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    container.innerHTML = sortedMembers.map(([member, amount]) => `
        <div class="insight-item">
            <div class="insight-label">${member}</div>
            <div class="insight-value">৳${amount.toFixed(2)}</div>
        </div>
    `).join('');
}

function updateMonthlyComparison() {
    const container = document.getElementById('monthlyComparison');
    if (!container) return;
    
    const currentMonth = new Date().getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = new Date().getFullYear();
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthExpenses = reportData.expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        })
        .reduce((sum, exp) => sum + parseFloat(exp.total_cost || 0), 0);
    
    const lastMonthExpenses = reportData.expenses
        .filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear;
        })
        .reduce((sum, exp) => sum + parseFloat(exp.total_cost || 0), 0);
    
    const change = lastMonthExpenses > 0 ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;
    
    container.innerHTML = `
        <div class="comparison-item">
            <div class="comparison-label">This Month</div>
            <div class="comparison-value">৳${currentMonthExpenses.toFixed(2)}</div>
        </div>
        <div class="comparison-item">
            <div class="comparison-label">Last Month</div>
            <div class="comparison-value">৳${lastMonthExpenses.toFixed(2)}</div>
        </div>
        <div class="comparison-change ${change >= 0 ? 'positive' : 'negative'}">
            <i class="fas ${change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
            ${Math.abs(change).toFixed(1)}% ${change >= 0 ? 'increase' : 'decrease'}
        </div>
    `;
}

function updateFinancialInsights() {
    const container = document.getElementById('financialInsights');
    if (!container) return;
    
    const totalExpenses = reportData.expenses.reduce((sum, exp) => sum + parseFloat(exp.total_cost || 0), 0);
    const totalDeposits = reportData.deposits.reduce((sum, dep) => sum + parseFloat(dep.amount || 0), 0);
    const balance = totalDeposits - totalExpenses;
    
    let insights = [];
    
    if (balance > 2000) {
        insights.push("✅ Healthy financial balance maintained");
    } else if (balance > 0) {
        insights.push("⚠️ Consider increasing deposits for better balance");
    } else {
        insights.push("🚨 Urgent: Balance is negative, deposits needed");
    }
    
    const avgExpensePerDay = totalExpenses / 30;
    if (avgExpensePerDay > 200) {
        insights.push("📊 High daily spending detected");
    } else if (avgExpensePerDay < 100) {
        insights.push("💡 Efficient spending pattern observed");
    }
    
    container.innerHTML = insights.map(insight => `
        <div class="insight-tip">${insight}</div>
    `).join('');
}

// Event handlers
function setReportPeriod(period) {
    reportData.currentPeriod = period;
    
    // Update active state
    document.querySelectorAll('.filter-preset').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Set date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch(period) {
        case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
        case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
    }
    
    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    
    // Refresh data
    updateOverviewCards();
    updateChartsData();
    updateReportsTable();
    updateInsights();
}

function changeChartType(type) {
    // Update active state
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Recreate chart with new type
    if (charts.expenseChart) {
        charts.expenseChart.destroy();
        
        const ctx = document.getElementById('expenseChart');
        const currentData = charts.expenseChart ? charts.expenseChart.data : null;
        
        // Use stored data or regenerate
        setTimeout(() => {
            initializeExpenseChart();
        }, 100);
    }
}

function generateReport() {
    showToast('Generating comprehensive report...', 'info');
    loadReportData();
}

function refreshReports() {
    showToast('Refreshing report data...', 'info');
    loadReportData();
}

function exportReport() {
    showToast('Exporting report data...', 'info');
    
    // Create CSV content
    const headers = ['Date', 'Type', 'Member', 'Amount', 'Description', 'Balance Impact'];
    let csvContent = headers.join(',') + '\n';
    
    // Add expense data
    reportData.expenses.forEach(expense => {
        const row = [
            expense.date,
            'Expense',
            `"${expense.member_name}"`,
            expense.total_cost,
            `"${expense.description || 'Grocery Shopping'}"`,
            'Debit'
        ];
        csvContent += row.join(',') + '\n';
    });
    
    // Add deposit data
    reportData.deposits.forEach(deposit => {
        const row = [
            deposit.date,
            'Deposit',
            `"${deposit.member_name || 'System'}"`,
            deposit.amount,
            `"${deposit.description || 'Account Deposit'}"`,
            'Credit'
        ];
        csvContent += row.join(',') + '\n';
    });
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('Report exported successfully', 'success');
}

function exportTableData() {
    exportReport();
}

function printReport() {
    window.print();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast?.querySelector('.toast-icon i');
    
    if (!toast || !toastMessage) return;
    
    // Set message
    toastMessage.textContent = message;
    
    // Set icon based on type
    if (toastIcon) {
        toastIcon.className = '';
        switch (type) {
            case 'success':
                toastIcon.className = 'fas fa-check-circle';
                break;
            case 'error':
                toastIcon.className = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                toastIcon.className = 'fas fa-exclamation-triangle';
                break;
            default:
                toastIcon.className = 'fas fa-info-circle';
        }
    }
    
    // Set CSS classes
    toast.className = `toast-notification ${type} show`;
    
    // Auto hide after 4 seconds
    setTimeout(() => {
        hideToast();
    }, 4000);
}

function hideToast() {
    const toast = document.getElementById('toastNotification');
    if (toast) {
        toast.classList.remove('show');
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key to hide toast
    if (e.key === 'Escape') {
        hideToast();
    }
    
    // Ctrl+R to refresh
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refreshReports();
    }
    
    // Ctrl+E to export
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportReport();
    }
});
