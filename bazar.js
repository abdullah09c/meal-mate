// Bazar Management JavaScript

let currentEditId = null;
let bazarRecords = [];
let members = [];
let currentView = 'card'; // 'card' or 'table'
let searchDebounceTimer = null;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    // Show loading state
    showLoadingState();
    
    // Populate year filter
    populateYearFilter();
    
    // Set current date as default
    const today = new Date().toISOString().split('T')[0];
    const bazarDateInput = document.getElementById('bazarDate');
    if (bazarDateInput) {
        bazarDateInput.value = today;
    }
    
    // Load initial data
    loadMembers();
    loadBazarRecords();
    loadQuickSummary();
    
    // Setup form submission
    const bazarForm = document.getElementById('bazarForm');
    if (bazarForm) {
        bazarForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Setup modal click outside to close
    const bazarModal = document.getElementById('bazarModal');
    if (bazarModal) {
        bazarModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeBazarModal();
            }
        });
    }
    
    // Setup search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Update last updated time
    updateLastUpdatedTime();
}

function showLoadingState() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.style.display = 'flex';
    }
}

function hideLoadingState() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.style.display = 'none';
    }
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

function populateYearFilter() {
    const yearSelect = document.getElementById('yearFilter');
    if (!yearSelect) return;
    
    const currentYear = new Date().getFullYear();
    
    // Add years from current year to 3 years back
    for (let year = currentYear; year >= currentYear - 3; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    // Set current year as default
    yearSelect.value = currentYear;
}

async function loadMembers() {
    try {
        const response = await fetch('/api/members');
        if (response.ok) {
            members = await response.json();
            populateMemberSelect();
            populateMemberFilter();
        } else {
            console.error('Failed to load members');
            showToast('Failed to load members', 'error');
        }
    } catch (error) {
        console.error('Error loading members:', error);
        showToast('Error loading members', 'error');
    }
}

function populateMemberSelect() {
    const memberSelect = document.getElementById('memberSelect');
    if (!memberSelect) return;
    
    memberSelect.innerHTML = '<option value="">Select Member</option>';
    
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.full_name || member.name;
        option.dataset.memberName = member.full_name || member.name;
        memberSelect.appendChild(option);
    });
}

function populateMemberFilter() {
    const memberFilter = document.getElementById('memberFilter');
    if (!memberFilter) return;
    
    memberFilter.innerHTML = '<option value="">All Members</option>';
    
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.full_name || member.name;
        memberFilter.appendChild(option);
    });
}

