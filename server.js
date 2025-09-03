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
  
  // Create admins table (renamed from users)
  const createAdminsTable = `
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'super_admin') DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL,
      is_active BOOLEAN DEFAULT TRUE
    )
  `;
  
  db.query(createAdminsTable, (err) => {
    if (err) {
      console.error('Error creating admins table:', err);
    } else {
      console.log('Admins table ready');
      
      // Check if we need to migrate from users to admins
      db.query("SHOW TABLES LIKE 'users'", (err, results) => {
        if (!err && results.length > 0) {
          console.log('Migrating from users table to admins table...');
          
          // Copy data from users to admins
          db.query("INSERT IGNORE INTO admins (id, first_name, last_name, email, username, phone, password_hash, role, created_at, last_login, is_active) SELECT id, first_name, last_name, email, username, phone, password_hash, CASE WHEN role = 'admin' THEN 'admin' ELSE 'admin' END, created_at, last_login, is_active FROM users", (err) => {
            if (err) {
              console.error('Error migrating data from users to admins:', err);
            } else {
              console.log('Data migration completed successfully');
              
              // First, check and drop any old foreign key constraints that reference users table
              db.query("SHOW CREATE TABLE members", (showErr, showResults) => {
                if (!showErr && showResults.length > 0) {
                  const createTableSQL = showResults[0]['Create Table'];
                  console.log('Current members table structure:', createTableSQL);
                  
                  // Check if there are any old foreign key constraints to users table
                  if (createTableSQL.includes('REFERENCES `users`')) {
                    console.log('Found old foreign key constraint to users table, dropping it...');
                    
                    // Drop the old foreign key constraint first
                    db.query("ALTER TABLE members DROP FOREIGN KEY members_ibfk_1", (dropFkErr) => {
                      if (dropFkErr) {
                        console.error('Error dropping old foreign key:', dropFkErr);
                      } else {
                        console.log('Old foreign key constraint dropped successfully');
                        
                        // Now we can safely drop the users table
                        db.query("DROP TABLE users", (dropErr) => {
                          if (dropErr) {
                            console.error('Error dropping users table:', dropErr);
                          } else {
                            console.log('Users table dropped successfully');
                          }
                        });
                      }
                    });
                  } else {
                    // No old constraint, just try to drop the table
                    db.query("DROP TABLE users", (dropErr) => {
                      if (dropErr) {
                        console.error('Error dropping users table:', dropErr);
                      } else {
                        console.log('Users table dropped successfully');
                      }
                    });
                  }
                }
              });
            }
          });
        }
      });
    }
  });

  // Enhanced members table with more fields
  const createMembersTable = `
    CREATE TABLE IF NOT EXISTS members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      full_name VARCHAR(100) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED,
      email VARCHAR(255),
      phone VARCHAR(20),
      join_date DATE NOT NULL,
      initial_deposit DECIMAL(10,2) DEFAULT 0.00,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      INDEX idx_members_admin (admin_id),
      INDEX idx_members_active (is_active)
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
      admin_id INT,
      member_id INT,
      date DATE NOT NULL,
      breakfast_cost DECIMAL(8,2) DEFAULT 0.00,
      lunch_cost DECIMAL(8,2) DEFAULT 0.00,
      dinner_cost DECIMAL(8,2) DEFAULT 0.00,
      total_cost DECIMAL(8,2) AS (breakfast_cost + lunch_cost + dinner_cost),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
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
      admin_id INT,
      member_id INT,
      amount DECIMAL(10,2) NOT NULL,
      description VARCHAR(255),
      deposit_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
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
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      INDEX idx_bazar_member (member_id),
      INDEX idx_bazar_date (date)
    )
  `;
  
  db.query(createBazarTable, (err) => {
    if (err) {
      console.error('Error creating bazar table:', err);
    } else {
      console.log('Bazar table ready');
    }
  });

  // Create meal_records table
  const createMealRecordsTable = `
    CREATE TABLE IF NOT EXISTS meal_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      member_id INT NOT NULL,
      member_name VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      breakfast_count INT DEFAULT 0,
      lunch_count INT DEFAULT 0,
      dinner_count INT DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE KEY unique_member_date (member_id, date),
      INDEX idx_meal_records_date (date),
      INDEX idx_meal_records_member (member_id)
    )
  `;
  
  db.query(createMealRecordsTable, (err) => {
    if (err) {
      console.error('Error creating meal_records table:', err);
    } else {
      console.log('Meal records table ready');
    }
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Test database connection
app.get('/api/test', (req, res) => {
  db.query('SELECT 1 as test', (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database connection failed', error: err.message });
    }
    res.json({ success: true, message: 'Database connection successful', result: results[0] });
  });
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
    
    // Check if admin exists (by email or username)
    const checkAdminQuery = 'SELECT * FROM admins WHERE email = ? OR username = ?';
    db.query(checkAdminQuery, [identifier, identifier], async (err, results) => {
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
          message: 'Admin not found',
          field: 'identifier'
        });
      }
      
      const admin = results[0];
      
      // Compare password
      const passwordMatch = await bcrypt.compare(password, admin.password_hash);
      
      if (!passwordMatch) {
        return res.status(400).json({ 
          success: false, 
          message: 'Incorrect password',
          field: 'password'
        });
      }
      
      // Login successful - update last_login timestamp
      const updateLoginQuery = 'UPDATE admins SET last_login = NOW() WHERE id = ?';
      db.query(updateLoginQuery, [admin.id], (updateErr) => {
        if (updateErr) {
          console.error('Error updating last_login:', updateErr);
        }
      });
      
      res.json({ 
        success: true, 
        message: 'Login successful!',
        admin: {
          id: admin.id,
          firstName: admin.first_name,
          lastName: admin.last_name,
          fullName: `${admin.first_name} ${admin.last_name}`,
          username: admin.username,
          email: admin.email,
          role: admin.role
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
    
    // Check if admin already exists
    const checkAdminQuery = 'SELECT * FROM admins WHERE email = ? OR username = ?';
    db.query(checkAdminQuery, [email, username], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      if (results.length > 0) {
        const existingAdmin = results[0];
        if (existingAdmin.email === email) {
          return res.status(400).json({ 
            success: false, 
            message: 'Email already registered' 
          });
        }
        if (existingAdmin.username === username) {
          return res.status(400).json({ 
            success: false, 
            message: 'Username already taken' 
          });
        }
      }
      
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Insert new admin
      const insertAdminQuery = 'INSERT INTO admins (first_name, last_name, email, username, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?)';
      db.query(insertAdminQuery, [firstName, lastName, email, username, phone, passwordHash], (err, results) => {
        if (err) {
          console.error('Error inserting admin:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error creating account' 
          });
        }
        
        res.json({ 
          success: true, 
          message: 'MealMate admin account created successfully!',
          adminId: results.insertId 
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
    
    // Check if admin exists
    const checkAdminQuery = 'SELECT * FROM admins WHERE email = ?';
    db.query(checkAdminQuery, [email], async (err, results) => {
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
          message: 'No admin account found with this email address',
          field: 'email'
        });
      }
      
      const admin = results[0];
      
      // In a real application, you would:
      // 1. Generate a secure reset token
      // 2. Store it in database with expiration time
      // 3. Send email with reset link
      
      // For demo purposes, we'll just simulate success
      console.log(`Password reset requested for admin: ${admin.email}`);
      
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
  const memberId = req.query.memberId;
  const adminId = req.query.adminId || 1;
  const today = new Date().toISOString().split('T')[0];
  
  let query, params;
  
  if (memberId) {
    // Get rate for specific member
    query = `
      SELECT 
        COALESCE(SUM(breakfast_cost + lunch_cost + dinner_cost), 0) as rate,
        COUNT(*) as mealCount
      FROM meal_reports mr
      LEFT JOIN members m ON mr.member_id = m.id
      WHERE mr.member_id = ? AND mr.date = ? AND m.admin_id = ?
    `;
    params = [memberId, today, adminId];
  } else {
    // Get average rate for all members of this admin
    query = `
      SELECT 
        COALESCE(AVG(breakfast_cost + lunch_cost + dinner_cost), 0) as rate,
        COUNT(*) as mealCount
      FROM meal_reports mr
      LEFT JOIN members m ON mr.member_id = m.id
      WHERE mr.date = ? AND m.admin_id = ?
    `;
    params = [today, adminId];
  }
  
  db.query(query, params, (err, results) => {
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
  const memberId = req.query.memberId;
  const adminId = req.query.adminId || 1;
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  let query, params;
  
  if (memberId) {
    // Get cost for specific member
    query = `
      SELECT 
        COALESCE(SUM(breakfast_cost + lunch_cost + dinner_cost), 0) as totalCost,
        COALESCE(SUM(CASE 
          WHEN DATE_FORMAT(date, '%Y-%m') = ? 
          THEN breakfast_cost + lunch_cost + dinner_cost 
          ELSE 0 END), 0) as monthlyTotal
      FROM meal_reports mr
      LEFT JOIN members m ON mr.member_id = m.id
      WHERE mr.member_id = ? AND m.admin_id = ?
    `;
    params = [currentMonth, memberId, adminId];
  } else {
    // Get total cost for all members of this admin
    query = `
      SELECT 
        COALESCE(SUM(breakfast_cost + lunch_cost + dinner_cost), 0) as totalCost,
        COALESCE(SUM(CASE 
          WHEN DATE_FORMAT(mr.date, '%Y-%m') = ? 
          THEN breakfast_cost + lunch_cost + dinner_cost 
          ELSE 0 END), 0) as monthlyTotal
      FROM meal_reports mr
      LEFT JOIN members m ON mr.member_id = m.id
      WHERE m.admin_id = ?
    `;
    params = [currentMonth, adminId];
  }
  
  db.query(query, params, (err, results) => {
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
  const memberId = req.query.memberId;
  const adminId = req.query.adminId || 1;
  
  let query, params;
  
  if (memberId) {
    // Get deposits for specific member
    query = `
      SELECT 
        COALESCE(SUM(d.amount), 0) as totalDeposit,
        (SELECT amount FROM deposits d2 
         LEFT JOIN members m2 ON d2.member_id = m2.id 
         WHERE d2.member_id = ? AND m2.admin_id = ? 
         ORDER BY d2.created_at DESC LIMIT 1) as lastDeposit
      FROM deposits d
      LEFT JOIN members m ON d.member_id = m.id
      WHERE d.member_id = ? AND m.admin_id = ?
    `;
    params = [memberId, adminId, memberId, adminId];
  } else {
    // Get total deposits for all members of this admin
    query = `
      SELECT 
        COALESCE(SUM(d.amount), 0) as totalDeposit,
        (SELECT amount FROM deposits d2 
         LEFT JOIN members m2 ON d2.member_id = m2.id 
         WHERE m2.admin_id = ? 
         ORDER BY d2.created_at DESC LIMIT 1) as lastDeposit
      FROM deposits d
      LEFT JOIN members m ON d.member_id = m.id
      WHERE m.admin_id = ?
    `;
    params = [adminId, adminId];
  }
  
  db.query(query, params, (err, results) => {
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
  const memberId = req.query.memberId;
  const adminId = req.query.adminId || 1;
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  let query, params;
  
  if (memberId) {
    // Get meals for specific member
    query = `
      SELECT 
        COUNT(*) as totalMeals,
        SUM(CASE 
          WHEN DATE_FORMAT(mr.date, '%Y-%m') = ? 
          THEN 1 ELSE 0 END) as monthlyMeals
      FROM meal_reports mr
      LEFT JOIN members m ON mr.member_id = m.id
      WHERE mr.member_id = ? AND m.admin_id = ? AND (breakfast_cost > 0 OR lunch_cost > 0 OR dinner_cost > 0)
    `;
    params = [currentMonth, memberId, adminId];
  } else {
    // Get total meals for all members of this admin
    query = `
      SELECT 
        COUNT(*) as totalMeals,
        SUM(CASE 
          WHEN DATE_FORMAT(mr.date, '%Y-%m') = ? 
          THEN 1 ELSE 0 END) as monthlyMeals
      FROM meal_reports mr
      LEFT JOIN members m ON mr.member_id = m.id
      WHERE m.admin_id = ? AND (breakfast_cost > 0 OR lunch_cost > 0 OR dinner_cost > 0)
    `;
    params = [currentMonth, adminId];
  }
  
  db.query(query, params, (err, results) => {
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
app.get('/api/admin-profile', (req, res) => {
  const adminId = req.query.adminId || 1; // In a real app, get from session
  
  const query = 'SELECT id, first_name, last_name, CONCAT(first_name, " ", last_name) as fullname, email, username, phone, role, created_at FROM admins WHERE id = ?';
  db.query(query, [adminId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json(results[0]);
  });
});

app.put('/api/update-admin-profile', async (req, res) => {
  try {
    const adminId = req.query.adminId || 1; // In a real app, get from session
    const { fullname, username, email, phone } = req.body;
    
    // Validation
    if (!fullname || !email || !username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, username and email are required' 
      });
    }
    
    // Check if email or username is already taken by another admin
    const checkQuery = 'SELECT id FROM admins WHERE (email = ? OR username = ?) AND id != ?';
    db.query(checkQuery, [email, username, adminId], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (results.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email or username is already taken by another admin' 
        });
      }
      
      // Split fullname into first_name and last_name
      const nameParts = fullname.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Update admin profile
      const updateQuery = 'UPDATE admins SET first_name = ?, last_name = ?, username = ?, email = ?, phone = ? WHERE id = ?';
      db.query(updateQuery, [firstName, lastName, username, email, phone, adminId], (err, results) => {
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

app.put('/api/change-admin-password', async (req, res) => {
  try {
    const adminId = req.query.adminId || 1; // In a real app, get from session
    const { currentPassword, newPassword } = req.body;
    
    console.log('Password change request for admin ID:', adminId);
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }
    
    // Get current admin
    const getAdminQuery = 'SELECT password_hash FROM admins WHERE id = ?';
    db.query(getAdminQuery, [adminId], async (err, results) => {
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
          message: 'Admin not found' 
        });
      }
      
      const admin = results[0];
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password_hash);
      
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
      const updateQuery = 'UPDATE admins SET password_hash = ? WHERE id = ?';
      db.query(updateQuery, [newPasswordHash, adminId], (err, results) => {
        if (err) {
          console.error('Password update error:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to change password' 
          });
        }
        
        console.log('Password updated successfully for admin ID:', adminId);
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

// Delete Admin Account API endpoint
app.delete('/api/delete-admin-account', async (req, res) => {
  try {
    const adminId = req.query.adminId || 1; // In a real app, get from session
    const { password } = req.body;
    
    console.log('Account deletion request for admin ID:', adminId);
    
    // Validation
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required for account deletion' 
      });
    }
    
    // Get current admin and verify password
    const getAdminQuery = 'SELECT password_hash FROM admins WHERE id = ?';
    db.query(getAdminQuery, [adminId], async (err, results) => {
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
          message: 'Admin not found' 
        });
      }
      
      const admin = results[0];
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
      
      if (!isPasswordValid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Incorrect password' 
        });
      }
      
      // Delete admin account (CASCADE will handle related records)
      const deleteQuery = 'DELETE FROM admins WHERE id = ?';
      db.query(deleteQuery, [adminId], (deleteErr) => {
        if (deleteErr) {
          console.error('Account deletion error:', deleteErr);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to delete account' 
          });
        }
        
        console.log('Account deleted successfully for admin ID:', adminId);
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

// Get all members for an admin (using members table for bazar functionality)
app.get('/api/members', (req, res) => {
  const adminId = req.query.adminId || 1;
  
  // Filter members by admin_id to ensure each admin sees only their members
  const query = `
    SELECT 
      id, 
      full_name,
      full_name as name,
      email,
      join_date,
      created_at
    FROM members 
    WHERE is_active = TRUE AND admin_id = ?
    ORDER BY full_name ASC
  `;
  
  db.query(query, [adminId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json([]);
    }
    
    res.json(results);
  });
});

// Add new member
app.post('/api/members', async (req, res) => {
  try {
    const adminId = req.query.adminId || 1;
    const { name, joinDate, adminPassword } = req.body;
    
    // Validation
    if (!name || !joinDate || !adminPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, join date, and password are required' 
      });
    }
    
    // Verify admin password
    const getUserQuery = 'SELECT password_hash FROM admins WHERE id = ?';
    db.query(getUserQuery, [adminId], async (err, results) => {
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
          message: 'Admin not found' 
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
        INSERT INTO members (admin_id, first_name, last_name, join_date) 
        VALUES (?, ?, ?, ?)
      `;
      
      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      db.query(insertMemberQuery, [adminId, firstName, lastName, joinDate], (insertErr, insertResults) => {
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
    const adminId = req.query.adminId || 1;
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
    const getUserQuery = 'SELECT password_hash FROM admins WHERE id = ?';
    db.query(getUserQuery, [adminId], async (err, results) => {
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
          message: 'Admin not found' 
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
      
      // Check if member exists and belongs to this admin
      const checkMemberQuery = 'SELECT full_name FROM members WHERE id = ? AND admin_id = ?';
      db.query(checkMemberQuery, [memberId, adminId], (checkErr, checkResults) => {
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
        
        const memberName = checkResults[0].full_name;
        
        // Delete member permanently
        const deleteMemberQuery = 'DELETE FROM members WHERE id = ? AND admin_id = ?';
        db.query(deleteMemberQuery, [memberId, adminId], (deleteErr) => {
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

// Update member
app.put('/api/members/:memberId', async (req, res) => {
  try {
    const adminId = req.query.adminId || 1;
    const memberId = req.params.memberId;
    const { name, joinDate, adminPassword } = req.body;
    
    console.log('Update member request:', { adminId, memberId, name, joinDate, hasPassword: !!adminPassword });
    
    // Validation
    if (!name || !joinDate || !adminPassword) {
      console.log('Validation failed:', { name: !!name, joinDate: !!joinDate, adminPassword: !!adminPassword });
      return res.status(400).json({ 
        success: false, 
        message: 'Name, join date, and password are required' 
      });
    }
    
    // Verify admin password
    const getUserQuery = 'SELECT password_hash FROM admins WHERE id = ?';
    console.log('Checking admin:', adminId);
    db.query(getUserQuery, [adminId], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      console.log('Admin query results:', results.length);
      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Admin not found' 
        });
      }
      
      const user = results[0];
      const passwordMatch = await bcrypt.compare(adminPassword, user.password_hash);
      console.log('Password match:', passwordMatch);
      
      if (!passwordMatch) {
        return res.status(400).json({ 
          success: false, 
          message: 'Incorrect password' 
        });
      }
      
      // Check if member exists and belongs to this admin
      const checkMemberQuery = 'SELECT full_name FROM members WHERE id = ? AND admin_id = ?';
      console.log('Checking member:', { memberId, adminId });
      db.query(checkMemberQuery, [memberId, adminId], (checkErr, checkResults) => {
        if (checkErr) {
          console.error('Database error:', checkErr);
          return res.status(500).json({ 
            success: false, 
            message: 'Database error' 
          });
        }
        
        console.log('Member check results:', checkResults.length);
        if (checkResults.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Member not found' 
          });
        }
        
        // Update member
        const updateMemberQuery = 'UPDATE members SET first_name = ?, last_name = ?, join_date = ? WHERE id = ? AND admin_id = ?';
        
        // Split name into first and last name
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        console.log('Updating member:', { firstName, lastName, joinDate, memberId, adminId });
        db.query(updateMemberQuery, [firstName, lastName, joinDate, memberId, adminId], (updateErr, updateResults) => {
          if (updateErr) {
            console.error('Error updating member:', updateErr);
            return res.status(500).json({ 
              success: false, 
              message: 'Error updating member' 
            });
          }
          
          console.log('Update results:', updateResults);
          res.json({ 
            success: true, 
            message: `${name} updated successfully` 
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
  const adminId = req.query.adminId || 1;
  
  const query = `
    SELECT d.*, m.full_name as member_name 
    FROM deposits d 
    LEFT JOIN members m ON d.member_id = m.id 
    WHERE d.admin_id = ?
    ORDER BY d.deposit_date DESC, d.created_at DESC
  `;
  
  db.query(query, [adminId], (err, results) => {
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
      admin_id: deposit.admin_id,
      created_at: deposit.created_at
    }));
    
    res.json({
      success: true,
      deposits: deposits
    });
  });
});

// Add new deposit
app.post('/api/deposits', (req, res) => {
  const { amount, date, description, member_id, admin_id } = req.body;
  
  // Validate required fields
  if (!amount || !date || !admin_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Amount, date, and admin ID are required' 
    });
  }
  
  if (amount <= 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Amount must be greater than 0' 
    });
  }
  
  const query = `
    INSERT INTO deposits (admin_id, member_id, amount, description, deposit_date) 
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.query(query, [admin_id, member_id || null, amount, description || null, date], (err, result) => {
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

// Get member deposits summary
app.get('/api/deposits/member/:memberId/summary', (req, res) => {
  const memberId = req.params.memberId;
  
  const query = `
    SELECT 
      COALESCE(SUM(amount), 0) as total_balance,
      COALESCE(SUM(CASE WHEN MONTH(deposit_date) = MONTH(CURRENT_DATE()) AND YEAR(deposit_date) = YEAR(CURRENT_DATE()) THEN amount ELSE 0 END), 0) as this_month,
      COALESCE(MAX(amount), 0) as last_deposit,
      COALESCE(AVG(amount), 0) as average_deposit,
      COUNT(*) as total_deposits
    FROM deposits 
    WHERE member_id = ?
  `;
  
  db.query(query, [memberId], (err, results) => {
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

// Get all bazar records with optional filters
app.get('/api/bazar', (req, res) => {
  const { month, year, admin_id, member_id, search, min_amount, max_amount, sort } = req.query;
  const adminId = admin_id || req.query.adminId || 1;
  
  let query = `
    SELECT 
      b.*,
      m.full_name as member_name
    FROM bazar b
    LEFT JOIN members m ON b.member_id = m.id
    WHERE m.admin_id = ?
  `;
  const params = [adminId];
  
  if (month && year) {
    query += ' AND MONTH(b.date) = ? AND YEAR(b.date) = ?';
    params.push(month, year);
  }
  
  if (member_id) {
    query += ' AND b.member_id = ?';
    params.push(member_id);
  }
  
  if (search) {
    query += ' AND (m.full_name LIKE ? OR b.description LIKE ? OR b.items LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (min_amount) {
    query += ' AND b.total_cost >= ?';
    params.push(parseFloat(min_amount));
  }
  
  if (max_amount) {
    query += ' AND b.total_cost <= ?';
    params.push(parseFloat(max_amount));
  }
  
  // Handle sorting
  const sortOptions = {
    'date_desc': 'b.date DESC, b.created_at DESC',
    'date_asc': 'b.date ASC, b.created_at ASC',
    'amount_desc': 'b.total_cost DESC',
    'amount_asc': 'b.total_cost ASC',
    'member_name': 'm.full_name ASC'
  };
  
  const orderBy = sortOptions[sort] || 'b.date DESC, b.created_at DESC';
  query += ` ORDER BY ${orderBy}`;
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching bazar records:', err);
      return res.status(500).json([]);
    }
    
    res.json(results);
  });
});

// Add new bazar record
app.post('/api/bazar', (req, res) => {
  const { member_id, member_name, total_cost, date, description, items } = req.body;
  const adminId = req.body.admin_id || req.query.adminId || 1;
  
  if (!member_id || !member_name || !total_cost || !date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Member ID, name, total cost, and date are required' 
    });
  }

  // First verify that the member belongs to this admin
  const memberCheckQuery = 'SELECT id FROM members WHERE id = ? AND admin_id = ?';
  
  db.query(memberCheckQuery, [member_id, adminId], (err, memberResult) => {
    if (err) {
      console.error('Error verifying member:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error verifying member' 
      });
    }
    
    if (memberResult.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Member not found or access denied' 
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
});

// Update bazar record
app.put('/api/bazar/:id', (req, res) => {
  const bazarId = req.params.id;
  const { member_id, member_name, total_cost, date, description, items } = req.body;
  const adminId = req.body.admin_id || req.query.adminId || 1;
  
  if (!member_id || !member_name || !total_cost || !date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Member ID, name, total cost, and date are required' 
    });
  }

  // First verify that the bazar record belongs to a member of this admin
  const authCheckQuery = `
    SELECT b.id 
    FROM bazar b
    LEFT JOIN members m ON b.member_id = m.id
    WHERE b.id = ? AND m.admin_id = ?
  `;
  
  db.query(authCheckQuery, [bazarId, adminId], (err, authResult) => {
    if (err) {
      console.error('Error verifying bazar record access:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error verifying access' 
      });
    }
    
    if (authResult.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bazar record not found or access denied' 
      });
    }

    // Also verify that the new member_id belongs to this admin
    const memberCheckQuery = 'SELECT id FROM members WHERE id = ? AND admin_id = ?';
    
    db.query(memberCheckQuery, [member_id, adminId], (err, memberResult) => {
      if (err) {
        console.error('Error verifying member:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error verifying member' 
        });
      }
      
      if (memberResult.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message: 'Member not found or access denied' 
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
  });
});

// Delete bazar record
app.delete('/api/bazar/:id', (req, res) => {
  const bazarId = req.params.id;
  const adminId = req.query.adminId || 1;
  
  // First verify that the bazar record belongs to a member of this admin
  const authCheckQuery = `
    SELECT b.id 
    FROM bazar b
    LEFT JOIN members m ON b.member_id = m.id
    WHERE b.id = ? AND m.admin_id = ?
  `;
  
  db.query(authCheckQuery, [bazarId, adminId], (err, authResult) => {
    if (err) {
      console.error('Error verifying bazar record access:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error verifying access' 
      });
    }
    
    if (authResult.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bazar record not found or access denied' 
      });
    }
    
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
});

// Get bazar summary statistics
app.get('/api/bazar/summary', (req, res) => {
  const { month, year, adminId } = req.query;
  const currentAdminId = adminId || 1;
  
  let query = `
    SELECT 
      COALESCE(SUM(b.total_cost), 0) as total_spent,
      COALESCE(COUNT(*), 0) as total_records,
      COALESCE(AVG(b.total_cost), 0) as average_cost,
      COALESCE(MAX(b.total_cost), 0) as highest_cost,
      COALESCE(MIN(b.total_cost), 0) as lowest_cost
    FROM bazar b
    LEFT JOIN members m ON b.member_id = m.id
    WHERE m.admin_id = ?
  `;
  const params = [currentAdminId];
  
  if (month && year) {
    query += ' AND MONTH(b.date) = ? AND YEAR(b.date) = ?';
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
  const { adminId } = req.query;
  const currentAdminId = adminId || 1;
  
  const query = `
    SELECT 
      YEAR(b.date) as year,
      MONTH(b.date) as month,
      MONTHNAME(b.date) as month_name,
      COUNT(*) as total_records,
      SUM(b.total_cost) as total_spent,
      AVG(b.total_cost) as average_cost
    FROM bazar b
    LEFT JOIN members m ON b.member_id = m.id
    WHERE m.admin_id = ?
    GROUP BY YEAR(b.date), MONTH(b.date)
    ORDER BY YEAR(b.date) DESC, MONTH(b.date) DESC
    LIMIT 12
  `;
  
  db.query(query, [currentAdminId], (err, results) => {
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

// ==================== MEAL MANAGEMENT API ENDPOINTS ====================

// Get meal statistics
app.get('/api/meals/stats', (req, res) => {
  const { adminId } = req.query;
  const currentAdminId = adminId || 1;
  
  const queries = [
    // Total meals query for this admin's members
    `SELECT COALESCE(SUM(mr.breakfast_count + mr.lunch_count + mr.dinner_count), 0) as total_meals 
     FROM meal_records mr 
     LEFT JOIN members m ON mr.member_id = m.id 
     WHERE m.admin_id = ?`,
    
    // Total bazar cost query for this admin's members
    `SELECT COALESCE(SUM(b.total_cost), 0) as total_bazar_cost 
     FROM bazar b 
     LEFT JOIN members m ON b.member_id = m.id 
     WHERE m.admin_id = ?`,
    
    // Today's meals query for this admin's members
    `SELECT COALESCE(SUM(mr.breakfast_count + mr.lunch_count + mr.dinner_count), 0) as today_meals 
     FROM meal_records mr 
     LEFT JOIN members m ON mr.member_id = m.id 
     WHERE m.admin_id = ? AND mr.date = CURDATE()`
  ];
  
  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.query(query, [currentAdminId], (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    });
  }))
  .then(results => {
    res.json({
      total_meals: results[0].total_meals,
      total_bazar_cost: results[1].total_bazar_cost,
      today_meals: results[2].today_meals
    });
  })
  .catch(err => {
    console.error('Error fetching meal stats:', err);
    res.status(500).json({
      total_meals: 0,
      total_bazar_cost: 0,
      today_meals: 0
    });
  });
});

// Get today's meal statistics with detailed breakdown
app.get('/api/meals/today-stats', (req, res) => {
  const { adminId, date } = req.query;
  const currentAdminId = adminId || 1;
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const queries = [
    // Today's total meals breakdown
    `SELECT 
       COALESCE(SUM(mr.breakfast_count), 0) as total_breakfast,
       COALESCE(SUM(mr.lunch_count), 0) as total_lunch,
       COALESCE(SUM(mr.dinner_count), 0) as total_dinner,
       COALESCE(SUM(mr.breakfast_count + mr.lunch_count + mr.dinner_count), 0) as total_meals,
       COUNT(DISTINCT mr.member_id) as total_members_eating
     FROM meal_records mr 
     LEFT JOIN members m ON mr.member_id = m.id 
     WHERE m.admin_id = ? AND mr.date = ?`,
    
    // Today's meal rate calculation
    `SELECT 
       CASE 
         WHEN SUM(mr.breakfast_count + mr.lunch_count + mr.dinner_count) > 0 
         THEN COALESCE(SUM(b.total_cost) / SUM(mr.breakfast_count + mr.lunch_count + mr.dinner_count), 0)
         ELSE 0 
       END as meal_rate,
       COALESCE(SUM(b.total_cost), 0) as total_bazar_cost_today
     FROM meal_records mr 
     LEFT JOIN members m ON mr.member_id = m.id 
     LEFT JOIN bazar b ON b.member_id = m.id AND b.date = ?
     WHERE m.admin_id = ? AND mr.date = ?`
  ];
  
  Promise.all([
    new Promise((resolve, reject) => {
      db.query(queries[0], [currentAdminId, targetDate], (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    }),
    new Promise((resolve, reject) => {
      db.query(queries[1], [targetDate, currentAdminId, targetDate], (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    })
  ])
  .then(results => {
    const mealStats = results[0];
    const costStats = results[1];
    
    res.json({
      date: targetDate,
      breakfast_count: mealStats.total_breakfast,
      lunch_count: mealStats.total_lunch,
      dinner_count: mealStats.total_dinner,
      total_meals: mealStats.total_meals,
      total_members_eating: mealStats.total_members_eating,
      meal_rate: parseFloat(costStats.meal_rate || 0).toFixed(2),
      total_bazar_cost: parseFloat(costStats.total_bazar_cost_today || 0).toFixed(2)
    });
  })
  .catch(err => {
    console.error('Error fetching today\'s meal stats:', err);
    res.status(500).json({
      date: targetDate,
      breakfast_count: 0,
      lunch_count: 0,
      dinner_count: 0,
      total_meals: 0,
      total_members_eating: 0,
      meal_rate: '0.00',
      total_bazar_cost: '0.00'
    });
  });
});

// Get all meals
app.get('/api/meals/all', (req, res) => {
  const { adminId } = req.query;
  const currentAdminId = adminId || 1;
  
  const query = `
    SELECT 
      m.*,
      mem.full_name as member_name
    FROM meal_records m
    LEFT JOIN members mem ON m.member_id = mem.id
    WHERE mem.admin_id = ?
    ORDER BY m.date DESC, mem.full_name ASC
  `;
  
  db.query(query, [currentAdminId], (err, results) => {
    if (err) {
      console.error('Error fetching all meals:', err);
      return res.status(500).json([]);
    }
    
    res.json(results);
  });
});

// Get today's meals
app.get('/api/meals/today', (req, res) => {
  const { adminId, date } = req.query;
  const currentAdminId = adminId || 1;
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const query = `
    SELECT 
      m.*,
      mem.full_name as member_name
    FROM meal_records m
    LEFT JOIN members mem ON m.member_id = mem.id
    WHERE mem.admin_id = ? AND m.date = ?
    ORDER BY mem.full_name ASC
  `;
  
  db.query(query, [currentAdminId, targetDate], (err, results) => {
    if (err) {
      console.error('Error fetching today\'s meals:', err);
      return res.status(500).json([]);
    }
    
    res.json(results);
  });
});

// Get member summary
app.get('/api/meals/member-summary', (req, res) => {
  const { month, year, adminId } = req.query;
  const currentAdminId = adminId || 1;
  const currentYear = year || new Date().getFullYear();
  const currentMonth = month || (new Date().getMonth() + 1);
  
  let dateFilter = '';
  const params = [currentAdminId];
  
  if (month) {
    dateFilter = 'AND MONTH(mr.date) = ? AND YEAR(mr.date) = ?';
    params.push(currentMonth, currentYear);
  }
  
  const query = `
    SELECT 
      m.id as member_id,
      m.full_name as member_name,
      COALESCE(SUM(mr.breakfast_count + mr.lunch_count + mr.dinner_count), 0) as total_meals,
      COALESCE(SUM(d.amount), 0) as total_deposits
    FROM members m
    LEFT JOIN meal_records mr ON m.id = mr.member_id ${dateFilter}
    LEFT JOIN deposits d ON m.id = d.member_id
    WHERE m.admin_id = ?
    GROUP BY m.id, m.full_name
    HAVING total_meals > 0 OR total_deposits > 0
    ORDER BY m.full_name ASC
  `;
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching member summary:', err);
      return res.status(500).json([]);
    }
    
    res.json(results);
  });
});

// Get members who haven't had meals today
app.get('/api/meals/members-without-meals-today', (req, res) => {
  const { adminId, date } = req.query;
  const currentAdminId = adminId || 1;
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const query = `
    SELECT 
      m.id,
      m.full_name as member_name,
      m.email,
      m.phone,
      m.join_date
    FROM members m
    LEFT JOIN meal_records mr ON m.id = mr.member_id AND mr.date = ?
    WHERE m.admin_id = ? AND m.is_active = TRUE AND mr.id IS NULL
    ORDER BY m.full_name ASC
  `;
  
  db.query(query, [targetDate, currentAdminId], (err, results) => {
    if (err) {
      console.error('Error fetching members without meals today:', err);
      return res.status(500).json([]);
    }
    
    res.json(results);
  });
});

// Get meal summary for date range
app.get('/api/meals/date-range-summary', (req, res) => {
  const { adminId, startDate, endDate } = req.query;
  const currentAdminId = adminId || 1;
  
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Start date and end date are required'
    });
  }
  
  const query = `
    SELECT 
      mr.date,
      SUM(mr.breakfast_count) as total_breakfast,
      SUM(mr.lunch_count) as total_lunch,
      SUM(mr.dinner_count) as total_dinner,
      SUM(mr.breakfast_count + mr.lunch_count + mr.dinner_count) as total_meals,
      COUNT(DISTINCT mr.member_id) as members_eating,
      COALESCE(SUM(b.total_cost), 0) as bazar_cost
    FROM meal_records mr
    LEFT JOIN members m ON mr.member_id = m.id
    LEFT JOIN bazar b ON b.member_id = m.id AND b.date = mr.date
    WHERE m.admin_id = ? AND mr.date BETWEEN ? AND ?
    GROUP BY mr.date
    ORDER BY mr.date DESC
  `;
  
  db.query(query, [currentAdminId, startDate, endDate], (err, results) => {
    if (err) {
      console.error('Error fetching date range meal summary:', err);
      return res.status(500).json([]);
    }
    
    // Calculate meal rates for each day
    const summaryWithRates = results.map(day => ({
      ...day,
      meal_rate: day.total_meals > 0 ? (day.bazar_cost / day.total_meals).toFixed(2) : '0.00',
      bazar_cost: parseFloat(day.bazar_cost).toFixed(2)
    }));
    
    res.json(summaryWithRates);
  });
});

// Bulk add/update meals for multiple members on a specific date
app.post('/api/meals/bulk', (req, res) => {
  const { meals, date } = req.body;
  const { adminId } = req.query;
  const currentAdminId = adminId || 1;
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  if (!meals || !Array.isArray(meals) || meals.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Meals array is required and cannot be empty'
    });
  }
  
  // Validate that all members belong to this admin
  const memberIds = meals.map(meal => meal.member_id).filter(id => id);
  
  if (memberIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one valid member ID is required'
    });
  }
  
  const checkMembersQuery = `
    SELECT id FROM members 
    WHERE id IN (${memberIds.map(() => '?').join(',')}) AND admin_id = ?
  `;
  
  db.query(checkMembersQuery, [...memberIds, currentAdminId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking members:', checkErr);
      return res.status(500).json({
        success: false,
        message: 'Error validating members'
      });
    }
    
    if (checkResults.length !== memberIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some members do not belong to this admin or do not exist'
      });
    }
    
    // Prepare bulk insert/update query
    const values = [];
    const placeholders = [];
    
    meals.forEach(meal => {
      if (meal.member_id && meal.member_name) {
        values.push(
          meal.member_id,
          meal.member_name,
          targetDate,
          meal.breakfast_count || 0,
          meal.lunch_count || 0,
          meal.dinner_count || 0,
          meal.notes || null
        );
        placeholders.push('(?, ?, ?, ?, ?, ?, ?)');
      }
    });
    
    if (placeholders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid meal records to process'
      });
    }
    
    const bulkQuery = `
      INSERT INTO meal_records (member_id, member_name, date, breakfast_count, lunch_count, dinner_count, notes)
      VALUES ${placeholders.join(', ')}
      ON DUPLICATE KEY UPDATE
      breakfast_count = VALUES(breakfast_count),
      lunch_count = VALUES(lunch_count),
      dinner_count = VALUES(dinner_count),
      notes = VALUES(notes),
      updated_at = CURRENT_TIMESTAMP
    `;
    
    db.query(bulkQuery, values, (bulkErr, bulkResult) => {
      if (bulkErr) {
        console.error('Error bulk inserting meal records:', bulkErr);
        return res.status(500).json({
          success: false,
          message: 'Error saving meal records'
        });
      }
      
      res.json({
        success: true,
        message: `Successfully processed ${meals.length} meal records for ${targetDate}`,
        affectedRows: bulkResult.affectedRows,
        insertedRows: bulkResult.insertId ? 1 : 0,
        updatedRows: bulkResult.changedRows || 0
      });
    });
  });
});

// Add new meal record
app.post('/api/meals', (req, res) => {
  const { member_id, member_name, date, breakfast_count, lunch_count, dinner_count, notes } = req.body;
  const { adminId } = req.query;
  const currentAdminId = adminId || 1;
  
  if (!member_id || !member_name || !date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Member ID, name, and date are required' 
    });
  }
  
  if ((breakfast_count || 0) === 0 && (lunch_count || 0) === 0 && (dinner_count || 0) === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'At least one meal type must be selected' 
    });
  }
  
  // First verify that the member belongs to this admin
  const checkMemberQuery = 'SELECT id FROM members WHERE id = ? AND admin_id = ?';
  db.query(checkMemberQuery, [member_id, currentAdminId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking member:', checkErr);
      return res.status(500).json({ 
        success: false, 
        message: 'Error validating member' 
      });
    }
    
    if (checkResults.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Member not found or does not belong to this admin' 
      });
    }
    
    const query = `
      INSERT INTO meal_records (member_id, member_name, date, breakfast_count, lunch_count, dinner_count, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      breakfast_count = VALUES(breakfast_count),
      lunch_count = VALUES(lunch_count),
      dinner_count = VALUES(dinner_count),
      notes = VALUES(notes),
      updated_at = CURRENT_TIMESTAMP
    `;
    
    db.query(query, [
      member_id, 
      member_name, 
      date, 
      breakfast_count || 0, 
      lunch_count || 0, 
      dinner_count || 0, 
      notes
    ], (err, result) => {
      if (err) {
        console.error('Error adding meal record:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error adding meal record' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Meal record saved successfully',
        mealId: result.insertId
      });
    });
  });
});

// Update meal record
app.put('/api/meals/:id', (req, res) => {
  const mealId = req.params.id;
  const { member_id, member_name, date, breakfast_count, lunch_count, dinner_count, notes } = req.body;
  const { adminId } = req.query;
  const currentAdminId = adminId || 1;
  
  if (!member_id || !member_name || !date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Member ID, name, and date are required' 
    });
  }
  
  if ((breakfast_count || 0) === 0 && (lunch_count || 0) === 0 && (dinner_count || 0) === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'At least one meal type must be selected' 
    });
  }
  
  // First verify that the meal record exists and the member belongs to this admin
  const checkQuery = `
    SELECT mr.id FROM meal_records mr
    LEFT JOIN members m ON mr.member_id = m.id
    WHERE mr.id = ? AND m.admin_id = ?
  `;
  
  db.query(checkQuery, [mealId, currentAdminId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking meal record:', checkErr);
      return res.status(500).json({ 
        success: false, 
        message: 'Error validating meal record' 
      });
    }
    
    if (checkResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Meal record not found or access denied' 
      });
    }
    
    const query = `
      UPDATE meal_records 
      SET member_id = ?, member_name = ?, date = ?, breakfast_count = ?, lunch_count = ?, dinner_count = ?, notes = ?
      WHERE id = ?
    `;
    
    db.query(query, [
      member_id, 
      member_name, 
      date, 
      breakfast_count || 0, 
      lunch_count || 0, 
      dinner_count || 0, 
      notes,
      mealId
    ], (err, result) => {
      if (err) {
        console.error('Error updating meal record:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error updating meal record' 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Meal record not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Meal record updated successfully' 
      });
    });
  });
});

// Delete meal record
app.delete('/api/meals/:id', (req, res) => {
  const mealId = req.params.id;
  const { adminId } = req.query;
  const currentAdminId = adminId || 1;
  
  // First verify that the meal record exists and the member belongs to this admin
  const checkQuery = `
    SELECT mr.id FROM meal_records mr
    LEFT JOIN members m ON mr.member_id = m.id
    WHERE mr.id = ? AND m.admin_id = ?
  `;
  
  db.query(checkQuery, [mealId, currentAdminId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error checking meal record:', checkErr);
      return res.status(500).json({ 
        success: false, 
        message: 'Error validating meal record' 
      });
    }
    
    if (checkResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Meal record not found or access denied' 
      });
    }
    
    db.query('DELETE FROM meal_records WHERE id = ?', [mealId], (err, result) => {
      if (err) {
        console.error('Error deleting meal record:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error deleting meal record' 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Meal record not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Meal record deleted successfully' 
      });
    });
  });
});

// Routes for new pages
app.get('/meal-management', (req, res) => {
  res.sendFile(path.join(__dirname, 'meal-management.html'));
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
