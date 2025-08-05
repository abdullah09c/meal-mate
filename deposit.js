// Deposit management functionality
let currentUserId = null;
let deposits = [];
let members = [];

// Initialize deposit page
document.addEventListener('DOMContentLoaded', function() {
    initializeDepositPage();
});

async function initializeDepositPage() {
    try {
        currentUserId = getCurrentUserId();
        if (!currentUserId) {
            window.location.href = 'login.html';
            return;
        }

        // Update navigation links with current user ID
        updateNavigationLinks(currentUserId);
        
        // Load user profile info for header
        await loadUserProfile();
        
        // Load members for dropdown
        await loadMembers();
        
        // Load deposits
        await loadDeposits();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('depositDate').value = today;
        
        // Initialize event listeners
        initializeEventListeners();
        
    } catch (error) {
        console.error('Error initializing deposit page:', error);
        showNotification('Error loading deposit page', 'error');
    }
}

function initializeEventListeners() {
    // Form submission
    const form = document.getElementById('addDepositForm');
    if (form) {
        form.addEventListener('submit', handleAddDeposit);
    }
    
    // Time filter
    const timeFilter = document.getElementById('timeFilter');
    if (timeFilter) {
        timeFilter.addEventListener('change', filterDeposits);
    }
    
    // Modal close on overlay click
    const modal = document.getElementById('addDepositModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeAddDepositModal();
            }
        });
    }
}

