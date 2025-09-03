// Members Management JavaScript
// This file handles the member management functionality for MealMate

// Global variables for member management
let membersData = [];
let currentMemberToRemove = null;
let currentMemberToEdit = null;

// Initialize member management when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Members page loaded, initializing member management...');
    
    // Check if we're on the members page
    if (document.querySelector('.members-container')) {
        initializeMemberManagement();
    }
});

// Initialize member management functionality
function initializeMemberManagement() {
    console.log('Initializing member management...');
    
    // Update navigation links with adminId
    updateNavigationLinksWithAdminId();
    
    // Set today's date as default for join date
    const joinDateInput = document.getElementById('joinDate');
    if (joinDateInput) {
        joinDateInput.value = new Date().toISOString().split('T')[0];
    }

    // Setup form submission handlers
    setupAddMemberForm();
    setupRemoveMemberForm(); 
    setupEditMemberForm();

    // Setup Add Member button click handlers
    setupAddMemberButtons();

    // Load existing members from database
    loadMembersFromDatabase();

    // Setup modal close handlers
    setupModalCloseHandlers();
}

// Setup Add Member button click handlers
function setupAddMemberButtons() {
    console.log('Setting up add member buttons...');
    
    // Find all add member buttons and add click handlers
    const addMemberButtons = document.querySelectorAll('.add-member-btn');
    console.log(`Found ${addMemberButtons.length} add member buttons`);
    
    addMemberButtons.forEach((button) => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Add member button clicked');
            openAddMemberModal();
        });
    });

    // Setup modal close buttons
    setupModalCloseHandlers();
}

// Setup modal close handlers
function setupModalCloseHandlers() {
    // Add Member Modal close handlers
    const closeAddButtons = document.querySelectorAll('[data-action="close-add-modal"]');
    closeAddButtons.forEach((button) => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            closeAddMemberModal();
        });
    });

    // Remove Member Modal close handlers
    const closeRemoveButtons = document.querySelectorAll('[data-action="close-remove-modal"]');
    closeRemoveButtons.forEach((button) => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            closeRemoveMemberModal();
        });
    });

    // Edit Member Modal close handlers
    const closeEditButtons = document.querySelectorAll('[data-action="close-edit-modal"]');
    closeEditButtons.forEach((button) => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            closeEditMemberModal();
        });
    });

    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            if (e.target.id === 'addMemberModal') {
                closeAddMemberModal();
            } else if (e.target.id === 'removeMemberModal') {
                closeRemoveMemberModal();
            } else if (e.target.id === 'editMemberModal') {
                closeEditMemberModal();
            }
        }
    });
}

// Load members from database
async function loadMembersFromDatabase() {
    try {
        console.log('Loading members from database...');
        
        // Get current user ID from localStorage or URL params
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const urlParams = new URLSearchParams(window.location.search);
        const adminId = currentUser.id || urlParams.get('adminId') || 1;
        
        console.log('Admin ID:', adminId);
        
        const response = await fetch(`/api/members?adminId=${adminId}`);
        const data = await response.json();

        console.log('Response from API:', data);

        if (Array.isArray(data)) {
            // Direct array response
            membersData = data.map((member) => ({
                id: member.id.toString(),
                name: member.full_name || member.name,
                joinDate: member.join_date ? member.join_date.split('T')[0] : (member.created_at ? member.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
                avatar: generateAvatar(member.full_name || member.name),
            }));
        } else if (data.success && Array.isArray(data.members)) {
            // Response with success wrapper
            membersData = data.members.map((member) => ({
                id: member.id.toString(),
                name: member.full_name || member.name,
                joinDate: member.join_date ? member.join_date.split('T')[0] : (member.created_at ? member.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
                avatar: generateAvatar(member.full_name || member.name),
            }));
        } else {
            console.error('Unexpected API response format:', data);
            membersData = [];
        }

        console.log('Processed members data:', membersData);
        renderMembers();
    } catch (error) {
        console.error('Error loading members:', error);
        membersData = [];
        renderMembers(); // Show empty state
    }
}

// Setup Add Member form submission
function setupAddMemberForm() {
    const form = document.getElementById('addMemberForm');
    if (!form) {
        console.warn('Add member form not found');
        return;
    }

    console.log('Setting up add member form...');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Add member form submitted');

        // Clear previous errors
        clearFormErrors();

        // Get form data
        const formData = {
            name: document.getElementById('memberName').value.trim(),
            joinDate: document.getElementById('joinDate').value,
            password: document.getElementById('adminPassword').value,
        };

        console.log('Form data:', formData);

        // Validate form
        if (!validateAddMemberForm(formData)) {
            return;
        }

        // Add member
        await addNewMember(formData);
    });
}

