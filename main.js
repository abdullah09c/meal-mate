// Common password toggle function for both login and signup
function togglePassword(inputId, eyeIcon) {
  const passwordInput = document.getElementById(inputId);

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    eyeIcon.classList.remove("fa-eye");
    eyeIcon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    eyeIcon.classList.remove("fa-eye-slash");
    eyeIcon.classList.add("fa-eye");
  }
}

// Common error handling functions
function showError(element, message) {
  element.textContent = message;
  element.classList.add('show');
  element.parentElement.classList.add('error');
}

function hideError(element) {
  element.textContent = '';
  element.classList.remove('show');
  element.parentElement.classList.remove('error');
}

// Initialize page-specific functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if this is the signup page
  const signupForm = document.getElementById('sign-up-form');
  if (signupForm) {
    initializeSignupPage();
  }

  // Check if this is the login page
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    initializeLoginPage();
  }

  // Check if this is the forgot password page
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  if (forgotPasswordForm) {
    initializeForgotPasswordPage();
  }
});

// Sign-up page functionality
function initializeSignupPage() {
  const form = document.getElementById('sign-up-form');
  const termsCheckbox = document.getElementById('terms');
  const submitButton = document.querySelector('button[type="submit"]');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const passwordError = document.getElementById('password-error');
  const confirmPasswordError = document.getElementById('confirm-password-error');

  // Real-time password matching validation
  function validatePasswordMatch() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (confirmPassword && password !== confirmPassword) {
      showError(confirmPasswordError, 'Passwords do not match');
      return false;
    } else {
      hideError(confirmPasswordError);
      return true;
    }
  }

  // Add event listeners for real-time validation
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', validatePasswordMatch);
  }
  
  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      if (confirmPasswordInput && confirmPasswordInput.value) {
        validatePasswordMatch();
      }
    });
  }

  // Handle form submission
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Clear previous errors
    hideError(passwordError);
    hideError(confirmPasswordError);
    
    if (!termsCheckbox.checked) {
      alert('Please accept the Terms and Conditions to proceed.');
      termsCheckbox.focus();
      return false;
    }
    
    // Get form data
    const formData = {
      fullName: document.getElementById('full-name').value,
      email: document.getElementById('email').value,
      username: document.getElementById('username').value,
      phone: document.getElementById('phone').value,
      password: passwordInput.value,
      'confirm-password': confirmPasswordInput.value,
      terms: termsCheckbox.checked
    };
    
    // Client-side password validation
    if (formData.password !== formData['confirm-password']) {
      showError(confirmPasswordError, 'Passwords do not match. Please check and try again.');
      return false;
    }
    
    // Disable submit button during submission
    submitButton.disabled = true;
    submitButton.textContent = 'Creating Account...';
    
    try {
      // Send data to backend
      const response = await fetch('/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Account created successfully! Welcome to MealMate.');
        form.reset();
        hideError(passwordError);
        hideError(confirmPasswordError);
        submitButton.disabled = !termsCheckbox.checked;
      } else {
        alert(`Error: ${result.message}`);
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      submitButton.disabled = !termsCheckbox.checked;
      submitButton.textContent = 'Join MealMate';
    }
  });

  // Enable/disable submit button based on terms acceptance
  if (termsCheckbox) {
    termsCheckbox.addEventListener('change', function() {
      submitButton.disabled = !this.checked;
    });
    
    // Initially disable the button
    submitButton.disabled = !termsCheckbox.checked;
  }
}

// Login page functionality
function initializeLoginPage() {
  const form = document.getElementById('login-form');
  const submitButton = document.querySelector('button[type="submit"]');
  const identifierInput = document.getElementById('login-identifier');
  const passwordInput = document.getElementById('login-password');
  const identifierError = document.getElementById('identifier-error');
  const passwordError = document.getElementById('password-error');

  // Handle form submission
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Clear previous errors
    hideError(identifierError);
    hideError(passwordError);
    
    // Get form data
    const formData = {
      identifier: identifierInput.value.trim(),
      password: passwordInput.value
    };
    
    // Basic validation
    if (!formData.identifier) {
      showError(identifierError, 'Please enter your email or username');
      return;
    }
    
    if (!formData.password) {
      showError(passwordError, 'Please enter your password');
      return;
    }
    
    // Disable submit button during submission
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
    
    try {
      // Send data to backend
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Login successful! Welcome to MealMate.');
        // Redirect to dashboard with user info
        const userName = result.user.fullName || result.user.username;
        window.location.href = `/dashboard?user=${encodeURIComponent(userName)}`;
      } else {
        if (result.field === 'identifier') {
          showError(identifierError, result.message);
        } else if (result.field === 'password') {
          showError(passwordError, result.message);
        } else {
          alert(`Error: ${result.message}`);
        }
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = 'Login';
    }
  });
}

// Forgot Password page functionality
function initializeForgotPasswordPage() {
  const form = document.getElementById('forgot-password-form');
  const submitButton = document.querySelector('button[type="submit"]');
  const emailInput = document.getElementById('reset-email');
  const emailError = document.getElementById('email-error');

  // Handle form submission
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Clear previous errors
    hideError(emailError);
    
    // Get form data
    const email = emailInput.value.trim();
    
    // Basic validation
    if (!email) {
      showError(emailError, 'Please enter your email address');
      return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError(emailError, 'Please enter a valid email address');
      return;
    }
    
    // Disable submit button during submission
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    
    try {
      // Send data to backend
      const response = await fetch('/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show success message
        const container = document.querySelector('.container');
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message show';
        successDiv.innerHTML = `
          <p><i class="fas fa-check-circle"></i> Password reset instructions have been sent to ${email}</p>
          <p>Please check your email and follow the instructions to reset your password.</p>
        `;
        
        // Insert success message after logo
        const logo = document.querySelector('.logo');
        logo.parentNode.insertBefore(successDiv, logo.nextSibling);
        
        // Hide the form
        form.style.display = 'none';
        
      } else {
        if (result.field === 'email') {
          showError(emailError, result.message);
        } else {
          alert(`Error: ${result.message}`);
        }
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = 'Send Reset Instructions';
    }
  });
}
