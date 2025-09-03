// Meal Management JavaScript

let currentEditId = null;
let members = [];
let allMeals = [];
let todayMeals = [];
let mealStats = {};
let isLoadingFinancials = false; // Flag to prevent multiple simultaneous calls

// Get adminId from URL parameters
function getAdminId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('adminId') || '1'; // Default to 1 if not provided
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    // Update navigation links with adminId
    if (typeof updateNavigationLinksWithAdminId === 'function') {
        updateNavigationLinksWithAdminId();
    }
    
    // Set current date
    updateCurrentDate();
    
    // Set default date in form
    const today = new Date().toISOString().split('T')[0];
    const mealDateInput = document.getElementById('mealDate');
    if (mealDateInput) {
        mealDateInput.value = today;
    }
    
    // Load initial data
    loadMembers();
    loadMealStats();
    loadTodayMeals();
    loadAllMeals();
    loadTodayStats();
    loadMembersWithoutMealsToday();
    
    // Load member financials after a short delay to ensure other data is loaded
    setTimeout(() => {
        loadMemberFinancials();
    }, 1000);
    
    // Setup form submission
    const mealForm = document.getElementById('mealForm');
    if (mealForm) {
        mealForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Setup modal click outside to close
    const mealModal = document.getElementById('mealModal');
    if (mealModal) {
        mealModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeMealModal();
            }
        });
    }
    
    // Setup meal checkbox interactions
    setupMealCheckboxes();
    
    // Setup month filter with debouncing
    const monthFilter = document.getElementById('monthFilter');
    if (monthFilter) {
        let filterTimeout;
        monthFilter.addEventListener('change', () => {
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(() => {
                if (!isLoadingFinancials) {
                    loadMemberFinancials(); // Use enhanced financial calculation with monthly filter
                }
            }, 300); // 300ms debounce
        });
    }
    
    // Setup tab switching
    const todayTab = document.getElementById('todayTab');
    const allTab = document.getElementById('allTab');
    
    if (todayTab) {
        todayTab.addEventListener('click', showTodayMeals);
    }
    
    if (allTab) {
        allTab.addEventListener('click', showAllMeals);
    }
    
    // Setup quick action buttons
    const addBulkBtn = document.getElementById('addBulkMeals');
    if (addBulkBtn) {
        addBulkBtn.addEventListener('click', addBulkMeals);
    }
}

function updateCurrentDate() {
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        const today = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        currentDateElement.textContent = today.toLocaleDateString('en-US', options);
    }
}

function setupMealCheckboxes() {
    const checkboxes = ['breakfast', 'lunch', 'dinner'];
    
    checkboxes.forEach(meal => {
        const checkbox = document.getElementById(meal);
        const countInput = document.getElementById(meal + 'Count');
        
        if (checkbox && countInput) {
            checkbox.addEventListener('change', function() {
                countInput.disabled = !this.checked;
                if (!this.checked) {
                    countInput.value = 1;
                }
            });
            
            countInput.addEventListener('change', function() {
                if (this.value > 0) {
                    checkbox.checked = true;
                } else {
                    checkbox.checked = false;
                }
            });
        }
    });
}