// Setup Remove Member form submission
function setupRemoveMemberForm() {
    const form = document.getElementById('removeMemberForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Clear previous errors
        clearFormErrors();

        const password = document.getElementById('confirmPassword').value;

        // Basic validation
        if (!password) {
            showFormError('confirm-password-error', 'Password is required for confirmation');
            return;
        }

        // Remove member
        await removeMemberById(currentMemberToRemove, password);
    });
}

// Setup Edit Member form submission
function setupEditMemberForm() {
    const form = document.getElementById('editMemberForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Clear previous errors
        clearFormErrors();

        // Get form data
        const formData = {
            id: currentMemberToEdit,
            name: document.getElementById('editMemberName').value.trim(),
            joinDate: document.getElementById('editJoinDate').value,
            password: document.getElementById('editAdminPassword').value,
        };

        // Validate form
        if (!validateEditMemberForm(formData)) {
            return;
        }

        // Update member
        await updateMemberById(formData);
    });
}

// Validate Add Member form
function validateAddMemberForm(data) {
    let isValid = true;

    if (!data.name) {
        showFormError('name-error', 'Please enter the member name');
        isValid = false;
    }

    if (!data.joinDate) {
        showFormError('name-error', 'Please select a join date');
        isValid = false;
    }

    if (!data.password) {
        showFormError('password-error', 'Please enter your password for confirmation');
        isValid = false;
    }

    return isValid;
}

// Validate Edit Member form
function validateEditMemberForm(data) {
    let isValid = true;

    if (!data.name) {
        showFormError('edit-name-error', 'Please enter the member name');
        isValid = false;
    }

    if (!data.joinDate) {
        showFormError('edit-name-error', 'Please select a join date');
        isValid = false;
    }

    if (!data.password) {
        showFormError('edit-password-error', 'Please enter your password for confirmation');
        isValid = false;
    }

    return isValid;
}