async function loadBazarRecords() {
    try {
        showLoadingState();
        
        // Get filter values
        const searchTerm = document.getElementById('searchInput')?.value || '';
        const memberFilter = document.getElementById('memberFilter')?.value || '';
        const month = document.getElementById('monthFilter')?.value || '';
        const year = document.getElementById('yearFilter')?.value || '';
        const minAmount = document.getElementById('minAmount')?.value || '';
        const maxAmount = document.getElementById('maxAmount')?.value || '';
        const sortBy = document.getElementById('sortBy')?.value || 'date_desc';
        
        let url = '/api/bazar';
        const params = new URLSearchParams();
        
        if (searchTerm) params.append('search', searchTerm);
        if (memberFilter) params.append('member_id', memberFilter);
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        if (minAmount) params.append('min_amount', minAmount);
        if (maxAmount) params.append('max_amount', maxAmount);
        if (sortBy) params.append('sort', sortBy);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        if (response.ok) {
            bazarRecords = await response.json();
            
            // Apply client-side filtering if needed
            let filteredRecords = bazarRecords;
            
            if (searchTerm) {
                filteredRecords = filteredRecords.filter(record => 
                    record.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (record.description && record.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (record.items && record.items.toLowerCase().includes(searchTerm.toLowerCase()))
                );
            }
            
            bazarRecords = filteredRecords;
            displayBazarRecords();
            loadQuickSummary();
            updateLastUpdatedTime();
        } else {
            console.error('Failed to load bazar records');
            showToast('Failed to load bazar records', 'error');
        }
    } catch (error) {
        console.error('Error loading bazar records:', error);
        showToast('Error loading bazar records', 'error');
    } finally {
        hideLoadingState();
    }
}

async function loadQuickSummary() {
    try {
        const month = document.getElementById('monthFilter')?.value || '';
        const year = document.getElementById('yearFilter')?.value || '';
        
        let url = '/api/bazar/summary';
        const params = new URLSearchParams();
        
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        if (response.ok) {
            const stats = await response.json();
            updateQuickSummaryCards(stats);
        } else {
            console.error('Failed to load summary stats');
        }
    } catch (error) {
        console.error('Error loading summary stats:', error);
    }
}

function updateQuickSummaryCards(stats) {
    // Calculate quick stats
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const todayRecords = bazarRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.toDateString() === today.toDateString();
    });
    
    const weekRecords = bazarRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startOfWeek;
    });
    
    const monthRecords = bazarRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startOfMonth;
    });
    
    const todaySpent = todayRecords.reduce((sum, record) => sum + parseFloat(record.total_cost), 0);
    const weekSpent = weekRecords.reduce((sum, record) => sum + parseFloat(record.total_cost), 0);
    const monthSpent = monthRecords.reduce((sum, record) => sum + parseFloat(record.total_cost), 0);
    const averageSpent = monthRecords.length > 0 ? monthSpent / new Date().getDate() : 0;
    
    document.getElementById('todaySpent').textContent = `৳${todaySpent.toFixed(2)}`;
    document.getElementById('weekSpent').textContent = `৳${weekSpent.toFixed(2)}`;
    document.getElementById('monthSpent').textContent = `৳${monthSpent.toFixed(2)}`;
    document.getElementById('averageSpent').textContent = `৳${averageSpent.toFixed(2)}`;
}

function handleSearch(e) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        loadBazarRecords();
    }, 300);
}

function setPresetFilter(preset) {
    const today = new Date();
    
    switch(preset) {
        case 'today':
            // Clear all filters except set today's date
            document.getElementById('searchInput').value = '';
            document.getElementById('memberFilter').value = '';
            document.getElementById('monthFilter').value = today.getMonth() + 1;
            document.getElementById('yearFilter').value = today.getFullYear();
            document.getElementById('minAmount').value = '';
            document.getElementById('maxAmount').value = '';
            break;
        case 'week':
            // Set this week's filter
            document.getElementById('monthFilter').value = today.getMonth() + 1;
            document.getElementById('yearFilter').value = today.getFullYear();
            break;
        case 'month':
            // Set this month's filter
            document.getElementById('monthFilter').value = today.getMonth() + 1;
            document.getElementById('yearFilter').value = today.getFullYear();
            break;
    }
    
    loadBazarRecords();
}

function displayBazarRecords() {
    if (bazarRecords.length === 0) {
        showEmptyState();
        return;
    }
    
    hideEmptyState();
    
    if (currentView === 'card') {
        displayCardView();
    } else {
        displayTableView();
    }
}

function showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const cardView = document.getElementById('cardView');
    const tableView = document.getElementById('tableView');
    
    if (emptyState) emptyState.style.display = 'flex';
    if (cardView) cardView.style.display = 'none';
    if (tableView) tableView.style.display = 'none';
}

function hideEmptyState() {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = 'none';
}

