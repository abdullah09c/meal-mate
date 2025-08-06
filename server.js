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
  database: 'meal_mate'
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
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'member', 'guest') DEFAULT 'member',
      initial_deposit DECIMAL(10,2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL,
      is_active BOOLEAN DEFAULT TRUE
    )
  `;
  
  db.query(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table ready');
      
      // Check if we need to migrate from full_name to first_name/last_name
      db.query("SHOW COLUMNS FROM users LIKE 'full_name'", (err, results) => {
        if (!err && results.length > 0) {
          console.log('Migrating from full_name to first_name/last_name...');
          
          // Add new columns if they don't exist
          db.query("ALTER TABLE users ADD COLUMN first_name VARCHAR(50), ADD COLUMN last_name VARCHAR(50)", (err) => {
            if (err && !err.message.includes('Duplicate column name')) {
              console.error('Error adding new columns:', err);
              return;
            }
            
            // Migrate existing data
            db.query("UPDATE users SET first_name = SUBSTRING_INDEX(full_name, ' ', 1), last_name = SUBSTRING_INDEX(full_name, ' ', -1) WHERE full_name IS NOT NULL", (err) => {
              if (err) {
                console.error('Error migrating data:', err);
                return;
              }
              
              // Drop the old column
              db.query("ALTER TABLE users DROP COLUMN full_name", (err) => {
                if (err) {
                  console.error('Error dropping full_name column:', err);
                } else {
                  console.log('Migration completed successfully');
                }
              });
            });
          });
        }
      });
    }
  });

  // Create members table
  const createMembersTable = `
    CREATE TABLE IF NOT EXISTS members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      join_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;
  
  db.query(createMembersTable, (err) => {
    if (err) {
      console.error('Error creating members table:', err);
    } else {
      console.log('Members table ready');
    }
  });

  // Create meal_reports table
  const createMealReportsTable = `
    CREATE TABLE IF NOT EXISTS meal_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      member_id INT,
      date DATE NOT NULL,
      breakfast_cost DECIMAL(8,2) DEFAULT 0.00,
      lunch_cost DECIMAL(8,2) DEFAULT 0.00,
      dinner_cost DECIMAL(8,2) DEFAULT 0.00,
      total_cost DECIMAL(8,2) GENERATED ALWAYS AS (breakfast_cost + lunch_cost + dinner_cost) STORED,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `;
  
  db.query(createMealReportsTable, (err) => {
    if (err) {
      console.error('Error creating meal_reports table:', err);
    } else {
      console.log('Meal reports table ready');
    }
  });

  // Create deposits table
  const createDepositsTable = `
    CREATE TABLE IF NOT EXISTS deposits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      member_id INT,
      amount DECIMAL(10,2) NOT NULL,
      description VARCHAR(255),
      deposit_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )
  `;
  
  db.query(createDepositsTable, (err) => {
    if (err) {
      console.error('Error creating deposits table:', err);
    } else {
      console.log('Deposits table ready');
    }
  });

  // Create bazar table if it doesn't exist
  const createBazarTable = `
    CREATE TABLE IF NOT EXISTS bazar (
      id INT AUTO_INCREMENT PRIMARY KEY,
      member_id INT NOT NULL,
      member_name VARCHAR(100) NOT NULL,
      total_cost DECIMAL(10,2) NOT NULL,
      date DATE NOT NULL,
      description TEXT,
      items JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;
  
  db.query(createBazarTable, (err) => {
    if (err) {
      console.error('Error creating bazar table:', err);
    } else {
      console.log('Bazar table ready');
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

app.get('/members', (req, res) => {
  res.sendFile(path.join(__dirname, 'members.html'));
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
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: `${user.first_name} ${user.last_name}`,
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
    const { firstName, lastName, email, username, phone, password, terms } = req.body;
    
    // Validation
    if (!firstName || !lastName || !email || !username || !phone || !password || !terms) {
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
      const insertUserQuery = 'INSERT INTO users (first_name, last_name, email, username, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?)';
      db.query(insertUserQuery, [firstName, lastName, email, username, phone, passwordHash], (err, results) => {
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
  
  const query = 'SELECT id, first_name, last_name, CONCAT(first_name, " ", last_name) as fullname, email, username, phone, created_at FROM users WHERE id = ?';
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
    const { fullname, username, email, phone } = req.body;
    
    // Validation
    if (!fullname || !email || !username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, username and email are required' 
      });
    }
    
    // Check if email or username is already taken by another user
    const checkQuery = 'SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?';
    db.query(checkQuery, [email, username, userId], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (results.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email or username is already taken by another user' 
        });
      }
      
      // Split fullname into first_name and last_name
      const nameParts = fullname.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Update user profile
      const updateQuery = 'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, phone = ? WHERE id = ?';
      db.query(updateQuery, [firstName, lastName, username, email, phone, userId], (err, results) => {
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
    
    console.log('Password change request for user ID:', userId);
    console.log('Request body contains:', { 
      hasCurrentPassword: !!currentPassword, 
      hasNewPassword: !!newPassword 
    });
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }
    
    // Get current user
    const getUserQuery = 'SELECT password_hash FROM users WHERE id = ?';
    db.query(getUserQuery, [userId], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      console.log('User query results:', results.length > 0 ? 'User found' : 'User not found');
      
      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      const user = results[0];
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      console.log('Current password valid:', isCurrentPasswordValid);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }
      
      // Hash new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      console.log('New password hashed successfully');
      
      // Update password
      const updateQuery = 'UPDATE users SET password_hash = ? WHERE id = ?';
      db.query(updateQuery, [newPasswordHash, userId], (err, results) => {
        if (err) {
          console.error('Password update error:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to change password' 
          });
        }
        
        console.log('Password updated successfully for user ID:', userId);
        res.json({ 
          success: true, 
          message: 'Password changed successfully' 
        });
      });
    });
    
  } catch (error) {
    console.error('Server error in change password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Delete Account API endpoint
app.delete('/api/delete-account', async (req, res) => {
  try {
    const userId = req.query.userId || 1; // In a real app, get from session
    const { password } = req.body;
    
    console.log('Account deletion request for user ID:', userId);
    
    // Validation
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required for account deletion' 
      });
    }
    
    // Get current user and verify password
    const getUserQuery = 'SELECT password_hash FROM users WHERE id = ?';
    db.query(getUserQuery, [userId], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      const user = results[0];
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Incorrect password' 
        });
      }
      
      // Delete user account (CASCADE will handle related records)
      const deleteQuery = 'DELETE FROM users WHERE id = ?';
      db.query(deleteQuery, [userId], (deleteErr) => {
        if (deleteErr) {
          console.error('Account deletion error:', deleteErr);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to delete account' 
          });
        }
        
        console.log('Account deleted successfully for user ID:', userId);
        res.json({ 
          success: true, 
          message: 'Account deleted successfully' 
        });
      });
    });
    
  } catch (error) {
    console.error('Server error in delete account:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// ===== MEMBER MANAGEMENT API ENDPOINTS =====

// Get all members for a user
app.get('/api/members', (req, res) => {
  const userId = req.query.userId || 1;
  
  const query = `
    SELECT 
      id, 
      name, 
      join_date,
      created_at
    FROM members 
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }
    
    res.json({ 
      success: true, 
      members: results 
    });
  });
});

