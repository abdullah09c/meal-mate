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
        // First try to get userId from URL
        this.userId = urlParams.get('userId') || 1;
        
        // Try to get user data from localStorage
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const user = JSON.parse(currentUser);
                this.userId = user.id || this.userId;
                this.userName = user.fullName || user.username || 'User';
            } catch (e) {
                console.warn('Error parsing current user from localStorage:', e);
                this.userName = urlParams.get('user') || 'User';
            }
        } else {
            this.userName = urlParams.get('user') || 'User';
        }
        
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

        // Update dynamic user name in welcome section
        const userNameDynamicElement = document.querySelector('.user-name-dynamic');
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
        // Clear any stored session data
        localStorage.removeItem('userToken');
        sessionStorage.clear();
        
        // Redirect to home page
        window.location.href = '/';
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
        window.mealMateDashboard = new MealMateDashboard();
    }
    
    // Initialize member management if on members page
    if (document.querySelector('.members-container')) {
        initializeMemberManagement();
    }
});

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MealMateDashboard;
}

// ===== MEMBER MANAGEMENT FUNCTIONS =====

let currentMemberToRemove = null;
let membersData = [];

function initializeMemberManagement() {
    // Set today's date as default for join date
    const joinDateInput = document.getElementById('joinDate');
    if (joinDateInput) {
        joinDateInput.value = new Date().toISOString().split('T')[0];
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
    const addMemberButtons = document.querySelectorAll('.add-member-btn');
    addMemberButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            openAddMemberModal();
        });
    });
    
    // Setup modal close buttons
    const closeButtons = document.querySelectorAll('[data-action="close-add-modal"]');
    closeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            closeAddMemberModal();
        });
    });
    
    const closeRemoveButtons = document.querySelectorAll('[data-action="close-remove-modal"]');
    closeRemoveButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            closeRemoveMemberModal();
        });
    });
}

async function loadMembersFromDatabase() {
    try {
        const response = await fetch('/api/members?userId=1');
        const data = await response.json();
        
        if (data.success) {
            membersData = data.members.map(member => ({
                id: member.id.toString(),
                name: member.name,
                joinDate: member.join_date,
                avatar: generateAvatar(member.name)
            }));
            
            renderMembers();
        } else {
            console.error('Failed to load members:', data.message);
            renderMembers(); // Show empty state
        }
    } catch (error) {
        console.error('Error loading members:', error);
        renderMembers(); // Show empty state
    }
}

function setupAddMemberForm() {
    const form = document.getElementById('addMemberForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous errors
        clearFormErrors();
        
        // Get form data
        const formData = {
            name: document.getElementById('memberName').value.trim(),
            joinDate: document.getElementById('joinDate').value,
            password: document.getElementById('adminPassword').value
        };
        
        // Validate form
        if (!validateAddMemberForm(formData)) {
            return;
        }
        
        // Simulate password verification (in real app, verify with backend)
        if (!verifyAdminPassword(formData.password)) {
            showFormError('password-error', 'Incorrect password. Please try again.');
            return;
        }
        
        // Add member
        await addNewMember(formData);
    });
}

function setupRemoveMemberForm() {
    const form = document.getElementById('removeMemberForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous errors
        clearFormErrors();
        
        const password = document.getElementById('confirmPassword').value;
        
        // Verify password
        if (!verifyAdminPassword(password)) {
            showFormError('confirm-password-error', 'Incorrect password. Please try again.');
            return;
        }
        
        // Remove member
        await removeMemberById(currentMemberToRemove);
    });
}

function validateAddMemberForm(data) {
    let isValid = true;
    
    if (!data.name) {
        showFormError('name-error', 'Please enter the member name');
        isValid = false;
    }
    
    if (!data.password) {
        showFormError('password-error', 'Please enter your password for confirmation');
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
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Member...';
        submitBtn.disabled = true;
        
        // Send data to backend
        const response = await fetch('/api/members?userId=1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: data.name,
                joinDate: data.joinDate,
                adminPassword: data.password
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Reload members from database
            await loadMembersFromDatabase();
            
            // Close modal and reset form
            closeAddMemberModal();
            document.getElementById('addMemberForm').reset();
            
            // Set join date to today for next use
            document.getElementById('joinDate').value = new Date().toISOString().split('T')[0];
            
            // Show success message
            showSuccessMessage(`${data.name} has been added successfully!`);
        } else {
            showFormError('password-error', result.message);
        }
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Error adding member:', error);
        showFormError('password-error', 'Failed to add member. Please try again.');
        
        // Reset button
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Add Member';
        submitBtn.disabled = false;
    }
}