function displayCardView() {
    const container = document.getElementById('bazarCardsContainer');
    if (!container) return;
    
    container.innerHTML = bazarRecords.map(record => {
        const itemsList = getItemsList(record.items);
        return `
            <div class="bazar-card">
                <div class="card-header">
                    <div class="card-date">
                        <div class="date-main">${formatDateShort(record.date)}</div>
                        <div class="date-sub">${getTimeAgo(record.created_at)}</div>
                    </div>
                    <div class="card-amount">
                        <div class="amount-main">৳${parseFloat(record.total_cost).toFixed(2)}</div>
                        <div class="amount-sub">Total Cost</div>
                    </div>
                </div>
                
                <div class="card-body">
                    <div class="member-info">
                        <div class="member-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="member-details">
                            <div class="member-name">${record.member_name}</div>
                            <div class="member-role">Shopper</div>
                        </div>
                    </div>
                    
                    ${record.description ? `
                        <div class="card-description">
                            <i class="fas fa-comment"></i>
                            <span>${record.description}</span>
                        </div>
                    ` : ''}
                    
                    ${itemsList ? `
                        <div class="card-items">
                            <div class="items-header">
                                <i class="fas fa-list"></i>
                                <span>Items (${itemsList.length})</span>
                            </div>
                            <div class="items-list">
                                ${itemsList.slice(0, 3).map(item => `<span class="item-tag">${item}</span>`).join('')}
                                ${itemsList.length > 3 ? `<span class="item-tag more">+${itemsList.length - 3} more</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="card-footer">
                    <button class="action-btn small outline" onclick="editBazarRecord(${record.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="action-btn small danger" onclick="deleteBazarRecord(${record.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Show card view
    document.getElementById('cardView').style.display = 'block';
    document.getElementById('tableView').style.display = 'none';
}

function displayTableView() {
    const tbody = document.getElementById('bazarTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = bazarRecords.map(record => {
        const itemsList = getItemsList(record.items);
        return `
            <tr>
                <td>
                    <div class="date-cell">
                        <strong>${formatDate(record.date)}</strong>
                        <small>${getTimeAgo(record.created_at)}</small>
                    </div>
                </td>
                <td>
                    <div class="member-cell">
                        <i class="fas fa-user"></i>
                        <span>${record.member_name}</span>
                    </div>
                </td>
                <td>
                    <div class="amount-cell">
                        <strong>৳${parseFloat(record.total_cost).toFixed(2)}</strong>
                    </div>
                </td>
                <td>
                    <div class="description-cell">
                        ${record.description ? record.description : '<em>No description</em>'}
                    </div>
                </td>
                <td>
                    <div class="items-cell">
                        ${itemsList ? `
                            <div class="items-preview">
                                <span class="items-count">${itemsList.length} items</span>
                                <div class="items-tooltip">
                                    ${itemsList.map(item => `<div>${item}</div>`).join('')}
                                </div>
                            </div>
                        ` : '<em>No items listed</em>'}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn small primary" onclick="editBazarRecord(${record.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn small danger" onclick="deleteBazarRecord(${record.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Show table view
    document.getElementById('cardView').style.display = 'none';
    document.getElementById('tableView').style.display = 'block';
}

function getItemsList(itemsJson) {
    if (!itemsJson) return null;
    
    try {
        const items = JSON.parse(itemsJson);
        return Array.isArray(items) ? items.filter(item => item.trim()) : null;
    } catch (e) {
        // If it's not JSON, try to split by lines or commas
        return itemsJson.split(/\n|,/).map(item => item.trim()).filter(item => item);
    }
}

function toggleView(view) {
    currentView = view;
    
    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-view="${view}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Refresh display
    displayBazarRecords();
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    return `${day} ${month}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
}

function openBazarModal(editId = null) {
    const modal = document.getElementById('bazarModal');
    const modalTitle = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('submitBtnText');
    const form = document.getElementById('bazarForm');
    
    if (!modal || !modalTitle || !submitBtn || !form) return;
    
    currentEditId = editId;
    
    if (editId) {
        modalTitle.textContent = 'Edit Bazar Record';
        submitBtn.textContent = 'Update Record';
        fillFormForEdit(editId);
    } else {
        modalTitle.textContent = 'Add New Bazar Record';
        submitBtn.textContent = 'Add Bazar Record';
        form.reset();
        // Set current date as default
        const today = new Date().toISOString().split('T')[0];
        const bazarDateInput = document.getElementById('bazarDate');
        if (bazarDateInput) {
            bazarDateInput.value = today;
        }
    }
    
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // Add active class after a short delay to trigger animation
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeBazarModal() {
    const modal = document.getElementById('bazarModal');
    const form = document.getElementById('bazarForm');
    
    if (modal) {
        modal.classList.remove('active');
        
        // Hide modal after animation completes
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    document.body.classList.remove('modal-open');
    currentEditId = null;
    
    if (form) {
        form.reset();
    }
}

function fillFormForEdit(recordId) {
    const record = bazarRecords.find(r => r.id === recordId);
    if (!record) return;
    
    const memberSelect = document.getElementById('memberSelect');
    const bazarDate = document.getElementById('bazarDate');
    const totalCost = document.getElementById('totalCost');
    const description = document.getElementById('description');
    const items = document.getElementById('items');
    
    if (memberSelect) memberSelect.value = record.member_id;
    if (bazarDate) bazarDate.value = record.date.split('T')[0];
    if (totalCost) totalCost.value = record.total_cost;
    if (description) description.value = record.description || '';
    
    // Handle items if stored as JSON
    if (items && record.items) {
        try {
            const itemsArray = JSON.parse(record.items);
            items.value = Array.isArray(itemsArray) ? itemsArray.join('\n') : itemsArray;
        } catch (e) {
            items.value = record.items;
        }
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const memberSelect = document.getElementById('memberSelect');
    const selectedOption = memberSelect?.options[memberSelect.selectedIndex];
    
    if (!selectedOption || !selectedOption.dataset.memberName) {
        showToast('Please select a member', 'error');
        return;
    }
    
    const data = {
        member_id: parseInt(formData.get('member_id')),
        member_name: selectedOption.dataset.memberName,
        total_cost: parseFloat(formData.get('total_cost')),
        date: formData.get('date'),
        description: formData.get('description') || null,
        items: formData.get('items') ? formData.get('items').split(/\n|,/).map(item => item.trim()).filter(item => item) : null
    };
    
    try {
        const url = currentEditId ? `/api/bazar/${currentEditId}` : '/api/bazar';
        const method = currentEditId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            closeBazarModal();
            loadBazarRecords();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving bazar record:', error);
        showToast('Error saving bazar record', 'error');
    }
}

function editBazarRecord(recordId) {
    openBazarModal(recordId);
}

async function deleteBazarRecord(recordId) {
    if (!confirm('Are you sure you want to delete this bazar record? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/bazar/${recordId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            loadBazarRecords();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting bazar record:', error);
        showToast('Error deleting bazar record', 'error');
    }
}

function applyFilters() {
    loadBazarRecords();
}

function clearFilters() {
    const searchInput = document.getElementById('searchInput');
    const memberFilter = document.getElementById('memberFilter');
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    const minAmount = document.getElementById('minAmount');
    const maxAmount = document.getElementById('maxAmount');
    const sortBy = document.getElementById('sortBy');
    
    if (searchInput) searchInput.value = '';
    if (memberFilter) memberFilter.value = '';
    if (monthFilter) monthFilter.value = '';
    if (yearFilter) yearFilter.value = '';
    if (minAmount) minAmount.value = '';
    if (maxAmount) maxAmount.value = '';
    if (sortBy) sortBy.value = 'date_desc';
    
    loadBazarRecords();
}

function exportBazarData() {
    if (bazarRecords.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    // Create CSV content
    const headers = ['Date', 'Member', 'Amount', 'Description', 'Items'];
    const csvContent = [
        headers.join(','),
        ...bazarRecords.map(record => [
            record.date,
            `"${record.member_name}"`,
            record.total_cost,
            `"${record.description || ''}"`,
            `"${record.items || ''}"`
        ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bazar-records-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('Data exported successfully', 'success');
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
    // Escape key to close modal
    if (e.key === 'Escape') {
        closeBazarModal();
        hideToast();
    }
    
    // Ctrl+N to add new record
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        openBazarModal();
    }
    
    // Ctrl+R to refresh
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        loadBazarRecords();
    }
});
