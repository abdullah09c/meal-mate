// Profile Page JavaScript
class MealMateProfile {
    constructor() {
        this.user = null;
        this.init();
    }

    async init() {
        try {
            await this.loadUserData();
            this.setupEventListeners();
            this.updateProfileDisplay();
            this.loadUserStats();
        } catch (error) {
            console.error('Profile initialization error:', error);
            this.showError('Failed to load profile data');
        }
    }

    async loadUserData() {
        try {
            // Get userId from URL or default to 1 for demo
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId') || 1;
            
            // Fetch from server with userId
            const response = await fetch(`/api/user-profile?userId=${userId}`);
            if (response.ok) {
                this.user = await response.json();
                this.user.userId = userId; // Store userId for later use
                localStorage.setItem('currentUser', JSON.stringify(this.user));
            } else if (response.status === 401) {
                // User not authenticated, redirect to login
                window.location.href = '/login';
            } else {
                throw new Error('Failed to fetch user data');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            // Use default user data for demo
            this.user = {
                id: 1,
                userId: 1,
                fullname: 'Test User',
                email: 'test@example.com',
                phone: '+1234567890',
                created_at: '2024-01-15T10:30:00Z'
            };
            this.showError('Failed to load user data from database. Using demo data.');
        }
    }

    updateProfileDisplay() {
        if (!this.user) return;

        // Update header user info
        const userNameElement = document.querySelector('.user-name');
        const avatarLetterElement = document.querySelector('.avatar-letter');
        
        if (userNameElement) {
            userNameElement.textContent = this.user.fullname || 'User';
        }

        // Update user avatar with first letter
        if (avatarLetterElement && this.user.fullname) {
            const firstLetter = this.user.fullname.charAt(0).toUpperCase();
            avatarLetterElement.textContent = firstLetter;
        }

        // Update profile header
        const profileName = document.querySelector('.profile-name');
        const profileEmail = document.querySelector('.profile-email');
        const profileAvatarLarge = document.querySelector('.profile-avatar-large');

        if (profileName) profileName.textContent = this.user.fullname || 'User Name';
        if (profileEmail) profileEmail.textContent = this.user.email || 'user@example.com';
        
        if (profileAvatarLarge && this.user.fullname) {
            const firstLetter = this.user.fullname.charAt(0).toUpperCase();
            profileAvatarLarge.innerHTML = `<span style="font-size: 2rem; font-weight: bold; color: white;">${firstLetter}</span>`;
        }

        // Update personal information section
        this.updatePersonalInfo();
    }

    updatePersonalInfo() {
        const elements = {
            '.user-fullname': this.user.fullname || 'Not provided',
            '.user-username': this.user.username || 'Not provided',
            '.user-email': this.user.email || 'Not provided',
            '.user-phone': this.user.phone || 'Not provided',
            '.user-since': this.formatDate(this.user.created_at)
        };

        Object.entries(elements).forEach(([selector, value]) => {
            const element = document.querySelector(selector);
            if (element) element.textContent = value;
        });
    }

    async loadUserStats() {
        try {
            const userId = this.user.userId || this.user.id || 1;
            
            // Load various stats from API
            const [mealsResponse, depositsResponse] = await Promise.all([
                fetch(`/api/user-meals-count?userId=${userId}`),
                fetch(`/api/user-deposits-total?userId=${userId}`)
            ]);

            let totalMeals = 0, totalDeposits = 0, daysActive = 0, avgDailyCost = 0;

            if (mealsResponse.ok) {
                const mealsData = await mealsResponse.json();
                totalMeals = mealsData.total || 0;
            }

            if (depositsResponse.ok) {
                const depositsData = await depositsResponse.json();
                totalDeposits = depositsData.total || 0;
            }

            // Calculate days active (days since registration)
            if (this.user.created_at) {
                const createdDate = new Date(this.user.created_at);
                const today = new Date();
                daysActive = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
                if (daysActive < 1) daysActive = 1; // At least 1 day
            }

            // Calculate average daily cost
            if (totalDeposits > 0 && daysActive > 0) {
                avgDailyCost = Math.round(totalDeposits / daysActive);
            }

            // Update stats display
            this.updateStatsDisplay({
                totalMeals,
                totalDeposits,
                daysActive,
                avgDailyCost
            });

        } catch (error) {
            console.error('Error loading user stats:', error);
            // Use demo data
            this.updateStatsDisplay({
                totalMeals: 45,
                totalDeposits: 4000,
                daysActive: 30,
                avgDailyCost: 133
            });
            this.showError('Failed to load user statistics from database.');
        }
    }

    updateStatsDisplay(stats) {
        const elements = {
            '.total-meals-taken': stats.totalMeals.toString(),
            '.total-deposits': `৳${stats.totalDeposits.toLocaleString()}`,
            '.days-active': stats.daysActive.toString(),
            '.avg-daily-cost': `৳${stats.avgDailyCost}`
        };

        Object.entries(elements).forEach(([selector, value]) => {
            const element = document.querySelector(selector);
            if (element) element.textContent = value;
        });
    }

    setupEventListeners() {
        // Edit profile button
        const editBtn = document.querySelector('.edit-btn[data-section="personal"]');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.openEditModal());
            console.log('Edit profile button listener attached');
        } else {
            console.log('Edit profile button not found');
        }

