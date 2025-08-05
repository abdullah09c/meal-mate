const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname)));

// MySQL database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'mate', // Change this to your MySQL username
  password: 'Abc1234@', // Change this to your MySQL password
  database: 'signup_db'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
  
  // Create users table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(100),
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL,
      is_active BOOLEAN DEFAULT TRUE
    )
  `;
  
  db.query(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Users table ready');
    }
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'sign-up.html'));
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'forgot-password.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

// Login route
app.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    // Validation
    if (!identifier || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email/username and password are required',
        field: !identifier ? 'identifier' : 'password'
      });
    }
    
    // Check if user exists (by email or username)
    const checkUserQuery = 'SELECT * FROM users WHERE email = ? OR username = ?';
    db.query(checkUserQuery, [identifier, identifier], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      if (results.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'User not found',
          field: 'identifier'
        });
      }
      
      const user = results[0];
      
      // Compare password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordMatch) {
        return res.status(400).json({ 
          success: false, 
          message: 'Incorrect password',
          field: 'password'
        });
      }
      
      // Login successful - update last_login timestamp
      const updateLoginQuery = 'UPDATE users SET last_login = NOW() WHERE id = ?';
      db.query(updateLoginQuery, [user.id], (updateErr) => {
        if (updateErr) {
          console.error('Error updating last_login:', updateErr);
        }
      });
      
      res.json({ 
        success: true, 
        message: 'Login successful!',
        user: {
          id: user.id,
          fullName: user.full_name,
          username: user.username,
          email: user.email
        }
      });
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Sign up route
app.post('/signup', async (req, res) => {
  try {
    const { fullName, email, username, phone, password, terms } = req.body;
    
    // Validation
    if (!fullName || !email || !username || !phone || !password || !terms) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    if (!terms) {
      return res.status(400).json({ 
        success: false, 
        message: 'You must accept the terms and conditions' 
      });
    }
    
    // Check if user already exists
    const checkUserQuery = 'SELECT * FROM users WHERE email = ? OR username = ?';
    db.query(checkUserQuery, [email, username], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      if (results.length > 0) {
        const existingUser = results[0];
        if (existingUser.email === email) {
          return res.status(400).json({ 
            success: false, 
            message: 'Email already registered' 
          });
        }
        if (existingUser.username === username) {
          return res.status(400).json({ 
            success: false, 
            message: 'Username already taken' 
          });
        }
      }
      
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Insert new user
      const insertUserQuery = 'INSERT INTO users (full_name, email, username, phone, password_hash) VALUES (?, ?, ?, ?, ?)';
      db.query(insertUserQuery, [fullName, email, username, phone, passwordHash], (err, results) => {
        if (err) {
          console.error('Error inserting user:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error creating account' 
          });
        }
        
        res.json({ 
          success: true, 
          message: 'MealMate account created successfully!',
          userId: results.insertId 
        });
      });
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Forgot Password route
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validation
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required',
        field: 'email'
      });
    }
    
    // Check if user exists
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkUserQuery, [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      if (results.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No account found with this email address',
          field: 'email'
        });
      }
      
      const user = results[0];
      
      // In a real application, you would:
      // 1. Generate a secure reset token
      // 2. Store it in database with expiration time
      // 3. Send email with reset link
      
      // For demo purposes, we'll just simulate success
      console.log(`Password reset requested for user: ${user.email}`);
      
      // Simulate email sending delay
      setTimeout(() => {
        res.json({ 
          success: true, 
          message: 'Password reset instructions sent successfully!'
        });
      }, 1000);
      
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Dashboard API routes
app.get('/api/today-meal-rate', (req, res) => {
  const userId = req.query.userId || 1;
  const today = new Date().toISOString().split('T')[0];
  
  const query = `
    SELECT 
      COALESCE(SUM(breakfast_cost + lunch_cost + dinner_cost), 0) as rate,
      COUNT(*) as mealCount
    FROM meal_reports 
    WHERE user_id = ? AND date = ?
  `;
  
  db.query(query, [userId, today], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.json({ rate: '0.00', mealCount: 0 });
    }
    
    const result = results[0] || { rate: 0, mealCount: 0 };
    res.json({
      rate: parseFloat(result.rate).toFixed(2),
      mealCount: result.mealCount
    });
  });
});

app.get('/api/total-cost', (req, res) => {
  const userId = req.query.userId || 1;
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const query = `
    SELECT 
      COALESCE(SUM(breakfast_cost + lunch_cost + dinner_cost), 0) as totalCost,
      COALESCE(SUM(CASE 
        WHEN DATE_FORMAT(date, '%Y-%m') = ? 
        THEN breakfast_cost + lunch_cost + dinner_cost 
        ELSE 0 END), 0) as monthlyTotal
    FROM meal_reports 
    WHERE user_id = ?
  `;
  
  db.query(query, [currentMonth, userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.json({ totalCost: '0.00', monthlyTotal: '0.00', change: 0 });
    }
    
    const result = results[0] || { totalCost: 0, monthlyTotal: 0 };
    res.json({
      totalCost: parseFloat(result.totalCost).toFixed(2),
      monthlyTotal: parseFloat(result.monthlyTotal).toFixed(2),
      change: Math.floor(Math.random() * 20) - 10 // Mock change percentage
    });
  });
});

app.get('/api/total-deposit', (req, res) => {
  const userId = req.query.userId || 1;
  
  const query = `
    SELECT 
      COALESCE(SUM(amount), 0) as totalDeposit,
      (SELECT amount FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 1) as lastDeposit
    FROM deposits 
    WHERE user_id = ?
  `;
  
  db.query(query, [userId, userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.json({ totalDeposit: '0.00', lastDeposit: '0.00' });
    }
    
    const result = results[0] || { totalDeposit: 0, lastDeposit: 0 };
    res.json({
      totalDeposit: parseFloat(result.totalDeposit).toFixed(2),
      lastDeposit: parseFloat(result.lastDeposit || 0).toFixed(2)
    });
  });
});

app.get('/api/total-meals', (req, res) => {
  const userId = req.query.userId || 1;
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const query = `
    SELECT 
      COUNT(*) as totalMeals,
      SUM(CASE 
        WHEN DATE_FORMAT(date, '%Y-%m') = ? 
        THEN 1 ELSE 0 END) as monthlyMeals
    FROM meal_reports 
    WHERE user_id = ? AND (breakfast_cost > 0 OR lunch_cost > 0 OR dinner_cost > 0)
  `;
  
  db.query(query, [currentMonth, userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.json({ totalMeals: 0, monthlyMeals: 0, avgPerDay: '0.0' });
    }
    
    const result = results[0] || { totalMeals: 0, monthlyMeals: 0 };
    const daysInMonth = new Date().getDate();
    const avgPerDay = result.monthlyMeals > 0 ? (result.monthlyMeals / daysInMonth).toFixed(1) : '0.0';
    
    res.json({
      totalMeals: result.totalMeals,
      monthlyMeals: result.monthlyMeals,
      avgPerDay: avgPerDay
    });
  });
});

// Profile API endpoints
app.get('/api/user-profile', (req, res) => {
  const userId = req.query.userId || 1; // In a real app, get from session
  
  const query = 'SELECT id, full_name as fullname, email, phone, created_at FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(results[0]);
  });
});

app.get('/api/user-meals-count', (req, res) => {
  const userId = req.query.userId || 1;
  
  const query = `
    SELECT COUNT(*) as total
    FROM meal_reports 
    WHERE user_id = ? AND (breakfast_cost > 0 OR lunch_cost > 0 OR dinner_cost > 0)
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.json({ total: 0 });
    }
    
    const result = results[0] || { total: 0 };
    res.json({ total: result.total });
  });
});

