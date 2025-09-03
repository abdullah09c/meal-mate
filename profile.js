// Profile Page JavaScript
class MealMateProfile {
    constructor() {
        this.user = null;
        this.init();
    }

    async init() {
        try {
            await this.loadUserData();
            this.updateNavigationLinksWithAdminId();
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
            // Get adminId from URL or default to 1 for demo
            const urlParams = new URLSearchParams(window.location.search);
            const adminId = urlParams.get('adminId') || urlParams.get('userId') || 1;
            
            // Fetch from server with adminId
            const response = await fetch(`/api/admin-profile?adminId=${adminId}`);
            if (response.ok) {
                this.user = await response.json();
                this.user.adminId = adminId; // Store adminId for later use
                this.user.userId = adminId; // Backward compatibility
                
                // Ensure compatibility with dashboard.js naming conventions
                if (this.user.first_name && this.user.last_name) {
                    this.user.fullName = `${this.user.first_name} ${this.user.last_name}`;
                    this.user.firstName = this.user.first_name;
                } else if (this.user.fullname) {
                    this.user.fullName = this.user.fullname;
                    // Extract firstName from fullname if needed
                    this.user.firstName = this.user.fullname.split(' ')[0];
                }
                
                localStorage.setItem('currentUser', JSON.stringify(this.user));
            } else if (response.status === 401) {
                // Admin not authenticated, redirect to login
                window.location.href = '/login';
            } else {
                throw new Error('Failed to fetch admin data');
            }
        } catch (error) {
            console.error('Error loading admin data:', error);
            // Use default admin data for demo
            this.user = {
                id: 1,
                adminId: 1,
                userId: 1, // Backward compatibility
                first_name: 'Test',
                last_name: 'Admin',
                fullname: 'Test Admin',
                fullName: 'Test Admin', // Dashboard.js compatibility
                firstName: 'Test', // Dashboard.js compatibility
                email: 'admin@example.com',
                phone: '+1234567890',
                role: 'admin',
                created_at: '2024-01-15T10:30:00Z'
            };
            this.showError('Failed to load admin data from database. Using demo data.');
        }
    }