async function loadMembers() {
    try {
        const adminId = getAdminId();
        const response = await fetch(`/api/members?adminId=${adminId}`);
        if (response.ok) {
            members = await response.json();
            populateMemberSelect();
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

async function loadMealStats() {
    try {
        const adminId = getAdminId();
        const response = await fetch(`/api/meals/stats?adminId=${adminId}`);
        if (response.ok) {
            mealStats = await response.json();
            updateMealStatsDisplay();
        } else {
            console.error('Failed to load meal stats');
        }
    } catch (error) {
        console.error('Error loading meal stats:', error);
    }
}

function updateMealStatsDisplay() {
    const totalMeals = parseFloat(mealStats.total_meals) || 0;
    const totalBazarCost = parseFloat(mealStats.total_bazar_cost) || 0;
    const todayMeals = parseInt(mealStats.today_meals) || 0;
    
    const mealRate = totalMeals > 0 ? (totalBazarCost / totalMeals) : 0;
    
    document.getElementById('mealRate').textContent = `৳${mealRate.toFixed(2)}`;
    document.getElementById('totalMeals').textContent = totalMeals;
    document.getElementById('totalBazarCost').textContent = `৳${totalBazarCost.toFixed(2)}`;
    document.getElementById('todayMeals').textContent = todayMeals;
}

async function loadAllMeals() {
    try {
        showTodayMealsLoading();
        
        const adminId = getAdminId();
        const response = await fetch(`/api/meals/all?adminId=${adminId}`);
        
        if (response.ok) {
            allMeals = await response.json();
            displayAllMeals();
        } else {
            console.error('Failed to load all meals');
            showToast('Failed to load all meals', 'error');
        }
    } catch (error) {
        console.error('Error loading all meals:', error);
        showToast('Error loading all meals', 'error');
    } finally {
        hideTodayMealsLoading();
    }
}

async function loadTodayMeals() {
    try {
        showTodayMealsLoading();
        
        const adminId = getAdminId();
        console.log('Loading today meals for adminId:', adminId);
        
        // Try the today's meals API first
        const response = await fetch(`/api/meals/today?adminId=${adminId}`);
        console.log('Today meals response status:', response.status);
        
        if (response.ok) {
            todayMeals = await response.json();
            console.log('Today meals loaded:', todayMeals.length, 'meals');
            displayTodayMeals();
        } else {
            console.log('Today meals API failed, trying fallback...');
            // Fallback: use all meals API and filter by today
            const fallbackResponse = await fetch(`/api/meals/all?adminId=${adminId}`);
            
            if (fallbackResponse.ok) {
                const allMealsData = await fallbackResponse.json();
                const today = new Date().toISOString().split('T')[0];
                
                // Filter meals for today's date
                todayMeals = allMealsData.filter(meal => {
                    const mealDate = new Date(meal.date).toISOString().split('T')[0];
                    return mealDate === today;
                });
                
                console.log('Today meals loaded via fallback:', todayMeals.length, 'meals');
                displayTodayMeals();
            } else {
                const errorText = await fallbackResponse.text();
                console.error('Both today meals API and fallback failed. Status:', fallbackResponse.status, 'Response:', errorText);
                showToast('Failed to load today meals', 'error');
            }
        }
    } catch (error) {
        console.error('Error loading today meals:', error);
        
        // Last resort fallback - show empty state
        todayMeals = [];
        displayTodayMeals();
        showToast('Error loading today meals, showing empty state', 'warning');
    } finally {
        hideTodayMealsLoading();
    }
}

function showTodayMealsLoading() {
    const loadingState = document.getElementById('todayMealsLoading');
    if (loadingState) {
        loadingState.style.display = 'flex';
    }
}

function hideTodayMealsLoading() {
    const loadingState = document.getElementById('todayMealsLoading');
    if (loadingState) {
        loadingState.style.display = 'none';
    }
}

function displayTodayMeals() {
    console.log('Displaying today meals, count:', todayMeals ? todayMeals.length : 'undefined');
    const container = document.getElementById('todayMealsGrid');
    if (!container) {
        console.error('todayMealsGrid container not found');
        return;
    }
    
    if (!todayMeals || todayMeals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-utensils"></i>
                </div>
                <h3>No meals recorded for today</h3>
                <p>Start by adding meal records for members</p>
                <button class="action-btn primary" onclick="openMealModal()">
                    <i class="fas fa-plus"></i>
                    Add Today's Meal
                </button>
            </div>
        `;
        return;
    }
    
    try {
        container.innerHTML = todayMeals.map(meal => {
            const totalMeals = (meal.breakfast_count || 0) + (meal.lunch_count || 0) + (meal.dinner_count || 0);
            return `
                <div class="meal-card">
                    <div class="meal-card-header">
                        <div class="member-info">
                            <div class="member-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="member-details">
                                <h4>${meal.member_name || 'Unknown Member'}</h4>
                                <span class="total-meals">${totalMeals} meal${totalMeals !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                        <div class="meal-actions">
                            <button class="action-btn small primary" onclick="editMealRecord(${meal.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn small danger" onclick="deleteMealRecord(${meal.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="meal-card-body">
                        <div class="meal-types">
                            <div class="meal-type ${meal.breakfast_count > 0 ? 'active' : ''}">
                                <i class="fas fa-coffee"></i>
                                <span>Breakfast</span>
                                <span class="count">${meal.breakfast_count || 0}</span>
                            </div>
                            <div class="meal-type ${meal.lunch_count > 0 ? 'active' : ''}">
                                <i class="fas fa-hamburger"></i>
                                <span>Lunch</span>
                                <span class="count">${meal.lunch_count || 0}</span>
                            </div>
                            <div class="meal-type ${meal.dinner_count > 0 ? 'active' : ''}">
                                <i class="fas fa-pizza-slice"></i>
                                <span>Dinner</span>
                                <span class="count">${meal.dinner_count || 0}</span>
                            </div>
                        </div>
                        
                        <div class="meal-date">
                            <i class="fas fa-calendar"></i>
                            <span>Today - ${new Date(meal.date).toLocaleDateString()}</span>
                        </div>
                        
                        ${meal.notes ? `
                            <div class="meal-notes">
                                <i class="fas fa-comment"></i>
                                <span>${meal.notes}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        console.log('Today meals displayed successfully');
    } catch (error) {
        console.error('Error displaying today meals:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Error displaying meals</h3>
                <p>Please try refreshing the page</p>
                <button class="action-btn outline" onclick="refreshTodayMeals()">
                    <i class="fas fa-sync-alt"></i>
                    Refresh
                </button>
            </div>
        `;
    }
}

function displayAllMeals() {
    const container = document.getElementById('allMealsGrid');
    if (!container) return;
    
    if (allMeals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-utensils"></i>
                </div>
                <h3>No meals recorded</h3>
                <p>Start by adding meal records for members</p>
                <button class="action-btn primary" onclick="openMealModal()">
                    <i class="fas fa-plus"></i>
                    Add First Meal
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allMeals.map(meal => {
        const totalMeals = (meal.breakfast_count || 0) + (meal.lunch_count || 0) + (meal.dinner_count || 0);
        return `
            <div class="meal-card">
                <div class="meal-card-header">
                    <div class="member-info">
                        <div class="member-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="member-details">
                            <h4>${meal.member_name}</h4>
                            <span class="total-meals">${totalMeals} meal${totalMeals !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div class="meal-actions">
                        <button class="action-btn small primary" onclick="editMealRecord(${meal.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn small danger" onclick="deleteMealRecord(${meal.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="meal-card-body">
                    <div class="meal-types">
                        <div class="meal-type ${meal.breakfast_count > 0 ? 'active' : ''}">
                            <i class="fas fa-coffee"></i>
                            <span>Breakfast</span>
                            <span class="count">${meal.breakfast_count || 0}</span>
                        </div>
                        <div class="meal-type ${meal.lunch_count > 0 ? 'active' : ''}">
                            <i class="fas fa-hamburger"></i>
                            <span>Lunch</span>
                            <span class="count">${meal.lunch_count || 0}</span>
                        </div>
                        <div class="meal-type ${meal.dinner_count > 0 ? 'active' : ''}">
                            <i class="fas fa-pizza-slice"></i>
                            <span>Dinner</span>
                            <span class="count">${meal.dinner_count || 0}</span>
                        </div>
                    </div>
                    
                    <div class="meal-date">
                        <i class="fas fa-calendar"></i>
                        <span>${new Date(meal.date).toLocaleDateString()}</span>
                    </div>
                    
                    ${meal.notes ? `
                        <div class="meal-notes">
                            <i class="fas fa-comment"></i>
                            <span>${meal.notes}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Legacy member summary functions removed - now using calculateMemberFinancials() with monthly filtering

function openMealModal(editId = null) {
    const modal = document.getElementById('mealModal');
    const modalTitle = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('submitBtnText');
    const form = document.getElementById('mealForm');
    
    if (!modal || !modalTitle || !submitBtn || !form) return;
    
    currentEditId = editId;
    
    if (editId) {
        modalTitle.textContent = 'Edit Meal Record';
        submitBtn.textContent = 'Update Record';
        fillFormForEdit(editId);
    } else {
        modalTitle.textContent = 'Add Meal Record';
        submitBtn.textContent = 'Save Meal Record';
        form.reset();
        
        // Set current date as default
        const today = new Date().toISOString().split('T')[0];
        const mealDateInput = document.getElementById('mealDate');
        if (mealDateInput) {
            mealDateInput.value = today;
        }
        
        // Reset checkboxes and inputs
        setupMealCheckboxes();
    }
    
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeMealModal() {
    const modal = document.getElementById('mealModal');
    const form = document.getElementById('mealForm');
    
    if (modal) {
        modal.classList.remove('active');
        
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
    // Search in both today's meals and all meals
    let record = todayMeals.find(r => r.id === recordId) || allMeals.find(r => r.id === recordId);
    if (!record) return;
    
    const memberSelect = document.getElementById('memberSelect');
    const mealDate = document.getElementById('mealDate');
    const notes = document.getElementById('notes');
    
    if (memberSelect) memberSelect.value = record.member_id;
    if (mealDate) mealDate.value = record.date.split('T')[0];
    if (notes) notes.value = record.notes || '';
    
    // Set meal counts
    const meals = ['breakfast', 'lunch', 'dinner'];
    meals.forEach(meal => {
        const checkbox = document.getElementById(meal);
        const countInput = document.getElementById(meal + 'Count');
        const count = record[meal + '_count'] || 0;
        
        if (checkbox && countInput) {
            checkbox.checked = count > 0;
            countInput.value = count;
            countInput.disabled = count === 0;
        }
    });
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
    
    const adminId = getAdminId();
    const data = {
        admin_id: parseInt(adminId),
        member_id: parseInt(formData.get('member_id')),
        member_name: selectedOption.dataset.memberName,
        date: formData.get('date'),
        breakfast_count: document.getElementById('breakfast').checked ? parseInt(formData.get('breakfast_count')) || 1 : 0,
        lunch_count: document.getElementById('lunch').checked ? parseInt(formData.get('lunch_count')) || 1 : 0,
        dinner_count: document.getElementById('dinner').checked ? parseInt(formData.get('dinner_count')) || 1 : 0,
        notes: formData.get('notes') || null
    };
    
    // Validate at least one meal is selected
    if (data.breakfast_count === 0 && data.lunch_count === 0 && data.dinner_count === 0) {
        showToast('Please select at least one meal type', 'error');
        return;
    }
    
    try {
        const url = currentEditId ? `/api/meals/${currentEditId}?adminId=${adminId}` : `/api/meals?adminId=${adminId}`;
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
            closeMealModal();
            loadTodayMeals();
            loadAllMeals();
            loadMealStats();
            loadTodayStats();
            loadMembersWithoutMealsToday();
            loadMemberFinancials(); // Use enhanced financial calculation instead of member summary
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving meal record:', error);
        showToast('Error saving meal record', 'error');
    }
}

function editMealRecord(recordId) {
    openMealModal(recordId);
}

async function deleteMealRecord(recordId) {
    if (!confirm('Are you sure you want to delete this meal record? This action cannot be undone.')) {
        return;
    }
    
    try {
        const adminId = getAdminId();
        const response = await fetch(`/api/meals/${recordId}?adminId=${adminId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message, 'success');
            loadTodayMeals();
            loadAllMeals();
            loadMealStats();
            loadTodayStats();
            loadMembersWithoutMealsToday();
            loadMemberFinancials(); // Use enhanced financial calculation instead of member summary
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting meal record:', error);
        showToast('Error deleting meal record', 'error');
    }
}

function refreshTodayMeals() {
    loadTodayMeals();
    loadAllMeals();
    loadMealStats();
    loadTodayStats();
    loadMembersWithoutMealsToday();
    
    // Refresh financial calculations with any applied filters
    setTimeout(() => {
        loadMemberFinancials();
    }, 500);
    
    showToast('Data refreshed successfully', 'success');
}

async function loadTodayStats() {
    try {
        const adminId = getAdminId();
        const response = await fetch(`/api/meals/today-stats?adminId=${adminId}`);
        
        if (response.ok) {
            const todayStats = await response.json();
            updateTodayStatsDisplay(todayStats);
        } else {
            console.error('Failed to load today stats');
        }
    } catch (error) {
        console.error('Error loading today stats:', error);
    }
}

function updateTodayStatsDisplay(stats) {
    const todayStatsContainer = document.getElementById('todayStats');
    if (todayStatsContainer) {
        todayStatsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Today's Meals:</span>
                <span class="stat-value">${stats.total_meals || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Breakfast:</span>
                <span class="stat-value">${stats.breakfast_count || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Lunch:</span>
                <span class="stat-value">${stats.lunch_count || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Dinner:</span>
                <span class="stat-value">${stats.dinner_count || 0}</span>
            </div>
        `;
    }
}

async function loadMembersWithoutMealsToday() {
    try {
        const adminId = getAdminId();
        console.log('Loading members without meals for adminId:', adminId);
        
        const response = await fetch(`/api/meals/members-without-meals-today?adminId=${adminId}`);
        
        if (response.ok) {
            const membersWithoutMeals = await response.json();
            console.log('Members without meals loaded:', membersWithoutMeals.length, 'members');
            displayMembersWithoutMeals(membersWithoutMeals);
        } else {
            console.error('Failed to load members without meals. Status:', response.status);
            // Show empty state if API fails
            displayMembersWithoutMeals([]);
        }
    } catch (error) {
        console.error('Error loading members without meals:', error);
        // Show empty state if there's an error
        displayMembersWithoutMeals([]);
    }
}

function displayMembersWithoutMeals(members) {
    console.log('Displaying members without meals, count:', members ? members.length : 'undefined');
    const container = document.getElementById('membersWithoutMeals');
    if (!container) {
        console.error('membersWithoutMeals container not found');
        return;
    }
    
    try {
        if (!members || members.length === 0) {
            container.innerHTML = '<p>All members have meals for today!</p>';
            container.classList.remove('show');
        } else {
            container.innerHTML = `
                <h4>Members without meals today (${members.length}):</h4>
                <ul>
                    ${members.map(member => `<li>${member.full_name || member.name || 'Unknown Member'}</li>`).join('')}
                </ul>
            `;
            container.classList.add('show');
        }
        console.log('Members without meals displayed successfully');
    } catch (error) {
        console.error('Error displaying members without meals:', error);
        container.innerHTML = '<p>Error loading member data</p>';
    }
}

// Tab switching functions
function showTodayMeals() {
    const todayTab = document.getElementById('todayTab');
    const allTab = document.getElementById('allTab');
    const todayContent = document.getElementById('todayMealsContent');
    const allContent = document.getElementById('allMealsContent');
    
    if (todayTab && allTab && todayContent && allContent) {
        // Switch tab states
        todayTab.classList.add('active');
        allTab.classList.remove('active');
        
        // Switch content visibility
        todayContent.style.display = 'block';
        allContent.style.display = 'none';
        
        // Load today's meals if not already loaded
        loadTodayMeals();
        loadTodayStats();
        loadMembersWithoutMealsToday();
    }
}

function showAllMeals() {
    const todayTab = document.getElementById('todayTab');
    const allTab = document.getElementById('allTab');
    const todayContent = document.getElementById('todayMealsContent');
    const allContent = document.getElementById('allMealsContent');
    
    if (todayTab && allTab && todayContent && allContent) {
        // Switch tab states
        allTab.classList.add('active');
        todayTab.classList.remove('active');
        
        // Switch content visibility
        allContent.style.display = 'block';
        todayContent.style.display = 'none';
        
        // Load all meals if not already loaded
        loadAllMeals();
    }
}

// Quick action functions
function addQuickMeal(mealType) {
    openMealModal();
    
    // Pre-select the meal type
    setTimeout(() => {
        const checkbox = document.getElementById(mealType);
        const countInput = document.getElementById(mealType + 'Count');
        
        if (checkbox && countInput) {
            checkbox.checked = true;
            countInput.disabled = false;
            countInput.value = 1;
        }
    }, 100);
}

function viewMemberMeals(memberId) {
    const adminId = getAdminId();
    window.open(`/member-meals.html?adminId=${adminId}&memberId=${memberId}`, '_blank');
}

// Bulk operations
async function addBulkMeals() {
    const adminId = getAdminId();
    const mealData = {
        admin_id: parseInt(adminId),
        date: new Date().toISOString().split('T')[0],
        meals: []
    };
    
    // Get all members who don't have meals today
    try {
        const response = await fetch(`/api/meals/members-without-meals-today?adminId=${adminId}`);
        if (response.ok) {
            const membersWithoutMeals = await response.json();
            
            if (membersWithoutMeals.length === 0) {
                showToast('All members already have meals for today!', 'info');
                return;
            }
            
            // Add default meals for all members without meals
            mealData.meals = membersWithoutMeals.map(member => ({
                member_id: member.id,
                member_name: member.full_name || member.name,
                breakfast_count: 1,
                lunch_count: 1,
                dinner_count: 1
            }));
            
            // Send bulk request
            const bulkResponse = await fetch(`/api/meals/bulk?adminId=${adminId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(mealData)
            });
            
            const result = await bulkResponse.json();
            
            if (result.success) {
                showToast(`Added meals for ${mealData.meals.length} members`, 'success');
                refreshTodayMeals();
            } else {
                showToast(result.message || 'Failed to add bulk meals', 'error');
            }
        }
    } catch (error) {
        console.error('Error adding bulk meals:', error);
        showToast('Error adding bulk meals', 'error');
    }
}

async function loadDateRangeSummary(startDate, endDate) {
    try {
        const adminId = getAdminId();
        const response = await fetch(`/api/meals/date-range-summary?adminId=${adminId}&startDate=${startDate}&endDate=${endDate}`);
        
        if (response.ok) {
            const summary = await response.json();
            displayDateRangeSummary(summary);
        } else {
            console.error('Failed to load date range summary');
            showToast('Failed to load date range summary', 'error');
        }
    } catch (error) {
        console.error('Error loading date range summary:', error);
        showToast('Error loading date range summary', 'error');
    }
}

function displayDateRangeSummary(summary) {
    const container = document.getElementById('dateRangeSummary');
    if (container && summary) {
        container.innerHTML = `
            <div class="summary-stats">
                <div class="stat-card">
                    <h4>Total Meals</h4>
                    <span class="stat-number">${summary.total_meals || 0}</span>
                </div>
                <div class="stat-card">
                    <h4>Breakfast</h4>
                    <span class="stat-number">${summary.total_breakfast || 0}</span>
                </div>
                <div class="stat-card">
                    <h4>Lunch</h4>
                    <span class="stat-number">${summary.total_lunch || 0}</span>
                </div>
                <div class="stat-card">
                    <h4>Dinner</h4>
                    <span class="stat-number">${summary.total_dinner || 0}</span>
                </div>
                <div class="stat-card">
                    <h4>Active Days</h4>
                    <span class="stat-number">${summary.active_days || 0}</span>
                </div>
            </div>
        `;
    }
}

// Export functions for external use
window.mealManagement = {
    showTodayMeals,
    showAllMeals,
    addQuickMeal,
    addBulkMeals,
    viewMemberMeals,
    loadDateRangeSummary,
    refreshTodayMeals,
    openMealModal,
    getAdminId,
    calculateMemberFinancials
};

// Enhanced financial calculation function with monthly filtering and proper API usage
async function calculateMemberFinancials(month = null) {
    try {
        const adminId = getAdminId();
        
        // Get month filter if not provided
        if (!month) {
            const monthFilter = document.getElementById('monthFilter');
            month = monthFilter ? monthFilter.value : '';
        }
        
        console.log('Calculating member financials for adminId:', adminId, 'month:', month || 'all');
        
        // Build API URLs with month filter if provided
        const buildUrl = (baseUrl, additionalParams = {}) => {
            const params = new URLSearchParams({ adminId });
            if (month) params.append('month', month);
            
            Object.entries(additionalParams).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            
            return `${baseUrl}?${params.toString()}`;
        };
        
        // Use the member-summary API which already handles monthly filtering and aggregation
        let memberSummaryData = [];
        let mealStatsData = {};
        let totalBazarCost = 0;
        
        // Fetch member summary data (this API already supports month filtering)
        try {
            const memberSummaryResponse = await fetch(buildUrl('/api/meals/member-summary'));
            if (memberSummaryResponse.ok) {
                memberSummaryData = await memberSummaryResponse.json();
                console.log('Member summary data loaded:', memberSummaryData.length, 'members');
            } else {
                console.warn('Member summary API failed with status:', memberSummaryResponse.status);
            }
        } catch (error) {
            console.warn('Member summary API error:', error.message);
        }
        
        // Fetch meal stats for the period
        try {
            const mealStatsResponse = await fetch(buildUrl('/api/meals/stats'));
            if (mealStatsResponse.ok) {
                mealStatsData = await mealStatsResponse.json();
                console.log('Meal stats loaded:', mealStatsData);
            } else {
                console.warn('Meal stats API failed with status:', mealStatsResponse.status);
            }
        } catch (error) {
            console.warn('Meal stats API error:', error.message);
        }
        
        // Get bazar cost for the period
        try {
            const bazarSummaryResponse = await fetch(buildUrl('/api/bazar/summary'));
            if (bazarSummaryResponse.ok) {
                const bazarSummary = await bazarSummaryResponse.json();
                totalBazarCost = parseFloat(bazarSummary.total_spent) || 0;
                console.log('Bazar summary loaded, total cost:', totalBazarCost);
            } else {
                // Fallback to individual bazar records
                const bazarResponse = await fetch(buildUrl('/api/bazar'));
                if (bazarResponse.ok) {
                    const bazarRecords = await bazarResponse.json();
                    totalBazarCost = bazarRecords.reduce((sum, record) => {
                        // Filter by month if specified
                        if (month) {
                            const recordDate = new Date(record.date);
                            const recordMonth = recordDate.toISOString().slice(0, 7); // YYYY-MM format
                            if (recordMonth !== month) return sum;
                        }
                        return sum + (parseFloat(record.total_cost) || 0);
                    }, 0);
                    console.log('Bazar records fallback, total cost:', totalBazarCost);
                }
            }
        } catch (error) {
            console.warn('Bazar API failed, using 0 for total cost:', error.message);
        }
        
        // If member summary API worked, use its data; otherwise do manual calculation
        let memberFinancials = [];
        
        if (memberSummaryData.length > 0) {
            // Use member summary API data (already filtered by month)
            const totalMeals = parseFloat(mealStatsData.total_meals) || memberSummaryData.reduce((sum, member) => sum + parseFloat(member.total_meals || 0), 0);
            const mealRate = totalMeals > 0 ? totalBazarCost / totalMeals : 0;
            
            memberFinancials = memberSummaryData.map(member => {
                const memberTotalMeals = parseFloat(member.total_meals) || 0;
                const memberTotalDeposits = parseFloat(member.total_deposits) || 0;
                const memberMealCost = memberTotalMeals * mealRate;
                const remainingBalance = memberTotalDeposits - memberMealCost;
                
                return {
                    id: member.member_id,
                    name: member.member_name,
                    totalMeals: memberTotalMeals,
                    totalDeposits: memberTotalDeposits,
                    mealCost: memberMealCost,
                    remainingBalance: remainingBalance,
                    status: remainingBalance >= 0 ? 'positive' : 'negative',
                    mealRate: mealRate
                };
            });
            
            console.log('Used member summary API data for', memberFinancials.length, 'members');
        } else {
            // Fallback to manual calculation
            console.log('Using manual calculation fallback');
            
            // Fetch all required data
            const [membersResponse, mealsResponse, depositsResponse] = await Promise.all([
                fetch(buildUrl('/api/members')),
                fetch(buildUrl('/api/meals/all')),
                fetch(buildUrl('/api/deposits'))
            ]);
            
            if (!membersResponse.ok) {
                throw new Error(`Members API failed with status: ${membersResponse.status}`);
            }
            if (!mealsResponse.ok) {
                throw new Error(`Meals API failed with status: ${mealsResponse.status}`);
            }
            if (!depositsResponse.ok) {
                throw new Error(`Deposits API failed with status: ${depositsResponse.status}`);
            }
            
            // Parse response data with validation
            const membersData = await membersResponse.json();
            const allMealsData = await mealsResponse.json();
            const depositsResponse_data = await depositsResponse.json();
            
            // Extract deposits array from response object
            const depositsData = depositsResponse_data.deposits || depositsResponse_data;
            
            // Validate data types
            if (!Array.isArray(membersData)) {
                throw new Error('Members data is not an array');
            }
            if (!Array.isArray(allMealsData)) {
                throw new Error('Meals data is not an array');
            }
            if (!Array.isArray(depositsData)) {
                console.warn('Deposits API response format:', depositsResponse_data);
                throw new Error('Deposits data is not an array');
            }
            
            console.log('Raw data loaded:', {
                members: membersData.length,
                meals: allMealsData.length,
                deposits: depositsData.length
            });            // Filter meals by month if specified
            const filteredMeals = month ? allMealsData.filter(meal => {
                const mealDate = new Date(meal.date);
                const mealMonth = mealDate.toISOString().slice(0, 7); // YYYY-MM format
                return mealMonth === month;
            }) : allMealsData;
            
            // Filter deposits by month if specified
            const filteredDeposits = month ? depositsData.filter(deposit => {
                const depositDate = new Date(deposit.date);
                const depositMonth = depositDate.toISOString().slice(0, 7); // YYYY-MM format
                return depositMonth === month;
            }) : depositsData;
            
            // Calculate total meals for the period
            const totalMeals = filteredMeals.reduce((sum, meal) => {
                return sum + (parseInt(meal.breakfast_count) || 0) + (parseInt(meal.lunch_count) || 0) + (parseInt(meal.dinner_count) || 0);
            }, 0);
            
            const mealRate = totalMeals > 0 ? totalBazarCost / totalMeals : 0;
            
            // Calculate financials for each member
            memberFinancials = membersData.map(member => {
                // Calculate total meals for this member in the period
                const memberMeals = filteredMeals
                    .filter(meal => meal.member_id === member.id)
                    .reduce((sum, meal) => {
                        return sum + (parseInt(meal.breakfast_count) || 0) + (parseInt(meal.lunch_count) || 0) + (parseInt(meal.dinner_count) || 0);
                    }, 0);
                
                // Calculate total deposits for this member in the period
                const memberDeposits = filteredDeposits
                    .filter(deposit => deposit.member_id === member.id)
                    .reduce((sum, deposit) => sum + (parseFloat(deposit.amount) || 0), 0);
                
                const memberMealCost = memberMeals * mealRate;
                const remainingBalance = memberDeposits - memberMealCost;
                
                return {
                    id: member.id,
                    name: member.full_name || member.name,
                    totalMeals: memberMeals,
                    totalDeposits: memberDeposits,
                    mealCost: memberMealCost,
                    remainingBalance: remainingBalance,
                    status: remainingBalance >= 0 ? 'positive' : 'negative',
                    mealRate: mealRate
                };
            });
        }
        
        console.log('Member financials calculated:', memberFinancials.length, 'members');
        
        // Sort by remaining balance (highest first)
        memberFinancials.sort((a, b) => b.remainingBalance - a.remainingBalance);
        
        // Calculate summary statistics
        const totalMealsCalculated = memberFinancials.reduce((sum, m) => sum + m.totalMeals, 0);
        const mealRateCalculated = totalMealsCalculated > 0 ? totalBazarCost / totalMealsCalculated : 0;
        
        // Ensure we have valid data
        if (memberFinancials.length === 0) {
            console.warn('No member financial data calculated, returning empty result');
            return {
                success: true,
                data: {
                    members: [],
                    summary: {
                        totalBazarCost: 0,
                        totalMeals: 0,
                        mealRate: 0,
                        totalMembers: 0,
                        membersWithPositiveBalance: 0,
                        membersWithNegativeBalance: 0,
                        totalDeposits: 0,
                        totalMealCosts: 0,
                        totalRemainingBalance: 0,
                        filteredByMonth: month || null
                    }
                }
            };
        }
        
        return {
            success: true,
            data: {
                members: memberFinancials,
                summary: {
                    totalBazarCost,
                    totalMeals: totalMealsCalculated,
                    mealRate: mealRateCalculated,
                    totalMembers: memberFinancials.length,
                    membersWithPositiveBalance: memberFinancials.filter(m => m.remainingBalance >= 0).length,
                    membersWithNegativeBalance: memberFinancials.filter(m => m.remainingBalance < 0).length,
                    totalDeposits: memberFinancials.reduce((sum, m) => sum + m.totalDeposits, 0),
                    totalMealCosts: memberFinancials.reduce((sum, m) => sum + m.mealCost, 0),
                    totalRemainingBalance: memberFinancials.reduce((sum, m) => sum + m.remainingBalance, 0),
                    filteredByMonth: month || null
                }
            }
        };
        
    } catch (error) {
        console.error('Error calculating member financials:', error);
        return {
            success: false,
            error: error.message,
            data: null
        };
    }
}

// Display member financials in a formatted table
function displayMemberFinancials(financialData) {
    console.log('Displaying member financials');
    
    if (!financialData.success) {
        showToast('Error calculating member financials: ' + financialData.error, 'error');
        return;
    }
    
    const { members, summary } = financialData.data;
    
    // Update summary display
    displayFinancialSummary(summary);
    
    // Update member financial table
    const tbody = document.getElementById('memberSummaryBody');
    if (!tbody) {
        console.error('memberSummaryBody not found');
        return;
    }
    
    if (members.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">
                    <i class="fas fa-info-circle"></i>
                    No member data available
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = members.map(member => {
        return `
            <tr class="${member.status}">
                <td>
                    <div class="member-cell">
                        <i class="fas fa-user"></i>
                        <span>${member.name}</span>
                    </div>
                </td>
                <td>
                    <div class="meals-cell">
                        <strong>${member.totalMeals}</strong>
                        <small>meals</small>
                    </div>
                </td>
                <td>
                    <div class="amount-cell">
                        <strong>৳${member.totalDeposits.toFixed(2)}</strong>
                    </div>
                </td>
                <td>
                    <div class="amount-cell">
                        <strong>৳${member.mealCost.toFixed(2)}</strong>
                        <small>@ ৳${member.mealRate.toFixed(2)}/meal</small>
                    </div>
                </td>
                <td>
                    <div class="amount-cell ${member.status}">
                        <strong>৳${member.remainingBalance.toFixed(2)}</strong>
                    </div>
                </td>
                <td>
                    <div class="status-cell">
                        <span class="status-badge ${member.status}">
                            ${member.status === 'positive' ? 'Good' : 'Due'}
                        </span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    console.log('Member financials displayed successfully');
}

// Display financial summary with monthly filter information
function displayFinancialSummary(summary) {
    const container = document.getElementById('financialSummary');
    if (container) {
        // Convert string values to numbers safely
        const mealRate = parseFloat(summary.mealRate) || 0;
        const totalMeals = parseInt(summary.totalMeals) || 0;
        const totalBazarCost = parseFloat(summary.totalBazarCost) || 0;
        const totalDeposits = parseFloat(summary.totalDeposits) || 0;
        const totalRemainingBalance = parseFloat(summary.totalRemainingBalance) || 0;
        const membersWithPositiveBalance = parseInt(summary.membersWithPositiveBalance) || 0;
        const totalMembers = parseInt(summary.totalMembers) || 0;
        
        const monthInfo = summary.filteredByMonth ? 
            `<div class="summary-filter-info">
                <i class="fas fa-calendar-alt"></i>
                <span>Showing data for: ${new Date(summary.filteredByMonth + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
            </div>` : 
            `<div class="summary-filter-info">
                <i class="fas fa-calendar"></i>
                <span>Showing all-time data</span>
            </div>`;
        
        container.innerHTML = `
            ${monthInfo}
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-calculator"></i>
                    </div>
                    <div class="summary-content">
                        <h4>Meal Rate</h4>
                        <span class="summary-value">৳${mealRate.toFixed(2)}</span>
                        <small>per meal</small>
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-utensils"></i>
                    </div>
                    <div class="summary-content">
                        <h4>Total Meals</h4>
                        <span class="summary-value">${totalMeals}</span>
                        <small>all members</small>
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="summary-content">
                        <h4>Total Bazar</h4>
                        <span class="summary-value">৳${totalBazarCost.toFixed(2)}</span>
                        <small>total spent</small>
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-wallet"></i>
                    </div>
                    <div class="summary-content">
                        <h4>Total Deposits</h4>
                        <span class="summary-value">৳${totalDeposits.toFixed(2)}</span>
                        <small>all members</small>
                    </div>
                </div>
                
                <div class="summary-card ${totalRemainingBalance >= 0 ? 'positive' : 'negative'}">
                    <div class="summary-icon">
                        <i class="fas fa-balance-scale"></i>
                    </div>
                    <div class="summary-content">
                        <h4>Net Balance</h4>
                        <span class="summary-value">৳${totalRemainingBalance.toFixed(2)}</span>
                        <small>${totalRemainingBalance >= 0 ? 'surplus' : 'deficit'}</small>
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="summary-content">
                        <h4>Members Status</h4>
                        <span class="summary-value">${membersWithPositiveBalance}/${totalMembers}</span>
                        <small>in good standing</small>
                    </div>
                </div>
            </div>
        `;
    }
}

// Load and display member financials
async function loadMemberFinancials() {
    if (isLoadingFinancials) {
        console.log('Financial calculation already in progress, skipping...');
        return;
    }
    
    try {
        isLoadingFinancials = true;
        showToast('Calculating member financials...', 'info');
        const financialData = await calculateMemberFinancials();
        displayMemberFinancials(financialData);
        
        if (financialData.success) {
            showToast('Member financials calculated successfully', 'success');
        }
    } catch (error) {
        console.error('Error loading member financials:', error);
        showToast('Error loading member financials', 'error');
    } finally {
        isLoadingFinancials = false;
    }
}

// Export financial data to CSV
function exportFinancialData() {
    // First calculate the financial data
    calculateMemberFinancials().then(financialData => {
        if (!financialData.success || !financialData.data) {
            showToast('No financial data to export', 'warning');
            return;
        }
        
        const { members, summary } = financialData.data;
        
        // Create CSV content
        const headers = ['Member Name', 'Total Meals', 'Total Deposits', 'Meal Cost', 'Remaining Balance', 'Status', 'Meal Rate'];
        const csvContent = [
            headers.join(','),
            // Add summary row
            `"SUMMARY",${summary.totalMeals},${summary.totalDeposits.toFixed(2)},${summary.totalMealCosts.toFixed(2)},${summary.totalRemainingBalance.toFixed(2)},"${summary.totalRemainingBalance >= 0 ? 'SURPLUS' : 'DEFICIT'}",${summary.mealRate.toFixed(2)}`,
            '', // Empty row
            // Add member data
            ...members.map(member => {
                return [
                    `"${member.name}"`,
                    member.totalMeals,
                    member.totalDeposits.toFixed(2),
                    member.mealCost.toFixed(2),
                    member.remainingBalance.toFixed(2),
                    member.status === 'positive' ? 'Good' : 'Due',
                    member.mealRate.toFixed(2)
                ].join(',');
            })
        ].join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Financial report exported successfully', 'success');
    }).catch(error => {
        console.error('Error exporting financial data:', error);
        showToast('Error exporting financial data', 'error');
    });
}

function exportMemberSummary() {
    // Use the enhanced financial calculation for export
    calculateMemberFinancials().then(financialData => {
        if (!financialData.success || !financialData.data) {
            showToast('No data to export', 'warning');
            return;
        }
        
        const { members, summary } = financialData.data;
        
        if (members.length === 0) {
            showToast('No member data to export', 'warning');
            return;
        }
        
        // Create CSV content with enhanced data
        const headers = ['Member Name', 'Total Meals', 'Total Deposits', 'Meal Cost', 'Remaining Balance', 'Status', 'Meal Rate'];
        const csvContent = [
            headers.join(','),
            // Add summary row
            `"SUMMARY",${summary.totalMeals},${summary.totalDeposits.toFixed(2)},${summary.totalMealCosts.toFixed(2)},${summary.totalRemainingBalance.toFixed(2)},"${summary.totalRemainingBalance >= 0 ? 'SURPLUS' : 'DEFICIT'}",${summary.mealRate.toFixed(2)}`,
            '', // Empty row
            // Add member data
            ...members.map(member => {
                return [
                    `"${member.name}"`,
                    member.totalMeals,
                    member.totalDeposits.toFixed(2),
                    member.mealCost.toFixed(2),
                    member.remainingBalance.toFixed(2),
                    member.status === 'positive' ? 'Good' : 'Due',
                    member.mealRate.toFixed(2)
                ].join(',');
            })
        ].join('\n');
        
        // Create filename with month filter info
        const monthInfo = summary.filteredByMonth ? `-${summary.filteredByMonth}` : '-all-time';
        const filename = `member-summary${monthInfo}-${new Date().toISOString().split('T')[0]}.csv`;
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Member summary exported successfully', 'success');
    }).catch(error => {
        console.error('Error exporting member summary:', error);
        showToast('Error exporting member summary', 'error');
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
    // Escape key to close modal
    if (e.key === 'Escape') {
        closeMealModal();
        hideToast();
    }
    
    // Ctrl+N to add new record
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        openMealModal();
    }
    
    // Ctrl+R to refresh
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refreshTodayMeals();
    }
});