app.get('/api/user-deposits-total', (req, res) => {
  const userId = req.query.userId || 1;
  
  const query = 'SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.json({ total: 0 });
    }
    
    const result = results[0] || { total: 0 };
    res.json({ total: parseFloat(result.total) });
  });
});

app.put('/api/update-profile', async (req, res) => {
  try {
    const userId = req.query.userId || 1; // In a real app, get from session
    const { fullname, email, phone } = req.body;
    
    // Validation
    if (!fullname || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and email are required' 
      });
    }
    
    // Check if email is already taken by another user
    const checkEmailQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
    db.query(checkEmailQuery, [email, userId], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (results.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email is already taken by another user' 
        });
      }
      
      // Update user profile
      const updateQuery = 'UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?';
      db.query(updateQuery, [fullname, email, phone, userId], (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Failed to update profile' });
        }
        
        res.json({ 
          success: true, 
          message: 'Profile updated successfully' 
        });
      });
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/change-password', async (req, res) => {
  try {
    const userId = req.query.userId || 1; // In a real app, get from session
    const { currentPassword, newPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }
    
    // Get current user
    const getUserQuery = 'SELECT password_hash FROM users WHERE id = ?';
    db.query(getUserQuery, [userId], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const user = results[0];
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }
      
      // Hash new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      const updateQuery = 'UPDATE users SET password_hash = ? WHERE id = ?';
      db.query(updateQuery, [newPasswordHash, userId], (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Failed to change password' });
        }
        
        res.json({ 
          success: true, 
          message: 'Password changed successfully' 
        });
      });
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Routes for new pages
app.get('/reports', (req, res) => {
  res.sendFile(path.join(__dirname, 'reports.html'));
});

app.get('/bazar', (req, res) => {
  res.sendFile(path.join(__dirname, 'bazar.html'));
});

app.get('/members', (req, res) => {
  res.sendFile(path.join(__dirname, 'members.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
