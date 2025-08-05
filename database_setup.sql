-- Database setup for MealMate - Mess Management System
-- Run these commands in your MySQL client

-- Create database
CREATE DATABASE IF NOT EXISTS signup_db;

-- Use the database
USE signup_db;

-- Create users table for MealMate
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Optional: Create indexes for faster lookups
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_username ON users(username);

-- Show table structure
DESCRIBE users;