// Add new member
async function addNewMember(data) {
    try {
        console.log('Adding new member:', data);
        
        // Show loading state
        const submitBtn = document.querySelector('#addMemberForm .submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Member...';
        submitBtn.disabled = true;

        // Get current user ID from localStorage or URL params
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const urlParams = new URLSearchParams(window.location.search);
        const adminId = currentUser.id || urlParams.get('adminId') || 1;

        // Send data to backend
        const response = await fetch(`/api/members?adminId=${adminId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: data.name,
                joinDate: data.joinDate,
                adminPassword: data.password,
            }),
        });

        const result = await response.json();
        console.log('Add member result:', result);

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
            showFormError('password-error', result.message || 'Failed to add member');
        }

        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        console.error('Error adding member:', error);
        showFormError('password-error', 'Failed to add member. Please try again.');

        // Reset button
        const submitBtn = document.querySelector('#addMemberForm .submit-btn');
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Add Member';
        submitBtn.disabled = false;
    }
}

// Remove member by ID
async function removeMemberById(memberId, password) {
    try {
        // Show loading state
        const deleteBtn = document.querySelector('.delete-btn');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';
        deleteBtn.disabled = true;

        // Find member name for success message
        const member = membersData.find((m) => m.id === memberId);
        const memberName = member ? member.name : 'Member';

        // Get current user ID from localStorage or URL params
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const urlParams = new URLSearchParams(window.location.search);
        const adminId = currentUser.id || urlParams.get('adminId') || 1;

        // Send delete request to backend
        const response = await fetch(`/api/members/${memberId}?adminId=${adminId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
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
            showSuccessMessage(result.message || `${memberName} has been removed successfully!`);
        } else {
            showFormError('confirm-password-error', result.message || 'Failed to remove member');
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

// Update member by ID
async function updateMemberById(data) {
    try {
        // Show loading state
        const submitBtn = document.querySelector('#editMemberForm .submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        submitBtn.disabled = true;

        // Get current user ID from localStorage or URL params
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const urlParams = new URLSearchParams(window.location.search);
        const adminId = currentUser.id || urlParams.get('adminId') || 1;

        // Send update request to backend
        const response = await fetch(`/api/members/${data.id}?adminId=${adminId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
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

            // Close modal
            closeEditMemberModal();

            // Show success message
            showSuccessMessage(result.message || `${data.name} has been updated successfully!`);
        } else {
            showFormError('edit-password-error', result.message || 'Failed to update member');
        }

        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    } catch (error) {
        console.error('Error updating member:', error);
        showFormError('edit-password-error', 'Failed to update member. Please try again.');

        // Reset button
        const submitBtn = document.querySelector('#editMemberForm .submit-btn');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Member';
        submitBtn.disabled = false;
    }
}

// Render members in the grid
function renderMembers() {
    const membersGrid = document.getElementById('membersGrid');
    const emptyState = document.getElementById('emptyState');

    console.log('renderMembers called with:', membersData);
    console.log('membersGrid element:', membersGrid);
    console.log('emptyState element:', emptyState);

    if (!membersGrid || !emptyState) {
        console.warn('Members grid or empty state element not found');
        return;
    }

    console.log('Rendering members:', membersData);

    if (membersData.length === 0) {
        console.log('No members, showing empty state');
        membersGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    console.log('Showing members grid');
    membersGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    const membersHTML = membersData
        .map(
            (member) => {
                const memberHTML = `
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
    `;
                console.log('Generated HTML for member:', member.name, memberHTML);
                return memberHTML;
            }
        )
        .join('');

    console.log('Final HTML:', membersHTML);
    membersGrid.innerHTML = membersHTML;
    console.log('Members grid innerHTML set');
}

// Modal Functions
function openAddMemberModal() {
    console.log('Opening add member modal...');
    const modal = document.getElementById('addMemberModal');
    if (modal) {
        modal.classList.add('active');
        // Focus on first input
        setTimeout(() => {
            document.getElementById('memberName')?.focus();
        }, 100);
    } else {
        console.error('Add member modal not found');
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
    console.log('Remove member:', memberId);
    const member = membersData.find((m) => m.id === memberId);
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
    console.log('Edit member:', memberId);
    const member = membersData.find((m) => m.id === memberId);
    if (!member) {
        showFormError('edit-name-error', 'Member not found');
        return;
    }

    currentMemberToEdit = memberId;

    // Populate the edit form with current member data
    document.getElementById('editMemberName').value = member.name;
    document.getElementById('editJoinDate').value = member.joinDate;
    
    // Clear any previous errors
    clearFormErrors();

    // Open edit modal
    const modal = document.getElementById('editMemberModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeEditMemberModal() {
    const modal = document.getElementById('editMemberModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('editMemberForm').reset();
        clearFormErrors();
    }
    currentMemberToEdit = null;
}

// Utility Functions
function generateAvatar(name) {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
        return words[0].charAt(0).toUpperCase() + words[1].charAt(0).toUpperCase();
    }
    return name.charAt(0).toUpperCase() + (name.charAt(1) || '').toUpperCase();
}

function formatDisplayDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
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
    errorElements.forEach((element) => {
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
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications if not already present
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

        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            backdrop-filter: blur(5px);
        }

        .modal-overlay.active {
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .members-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
            z-index: 1;
            position: relative;
        }

        .member-card {
            background: white !important;
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.1);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            min-height: 150px;
        }

        .error-message {
            opacity: 0;
            transition: opacity 0.3s ease;
            color: #dc2626;
            font-size: 0.875rem;
            margin-top: 0.25rem;
        }

        .error-message.show {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
}

// Update user information from localStorage or URL
function updateUserInfo() {
    const urlParams = new URLSearchParams(window.location.search);
    let userName = 'User'; // Default fallback

    // Try to get user data from localStorage first
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            userName = user.fullName || user.firstName || 'User';
        } catch (e) {
            console.warn('Error parsing current user from localStorage:', e);
        }
    }

    // Update all user name elements
    const userNameElements = document.querySelectorAll('.user-name, .user-name-dynamic');
    userNameElements.forEach((element) => {
        if (element) {
            element.textContent = userName;
        }
    });

    // Update avatar letter
    const avatarLetterElement = document.querySelector('.avatar-letter');
    if (avatarLetterElement && userName !== 'User') {
        avatarLetterElement.textContent = userName.charAt(0).toUpperCase();
    }
}

// Update user info when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateUserInfo();
    
    // Also update after a short delay to ensure all scripts have loaded
    setTimeout(updateUserInfo, 100);
});

// Navigation update functions for members page
function getCurrentAdminId() {
    const urlParams = new URLSearchParams(window.location.search);
    const adminIdFromUrl = urlParams.get('adminId');
    
    if (adminIdFromUrl) {
        return adminIdFromUrl;
    }
    
    // Try to get from localStorage
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            return user.id || '1';
        } catch (e) {
            console.warn('Error parsing current user from localStorage:', e);
        }
    }
    
    return '1'; // Default fallback
}

function updateNavigationLinksWithAdminId() {
    const adminId = getCurrentAdminId();
    
    // List of pages that should include adminId
    const pagesWithAdminId = ['dashboard.html', 'profile.html', 'members.html', 'reports.html', 'bazar.html', 'deposit.html', 'meal-management.html'];
    
    // Update all navigation links
    const navLinks = document.querySelectorAll('a[href]');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        
        // Check if it's one of our pages that needs adminId
        pagesWithAdminId.forEach(page => {
            if (href === page || href.includes(page)) {
                const url = new URL(link.href, window.location.origin);
                url.searchParams.set('adminId', adminId);
                link.href = url.toString();
            }
        });
    });
}