        // Change password button
        const changePasswordBtn = document.querySelector('.setting-btn[data-action="change-password"]');
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', () => this.openPasswordModal());
            console.log('Change password button listener attached');
        } else {
            console.log('Change password button not found');
        }

        // Modal close buttons
        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Cancel buttons
        const cancelButtons = document.querySelectorAll('.cancel-btn');
        cancelButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Form submissions
        const editForm = document.getElementById('editProfileForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        const passwordForm = document.getElementById('changePasswordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }

        // Logout functionality
        const logoutBtn = document.querySelector('.logout-btn:not([href])');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    openEditModal() {
        const modal = document.getElementById('editModal');
        if (!modal) return;

        // Populate form with current user data
        const form = document.getElementById('editProfileForm');
        if (form && this.user) {
            form.editFullName.value = this.user.fullname || '';
            form.editUsername.value = this.user.username || '';
            form.editEmail.value = this.user.email || '';
            form.editPhone.value = this.user.phone || '';
        }

        modal.style.display = 'block';
    }

    openPasswordModal() {
        console.log('Opening password modal');
        const modal = document.getElementById('passwordModal');
        if (modal) {
            modal.style.display = 'block';
            console.log('Password modal opened');
            // Clear form
            const form = document.getElementById('changePasswordForm');
            if (form) {
                form.reset();
                console.log('Password form reset');
            }
        } else {
            console.log('Password modal not found');
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const saveBtn = form.querySelector('.save-btn');
        const originalText = saveBtn.textContent;
        
        // Show loading state
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        const updatedData = {
            fullname: formData.get('fullName'),
            username: formData.get('username'),
            email: formData.get('email'),
            phone: formData.get('phone')
        };

        try {
            const userId = this.user.userId || this.user.id || 1;
            console.log('Updating profile for user ID:', userId);
            console.log('Update data:', updatedData);
            
            const response = await fetch(`/api/update-profile?userId=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });

            const responseData = await response.json();
            console.log('Server response:', responseData);

            if (response.ok && responseData.success) {
                // Update local user data
                Object.assign(this.user, updatedData);
                localStorage.setItem('currentUser', JSON.stringify(this.user));
                
                // Update display
                this.updateProfileDisplay();
                
                // Close modal
                document.getElementById('editModal').style.display = 'none';
                
                this.showSuccess('Profile updated successfully!');
            } else {
                throw new Error(responseData.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            this.showError(error.message || 'Failed to update profile. Please try again.');
        } finally {
            // Reset button state
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    async handlePasswordChange(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const saveBtn = form.querySelector('.save-btn');
        const originalText = saveBtn.textContent;
        
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        if (newPassword !== confirmPassword) {
            this.showError('New passwords do not match');
            return;
        }

        // Show loading state
        saveBtn.textContent = 'Updating...';
        saveBtn.disabled = true;

        const passwordData = {
            currentPassword: formData.get('currentPassword'),
            newPassword: newPassword
        };

        try {
            const userId = this.user.userId || this.user.id || 1;
            console.log('Changing password for user ID:', userId);
            console.log('Current user data:', this.user);
            
            const response = await fetch(`/api/change-password?userId=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(passwordData)
            });

            const responseData = await response.json();
            console.log('Password change response status:', response.status);
            console.log('Password change response:', responseData);

            if (response.ok && responseData.success) {
                document.getElementById('passwordModal').style.display = 'none';
                form.reset();
                this.showSuccess('Password changed successfully!');
            } else {
                throw new Error(responseData.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Password change error:', error);
            this.showError(error.message || 'Failed to change password. Please try again.');
        } finally {
            // Reset button state
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    handleLogout() {
        // Clear local storage
        localStorage.removeItem('currentUser');
        
        // Redirect to login page
        window.location.href = '/login';
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        return date.toLocaleDateString('en-US', options);
    }

    showSuccess(message) {
        // Simple success notification
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
            z-index: 1001;
            font-weight: 500;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        // Simple error notification
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
            z-index: 1001;
            font-weight: 500;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize profile when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MealMateProfile();
});