async function loadUserProfile() {
    try {
        const response = await fetch(`/api/users/${currentUserId}`);
        if (response.ok) {
            const user = await response.json();
            updateUserDisplay(user);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

function updateUserDisplay(user) {
    // Update avatar letter
    const avatarLetter = document.querySelector('.avatar-letter');
    if (avatarLetter) {
        avatarLetter.textContent = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';
    }
    
    // Update user name
    const userName = document.querySelector('.user-name');
    if (userName) {
        userName.textContent = user.full_name || 'User';
    }
    
    // Update profile link
    const profileLinks = document.querySelectorAll('a[href*="profile.html"]');
    profileLinks.forEach(link => {
        link.href = `profile.html?userId=${currentUserId}`;
    });
}

async function loadMembers() {
    try {
        const response = await fetch('/api/members');
        if (response.ok) {
            members = await response.json();
            populateMemberDropdown();
        }
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

function populateMemberDropdown() {
    const select = document.getElementById('depositMember');
    if (!select) return;
    
    // Clear existing options except the first one
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Add member options
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        select.appendChild(option);
    });
}

async function loadDeposits() {
    try {
        const response = await fetch('/api/deposits');
        if (response.ok) {
            deposits = await response.json();
            displayDeposits(deposits);
            updateDepositSummary(deposits);
        } else {
            throw new Error('Failed to load deposits');
        }
    } catch (error) {
        console.error('Error loading deposits:', error);
        showEmptyState();
    }
}

function displayDeposits(depositsToShow) {
    const tbody = document.getElementById('depositsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    if (!depositsToShow || depositsToShow.length === 0) {
        showEmptyState();
        return;
    }
    
    emptyState.style.display = 'none';
    tbody.innerHTML = '';
    
    depositsToShow.forEach(deposit => {
        const row = createDepositRow(deposit);
        tbody.appendChild(row);
    });
}

function createDepositRow(deposit) {
    const row = document.createElement('tr');
    row.className = 'deposit-row';
    
    const formattedDate = new Date(deposit.date).toLocaleDateString('en-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    const memberName = members.find(m => m.id === deposit.member_id)?.name || 'N/A';
    
    row.innerHTML = `
        <td>
            <div class="date-cell">
                <i class="fas fa-calendar"></i>
                ${formattedDate}
            </div>
        </td>
        <td>
            <div class="amount-cell">
                <span class="amount">৳${parseFloat(deposit.amount).toFixed(2)}</span>
            </div>
        </td>
        <td>
            <div class="description-cell">
                ${deposit.description || 'No description'}
            </div>
        </td>
        <td>
            <div class="member-cell">
                <i class="fas fa-user"></i>
                ${memberName}
            </div>
        </td>
        <td>
            <div class="actions-cell">
                <button class="action-btn edit-btn" onclick="editDeposit(${deposit.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteDeposit(${deposit.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

function updateDepositSummary(deposits) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calculate totals
    const totalBalance = deposits.reduce((sum, deposit) => sum + parseFloat(deposit.amount), 0);
    
    const monthlyDeposits = deposits.filter(deposit => {
        const depositDate = new Date(deposit.date);
        return depositDate.getMonth() === currentMonth && depositDate.getFullYear() === currentYear;
    }).reduce((sum, deposit) => sum + parseFloat(deposit.amount), 0);
    
    const lastDeposit = deposits.length > 0 ? 
        Math.max(...deposits.map(d => parseFloat(d.amount))) : 0;
    
    const avgMonthly = deposits.length > 0 ? totalBalance / 12 : 0; // Simplified calculation
    
    // Update UI
    document.querySelector('.total-balance').textContent = `৳${totalBalance.toFixed(2)}`;
    document.querySelector('.monthly-deposits').textContent = `৳${monthlyDeposits.toFixed(2)}`;
    document.querySelector('.last-deposit').textContent = `৳${lastDeposit.toFixed(2)}`;
    document.querySelector('.avg-monthly').textContent = `৳${avgMonthly.toFixed(2)}`;
}

function showEmptyState() {
    const tbody = document.getElementById('depositsTableBody');
    const emptyState = document.getElementById('emptyState');
    
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    
    // Reset summary
    document.querySelector('.total-balance').textContent = '৳0';
    document.querySelector('.monthly-deposits').textContent = '৳0';
    document.querySelector('.last-deposit').textContent = '৳0';
    document.querySelector('.avg-monthly').textContent = '৳0';
}

function filterDeposits() {
    const filter = document.getElementById('timeFilter').value;
    const now = new Date();
    
    let filteredDeposits = [...deposits];
    
    switch (filter) {
        case 'this-month':
            filteredDeposits = deposits.filter(deposit => {
                const depositDate = new Date(deposit.date);
                return depositDate.getMonth() === now.getMonth() && 
                       depositDate.getFullYear() === now.getFullYear();
            });
            break;
        case 'last-month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            filteredDeposits = deposits.filter(deposit => {
                const depositDate = new Date(deposit.date);
                return depositDate.getMonth() === lastMonth.getMonth() && 
                       depositDate.getFullYear() === lastMonth.getFullYear();
            });
            break;
        case 'last-3-months':
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            filteredDeposits = deposits.filter(deposit => {
                const depositDate = new Date(deposit.date);
                return depositDate >= threeMonthsAgo;
            });
            break;
        default:
            // 'all' - show all deposits
            break;
    }
    
    displayDeposits(filteredDeposits);
}

// Modal functions
function openAddDepositModal() {
    const modal = document.getElementById('addDepositModal');
    modal.style.display = 'flex';
    
    // Reset form
    document.getElementById('addDepositForm').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('depositDate').value = today;
    
    // Clear any error messages
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => el.textContent = '');
}

function closeAddDepositModal() {
    const modal = document.getElementById('addDepositModal');
    modal.style.display = 'none';
}

async function handleAddDeposit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const depositData = {
        amount: parseFloat(formData.get('depositAmount')),
        date: formData.get('depositDate'),
        description: formData.get('depositDescription') || null,
        member_id: formData.get('depositMember') || null,
        user_id: currentUserId
    };
    
    // Validate
    if (!validateDepositData(depositData)) {
        return;
    }
    
    try {
        const response = await fetch('/api/deposits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(depositData)
        });
        
        if (response.ok) {
            showNotification('Deposit added successfully!', 'success');
            closeAddDepositModal();
            await loadDeposits(); // Reload deposits
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to add deposit', 'error');
        }
    } catch (error) {
        console.error('Error adding deposit:', error);
        showNotification('Error adding deposit', 'error');
    }
}

function validateDepositData(data) {
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    
    // Validate amount
    if (!data.amount || data.amount <= 0) {
        document.getElementById('amount-error').textContent = 'Please enter a valid amount';
        isValid = false;
    }
    
    // Validate date
    if (!data.date) {
        showNotification('Please select a date', 'error');
        isValid = false;
    }
    
    return isValid;
}

async function deleteDeposit(depositId) {
    if (!confirm('Are you sure you want to delete this deposit?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/deposits/${depositId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Deposit deleted successfully!', 'success');
            await loadDeposits(); // Reload deposits
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to delete deposit', 'error');
        }
    } catch (error) {
        console.error('Error deleting deposit:', error);
        showNotification('Error deleting deposit', 'error');
    }
}

function editDeposit(depositId) {
    // Find the deposit
    const deposit = deposits.find(d => d.id === depositId);
    if (!deposit) return;
    
    // Fill the form with existing data
    document.getElementById('depositAmount').value = deposit.amount;
    document.getElementById('depositDate').value = deposit.date;
    document.getElementById('depositDescription').value = deposit.description || '';
    document.getElementById('depositMember').value = deposit.member_id || '';
    
    // Change form behavior to edit mode
    const form = document.getElementById('addDepositForm');
    form.setAttribute('data-edit-id', depositId);
    
    // Update modal title
    document.querySelector('.modal-header h2').innerHTML = `
        <i class="fas fa-edit"></i>
        Edit Deposit
    `;
    
    // Update submit button
    document.querySelector('.submit-btn').innerHTML = `
        <i class="fas fa-save"></i>
        Update Deposit
    `;
    
    // Open modal
    openAddDepositModal();
    
    // Override form submission
    form.removeEventListener('submit', handleAddDeposit);
    form.addEventListener('submit', handleEditDeposit);
}

async function handleEditDeposit(event) {
    event.preventDefault();
    
    const form = event.target;
    const depositId = form.getAttribute('data-edit-id');
    
    const formData = new FormData(form);
    const depositData = {
        amount: parseFloat(formData.get('depositAmount')),
        date: formData.get('depositDate'),
        description: formData.get('depositDescription') || null,
        member_id: formData.get('depositMember') || null
    };
    
    // Validate
    if (!validateDepositData(depositData)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/deposits/${depositId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(depositData)
        });
        
        if (response.ok) {
            showNotification('Deposit updated successfully!', 'success');
            resetFormToAddMode();
            closeAddDepositModal();
            await loadDeposits(); // Reload deposits
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to update deposit', 'error');
        }
    } catch (error) {
        console.error('Error updating deposit:', error);
        showNotification('Error updating deposit', 'error');
    }
}

function resetFormToAddMode() {
    const form = document.getElementById('addDepositForm');
    form.removeAttribute('data-edit-id');
    
    // Reset modal title
    document.querySelector('.modal-header h2').innerHTML = `
        <i class="fas fa-plus"></i>
        Add New Deposit
    `;
    
    // Reset submit button
    document.querySelector('.submit-btn').innerHTML = `
        <i class="fas fa-plus"></i>
        Add Deposit
    `;
    
    // Reset form submission handler
    form.removeEventListener('submit', handleEditDeposit);
    form.addEventListener('submit', handleAddDeposit);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}