    updateProfileDisplay() {
        if (!this.user) return;

        // Remove conflicting header updates - dashboard.js handles these
        // Commenting out to avoid conflicts with dashboard.js user display logic
        /*
        // Update header user info
        const userNameElement = document.querySelector('.user-name');
        const avatarLetterElement = document.querySelector('.avatar-letter');
        
        if (userNameElement) {
            userNameElement.textContent =this.user.first_name || this.user.fullname || 'User';
        }

        // Update user avatar with first letter
        if (avatarLetterElement && this.user.fullname) {
            const firstLetter = this.user.fullname.charAt(0).toUpperCase();
            avatarLetterElement.textContent = firstLetter;
        }
        */

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
            '.user-firstname': this.user.first_name || 'Not provided',
            '.user-lastname': this.user.last_name || 'Not provided',
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
            const adminId = this.user.adminId || this.user.userId || this.user.id || 1;
            
            // For admins, we'll show different stats - admin activity rather than member stats
            // Since admins manage the system, we'll show system-wide statistics
            const [mealsResponse, depositsResponse] = await Promise.all([
                fetch(`/api/meals/stats`), // Get overall system stats
                fetch(`/api/deposits?adminId=${adminId}`) // Get deposits managed by this admin
            ]);

            let totalMeals = 0, totalDeposits = 0, daysActive = 0, avgDailyCost = 0;

            if (mealsResponse.ok) {
                const mealsData = await mealsResponse.json();
                totalMeals = mealsData.total_meals || 0;
            }

            if (depositsResponse.ok) {
                const depositsData = await depositsResponse.json();
                if (depositsData.success && depositsData.deposits) {
                    totalDeposits = depositsData.deposits.reduce((sum, deposit) => sum + parseFloat(deposit.amount), 0);
                }
            }

            // Calculate days active (days since admin registration)
            if (this.user.created_at) {
                const createdDate = new Date(this.user.created_at);
                const today = new Date();
                daysActive = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
                if (daysActive < 1) daysActive = 1; // At least 1 day
            }

            // Calculate average daily cost (system-wide)
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
            console.error('Error loading admin stats:', error);
            // Use demo data
            this.updateStatsDisplay({
                totalMeals: 150,
                totalDeposits: 15000,
                daysActive: 30,
                avgDailyCost: 500
            });
            this.showError('Failed to load admin statistics from database.');
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

        // Update stat labels for admin context
        const statLabels = {
            '.total-meals-taken': 'Total System Meals',
            '.total-deposits': 'Total Managed Deposits',
            '.days-active': 'Days as Admin',
            '.avg-daily-cost': 'Avg Daily System Cost'
        };

        Object.entries(statLabels).forEach(([selector, label]) => {
            const statElement = document.querySelector(selector);
            if (statElement) {
                const labelElement = statElement.closest('.stat-item')?.querySelector('.stat-label');
                if (labelElement) {
                    labelElement.textContent = label;
                }
            }
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

        // Delete account button
        const deleteAccountBtn = document.querySelector('.setting-btn[data-action="delete-account"]');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => this.openDeleteAccountModal());
            console.log('Delete account button listener attached');
        } else {
            console.log('Delete account button not found');
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

        const deleteAccountForm = document.getElementById('deleteAccountForm');
        if (deleteAccountForm) {
            deleteAccountForm.addEventListener('submit', (e) => this.handleAccountDelete(e));
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
            form.editFirstName.value = this.user.first_name || '';
            form.editLastName.value = this.user.last_name || '';
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

    openDeleteAccountModal() {
        console.log('Opening delete account modal');
        const modal = document.getElementById('deleteAccountModal');
        if (modal) {
            modal.style.display = 'block';
            console.log('Delete account modal opened');
            // Clear form
            const form = document.getElementById('deleteAccountForm');
            if (form) {
                form.reset();
                console.log('Delete account form reset');
            }
        } else {
            console.log('Delete account modal not found');
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
        
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const fullname = `${firstName} ${lastName}`.trim();
        
        const updatedData = {
            fullname: fullname,
            username: formData.get('username'),
            email: formData.get('email'),
            phone: formData.get('phone')
        };

        try {
            const adminId = this.user.adminId || this.user.userId || this.user.id || 1;
            console.log('Updating admin profile for admin ID:', adminId);
            console.log('Update data:', updatedData);
            
            const response = await fetch(`/api/update-admin-profile?adminId=${adminId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });

            const responseData = await response.json();
            console.log('Server response:', responseData);

            if (response.ok && responseData.success) {
                // Update local admin data
                this.user.first_name = firstName;
                this.user.last_name = lastName;
                this.user.fullname = fullname;
                this.user.fullName = fullname; // Dashboard.js compatibility
                this.user.firstName = firstName; // Dashboard.js compatibility
                this.user.username = updatedData.username;
                this.user.email = updatedData.email;
                this.user.phone = updatedData.phone;
                
                localStorage.setItem('currentUser', JSON.stringify(this.user));
                
                // Update display
                this.updateProfileDisplay();
                
                // Close modal
                document.getElementById('editModal').style.display = 'none';
                
                this.showSuccess('Admin profile updated successfully!');
            } else {
                throw new Error(responseData.message || 'Failed to update admin profile');
            }
        } catch (error) {
            console.error('Admin profile update error:', error);
            this.showError(error.message || 'Failed to update admin profile. Please try again.');
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
            const adminId = this.user.adminId || this.user.userId || this.user.id || 1;
            console.log('Changing password for admin ID:', adminId);
            console.log('Current admin data:', this.user);
            
            const response = await fetch(`/api/change-admin-password?adminId=${adminId}`, {
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
                this.showSuccess('Admin password changed successfully!');
            } else {
                throw new Error(responseData.message || 'Failed to change admin password');
            }
        } catch (error) {
            console.error('Admin password change error:', error);
            this.showError(error.message || 'Failed to change admin password. Please try again.');
        } finally {
            // Reset button state
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    async handleAccountDelete(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const deleteBtn = form.querySelector('.delete-btn');
        const originalText = deleteBtn.textContent;
        
        const password = formData.get('password');
        const confirmDelete = form.querySelector('#confirmDelete').checked;

        if (!confirmDelete) {
            this.showError('Please confirm that you understand this action is permanent');
            return;
        }

        if (!password) {
            this.showError('Please enter your password to confirm deletion');
            return;
        }

        // Show loading state
        deleteBtn.textContent = 'Deleting Account...';
        deleteBtn.disabled = true;

        const deleteData = {
            password: password
        };

        try {
            const adminId = this.user.adminId || this.user.userId || this.user.id || 1;
            console.log('Deleting admin account for admin ID:', adminId);
            
            const response = await fetch(`/api/delete-admin-account?adminId=${adminId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(deleteData)
            });

            const responseData = await response.json();
            console.log('Admin account deletion response:', responseData);

            if (response.ok && responseData.success) {
                // Clear local storage
                localStorage.removeItem('currentUser');
                
                // Show success message
                this.showSuccess('Admin account deleted successfully. Redirecting...');
                
                // Redirect to index.html after a short delay
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
            } else {
                throw new Error(responseData.message || 'Failed to delete admin account');
            }
        } catch (error) {
            console.error('Admin account deletion error:', error);
            this.showError(error.message || 'Failed to delete admin account. Please try again.');
        } finally {
            // Reset button state
            deleteBtn.textContent = originalText;
            deleteBtn.disabled = false;
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

    updateNavigationLinksWithAdminId() {
        const adminId = this.user ? (this.user.adminId || this.user.userId || this.user.id) : 
                      new URLSearchParams(window.location.search).get('adminId') || '1';
        
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
}

// Initialize profile when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MealMateProfile();
});