async function removeMemberById(memberId) {
    try {
        // Show loading state
        const deleteBtn = document.querySelector('.delete-btn');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';
        deleteBtn.disabled = true;
        
        // Find member name for success message
        const member = membersData.find(m => m.id === memberId);
        const memberName = member ? member.name : 'Member';
        
        // Get password from form
        const password = document.getElementById('confirmPassword').value;
        
        // Send delete request to backend
        const response = await fetch(`/api/members/${memberId}?userId=1`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                adminPassword: password
            })
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
            showFormError('confirm-password-error', result.message);
        }
        
        // Reset button
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
        
    } catch (error) {
        console.error('Error removing member:', error);
        showFormError('confirm-password-error', 'Failed to remove member. Please try again.');
        
        // Reset button
        const deleteBtn = document.querySelector('.delete-btn');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Remove Member';
        deleteBtn.disabled = false;
    }
}

function renderMembers() {
    const membersGrid = document.getElementById('membersGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!membersGrid || !emptyState) return;
    
    if (membersData.length === 0) {
        membersGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    membersGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    membersGrid.innerHTML = membersData.map(member => `
        <div class="member-card">
            <div class="member-avatar">
                <span class="avatar-letter">${member.avatar}</span>
            </div>
            <div class="member-info">
                <h3 class="member-name">${member.name}</h3>
                <p class="member-joined">Joined: ${formatDisplayDate(member.joinDate)}</p>
            </div>
            <div class="member-actions">
                <button class="action-btn edit" onclick="editMember('${member.id}')" title="Edit Member">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" onclick="removeMember('${member.id}')" title="Remove Member">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Modal Functions
function openAddMemberModal() {
    console.log('Opening add member modal...'); // Debug log
    const modal = document.getElementById('addMemberModal');
    if (modal) {
        modal.classList.add('active');
        // Focus on first input
        setTimeout(() => {
            document.getElementById('memberName')?.focus();
        }, 100);
    }
}

function closeAddMemberModal() {
    const modal = document.getElementById('addMemberModal');
    if (modal) {
        modal.classList.remove('active');
        clearFormErrors();
    }
}

function removeMember(memberId) {
    const member = membersData.find(m => m.id === memberId);
    if (!member) return;
    
    currentMemberToRemove = memberId;
    
    // Update modal with member name
    const memberToRemoveElement = document.getElementById('memberToRemove');
    if (memberToRemoveElement) {
        memberToRemoveElement.textContent = member.name;
    }
    
    // Open remove modal
    const modal = document.getElementById('removeMemberModal');
    if (modal) {
        modal.classList.add('active');
        // Focus on password input
        setTimeout(() => {
            document.getElementById('confirmPassword')?.focus();
        }, 100);
    }
}

function closeRemoveMemberModal() {
    const modal = document.getElementById('removeMemberModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('confirmPassword').value = '';
        clearFormErrors();
    }
    currentMemberToRemove = null;
}

function editMember(memberId) {
    // For now, just show an alert. In a real app, this would open an edit modal
    const member = membersData.find(m => m.id === memberId);
    if (member) {
        alert(`Edit functionality for ${member.name} will be implemented soon!`);
    }
}

// Utility Functions
function generateMemberId(name) {
    return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
}

function generateAvatar(name) {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
        return words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase();
    }
    return name.charAt(0).toUpperCase() + (name.charAt(1) || '').toUpperCase();
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showFormError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function clearFormErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.textContent = '';
        element.classList.remove('show');
    });
}

function showSuccessMessage(message) {
    // Create a temporary success notification
    const notification = document.createElement('div');
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
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications
if (!document.querySelector('#member-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'member-notification-styles';
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
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'addMemberModal') {
            closeAddMemberModal();
        } else if (e.target.id === 'removeMemberModal') {
            closeRemoveMemberModal();
        }
    }
});