// Add new member
app.post('/api/members', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const { name, joinDate, adminPassword } = req.body;
    
    // Validation
    if (!name || !joinDate || !adminPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, join date, and password are required' 
      });
    }
    
    // Verify admin password
    const getUserQuery = 'SELECT password_hash FROM users WHERE id = ?';
    db.query(getUserQuery, [userId], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      const user = results[0];
      const passwordMatch = await bcrypt.compare(adminPassword, user.password_hash);
      
      if (!passwordMatch) {
        return res.status(400).json({ 
          success: false, 
          message: 'Incorrect password' 
        });
      }
      
      // Insert new member
      const insertMemberQuery = `
        INSERT INTO members (user_id, name, join_date) 
        VALUES (?, ?, ?)
      `;
      
      db.query(insertMemberQuery, [userId, name, joinDate], (insertErr, insertResults) => {
        if (insertErr) {
          console.error('Error inserting member:', insertErr);
          return res.status(500).json({ 
            success: false, 
            message: 'Error adding member' 
          });
        }
        
        res.json({ 
          success: true, 
          message: 'Member added successfully',
          memberId: insertResults.insertId 
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

// Remove member
app.delete('/api/members/:memberId', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const memberId = req.params.memberId;
    const { adminPassword } = req.body;
    
    // Validation
    if (!adminPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required for confirmation' 
      });
    }
    
    // Verify admin password
    const getUserQuery = 'SELECT password_hash FROM users WHERE id = ?';
    db.query(getUserQuery, [userId], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      const user = results[0];
      const passwordMatch = await bcrypt.compare(adminPassword, user.password_hash);
      
      if (!passwordMatch) {
        return res.status(400).json({ 
          success: false, 
          message: 'Incorrect password' 
        });
      }
      
      // Check if member exists and belongs to this user
      const checkMemberQuery = 'SELECT name FROM members WHERE id = ? AND user_id = ?';
      db.query(checkMemberQuery, [memberId, userId], (checkErr, checkResults) => {
        if (checkErr) {
          console.error('Database error:', checkErr);
          return res.status(500).json({ 
            success: false, 
            message: 'Database error' 
          });
        }
        
        if (checkResults.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Member not found' 
          });
        }
        
        const memberName = checkResults[0].name;
        
        // Delete member permanently
        const deleteMemberQuery = 'DELETE FROM members WHERE id = ? AND user_id = ?';
        db.query(deleteMemberQuery, [memberId, userId], (deleteErr) => {
          if (deleteErr) {
            console.error('Error deleting member:', deleteErr);
            return res.status(500).json({ 
              success: false, 
              message: 'Error removing member' 
            });
          }
          
          res.json({ 
            success: true, 
            message: `${memberName} removed successfully` 
          });
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

// Deposit Management API Endpoints

// Get all deposits
app.get('/api/deposits', (req, res) => {
  const query = `
    SELECT d.*, m.name as member_name 
    FROM deposits d 
    LEFT JOIN members m ON d.member_id = m.id 
    ORDER BY d.deposit_date DESC, d.created_at DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching deposits:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error retrieving deposits' 
      });
    }
    
    // Format the results
    const deposits = results.map(deposit => ({
      id: deposit.id,
      amount: deposit.amount,
      description: deposit.description,
      date: deposit.deposit_date,
      member_id: deposit.member_id,
      member_name: deposit.member_name,
      user_id: deposit.user_id,
      created_at: deposit.created_at
    }));
    
    res.json(deposits);
  });
});

// Add new deposit
app.post('/api/deposits', (req, res) => {
  const { amount, date, description, member_id, user_id } = req.body;
  
  // Validate required fields
  if (!amount || !date || !user_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Amount, date, and user ID are required' 
    });
  }
  
  if (amount <= 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Amount must be greater than 0' 
    });
  }
  
  const query = `
    INSERT INTO deposits (user_id, member_id, amount, description, deposit_date) 
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.query(query, [user_id, member_id || null, amount, description || null, date], (err, result) => {
    if (err) {
      console.error('Error adding deposit:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error adding deposit' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Deposit added successfully',
      depositId: result.insertId
    });
  });
});

// Update deposit
app.put('/api/deposits/:id', (req, res) => {
  const depositId = req.params.id;
  const { amount, date, description, member_id } = req.body;
  
  // Validate required fields
  if (!amount || !date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Amount and date are required' 
    });
  }
  
  if (amount <= 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Amount must be greater than 0' 
    });
  }
  
  // First check if deposit exists
  const checkQuery = 'SELECT id FROM deposits WHERE id = ?';
  db.query(checkQuery, [depositId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking deposit:', checkErr);
      return res.status(500).json({ 
        success: false, 
        message: 'Error updating deposit' 
      });
    }
    
    if (checkResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Deposit not found' 
      });
    }
    
    // Update the deposit
    const updateQuery = `
      UPDATE deposits 
      SET amount = ?, deposit_date = ?, description = ?, member_id = ? 
      WHERE id = ?
    `;
    
    db.query(updateQuery, [amount, date, description || null, member_id || null, depositId], (updateErr) => {
      if (updateErr) {
        console.error('Error updating deposit:', updateErr);
        return res.status(500).json({ 
          success: false, 
          message: 'Error updating deposit' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Deposit updated successfully' 
      });
    });
  });
});

// Delete deposit
app.delete('/api/deposits/:id', (req, res) => {
  const depositId = req.params.id;
  
  // First check if deposit exists
  const checkQuery = 'SELECT id FROM deposits WHERE id = ?';
  db.query(checkQuery, [depositId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking deposit:', checkErr);
      return res.status(500).json({ 
        success: false, 
        message: 'Error deleting deposit' 
      });
    }
    
    if (checkResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Deposit not found' 
      });
    }
    
    // Delete the deposit
    const deleteQuery = 'DELETE FROM deposits WHERE id = ?';
    db.query(deleteQuery, [depositId], (deleteErr) => {
      if (deleteErr) {
        console.error('Error deleting deposit:', deleteErr);
        return res.status(500).json({ 
          success: false, 
          message: 'Error deleting deposit' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Deposit deleted successfully' 
      });
    });
  });
});

