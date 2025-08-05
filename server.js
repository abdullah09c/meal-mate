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
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'sign-up.html'));
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'forgot-password.html'));
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
      
      // Login successful
      res.json({ 
        success: true, 
        message: 'Login successful!',
        user: {
          id: user.id,
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