// Get user deposits summary
app.get('/api/deposits/user/:userId/summary', (req, res) => {
  const userId = req.params.userId;
  
  const query = `
    SELECT 
      COALESCE(SUM(amount), 0) as total_balance,
      COALESCE(SUM(CASE WHEN MONTH(deposit_date) = MONTH(CURRENT_DATE()) AND YEAR(deposit_date) = YEAR(CURRENT_DATE()) THEN amount ELSE 0 END), 0) as this_month,
      COALESCE(MAX(amount), 0) as last_deposit,
      COALESCE(AVG(amount), 0) as average_deposit,
      COUNT(*) as total_deposits
    FROM deposits 
    WHERE user_id = ?
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching deposit summary:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error retrieving deposit summary' 
      });
    }
    
    res.json(results[0]);
  });
});

// ==================== BAZAR API ENDPOINTS ====================

// Get all bazar records with optional month/year filter
app.get('/api/bazar', (req, res) => {
  const { month, year, user_id } = req.query;
  
  let query = `
    SELECT b.*, u.full_name as member_name
    FROM bazar b
    LEFT JOIN users u ON b.member_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (month && year) {
    query += ' AND MONTH(b.date) = ? AND YEAR(b.date) = ?';
    params.push(month, year);
  }
  
  if (user_id) {
    query += ' AND b.member_id = ?';
    params.push(user_id);
  }
  
  query += ' ORDER BY b.date DESC, b.created_at DESC';
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching bazar records:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error retrieving bazar records' 
      });
    }
    
    res.json(results);
  });
});

// Add new bazar record
app.post('/api/bazar', (req, res) => {
  const { member_id, member_name, total_cost, date, description, items } = req.body;
  
  if (!member_id || !member_name || !total_cost || !date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Member ID, name, total cost, and date are required' 
    });
  }
  
  const query = `
    INSERT INTO bazar (member_id, member_name, total_cost, date, description, items)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const itemsJson = items ? JSON.stringify(items) : null;
  
  db.query(query, [member_id, member_name, total_cost, date, description, itemsJson], (err, result) => {
    if (err) {
      console.error('Error adding bazar record:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error adding bazar record' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Bazar record added successfully',
      bazarId: result.insertId
    });
  });
});

// Update bazar record
app.put('/api/bazar/:id', (req, res) => {
  const bazarId = req.params.id;
  const { member_id, member_name, total_cost, date, description, items } = req.body;
  
  if (!member_id || !member_name || !total_cost || !date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Member ID, name, total cost, and date are required' 
    });
  }
  
  const query = `
    UPDATE bazar 
    SET member_id = ?, member_name = ?, total_cost = ?, date = ?, description = ?, items = ?
    WHERE id = ?
  `;
  
  const itemsJson = items ? JSON.stringify(items) : null;
  
  db.query(query, [member_id, member_name, total_cost, date, description, itemsJson, bazarId], (err, result) => {
    if (err) {
      console.error('Error updating bazar record:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error updating bazar record' 
      });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bazar record not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Bazar record updated successfully' 
    });
  });
});

// Delete bazar record
app.delete('/api/bazar/:id', (req, res) => {
  const bazarId = req.params.id;
  
  db.query('DELETE FROM bazar WHERE id = ?', [bazarId], (err, result) => {
    if (err) {
      console.error('Error deleting bazar record:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error deleting bazar record' 
      });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bazar record not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Bazar record deleted successfully' 
    });
  });
});

// Get bazar summary statistics
app.get('/api/bazar/summary', (req, res) => {
  const { month, year } = req.query;
  
  let query = `
    SELECT 
      COALESCE(SUM(total_cost), 0) as total_spent,
      COALESCE(COUNT(*), 0) as total_records,
      COALESCE(AVG(total_cost), 0) as average_cost,
      COALESCE(MAX(total_cost), 0) as highest_cost,
      COALESCE(MIN(total_cost), 0) as lowest_cost
    FROM bazar
    WHERE 1=1
  `;
  const params = [];
  
  if (month && year) {
    query += ' AND MONTH(date) = ? AND YEAR(date) = ?';
    params.push(month, year);
  }
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching bazar summary:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error retrieving bazar summary' 
      });
    }
    
    res.json(results[0]);
  });
});

// Get monthly bazar summary
app.get('/api/bazar/monthly-summary', (req, res) => {
  const query = `
    SELECT 
      YEAR(date) as year,
      MONTH(date) as month,
      MONTHNAME(date) as month_name,
      COUNT(*) as total_records,
      SUM(total_cost) as total_spent,
      AVG(total_cost) as average_cost
    FROM bazar
    GROUP BY YEAR(date), MONTH(date)
    ORDER BY YEAR(date) DESC, MONTH(date) DESC
    LIMIT 12
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching monthly bazar summary:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error retrieving monthly bazar summary' 
      });
    }
    
    res.json(results);
  });
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

app.get('/deposit', (req, res) => {
  res.sendFile(path.join(__dirname, 'deposit.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
