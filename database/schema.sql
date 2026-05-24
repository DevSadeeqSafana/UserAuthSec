-- User-Aware Authentication Security System
-- MySQL Database Schema
-- Created: 2026-01-30

-- Create database
CREATE DATABASE IF NOT EXISTS uaauthsec CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE uaauthsec;

-- ============================================
-- Table: users
-- Stores user account information
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('user', 'admin') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    failed_login_attempts INT DEFAULT 0,
    last_failed_login DATETIME NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255) NULL,
    vault_password_hash VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: devices
-- Stores user device information for fingerprinting
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255) NULL,
    browser VARCHAR(100) NULL,
    os VARCHAR(100) NULL,
    user_agent TEXT NULL,
    screen_resolution VARCHAR(50) NULL,
    timezone VARCHAR(100) NULL,
    is_trusted BOOLEAN DEFAULT FALSE,
    last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_device (user_id, device_fingerprint),
    INDEX idx_fingerprint (device_fingerprint),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: login_attempts
-- Logs all login attempts with risk scoring
-- ============================================
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    device_id INT NULL,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    country VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    risk_score INT DEFAULT 0,
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'LOW',
    status ENUM('success', 'failed', 'blocked', 'mfa_required') NOT NULL,
    failure_reason VARCHAR(255) NULL,
    mfa_required BOOLEAN DEFAULT FALSE,
    mfa_verified BOOLEAN DEFAULT FALSE,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_status (status),
    INDEX idx_risk_level (risk_level),
    INDEX idx_attempted_at (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: sessions
-- Stores active user sessions
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id INT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255) UNIQUE NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at DATETIME NOT NULL,
    metadata JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
    INDEX idx_token_hash (token_hash),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================
-- Table: mfa_tokens
-- Stores MFA tokens (OTP, TOTP)
-- ============================================
CREATE TABLE IF NOT EXISTS mfa_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(10) NOT NULL,
    type ENUM('email_otp', 'sms_otp', 'totp') NOT NULL,
    purpose ENUM('login', 'password_reset', 'email_verification') DEFAULT 'login',
    verified BOOLEAN DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_token (user_id, token),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: admin_logs
-- Logs administrative actions
-- ============================================
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NULL,
    action VARCHAR(255) NOT NULL,
    target_user_id INT NULL,
    target_type VARCHAR(100) NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_admin_id (admin_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: password_resets
-- Manages password reset tokens
-- ============================================
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Insert default admin user
-- Password: Admin@123456 (hashed with bcrypt)
-- ============================================
INSERT INTO users (email, password_hash, full_name, role, is_active, mfa_enabled) 
VALUES (
    'admin@uaauthsec.com',
    '$2a$10$YourHashedPasswordHere',  -- This will be generated properly in the app
    'System Administrator',
    'admin',
    TRUE,
    FALSE
) ON DUPLICATE KEY UPDATE email=email;

-- = ============================================
-- Table: vault_items
-- Stores sensitive encrypted information
-- ============================================
CREATE TABLE IF NOT EXISTS vault_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_encrypted TEXT NULL,
    file_name VARCHAR(255) NULL,
    original_name VARCHAR(255) NULL,
    mime_type VARCHAR(100) NULL,
    file_size INT NULL,
    category ENUM('note', 'password', 'document', 'file', 'other') DEFAULT 'note',
    last_accessed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Create views for analytics
-- ============================================

-- View: Recent login attempts
CREATE OR REPLACE VIEW recent_login_attempts AS
SELECT 
    la.id,
    la.email,
    u.full_name,
    la.ip_address,
    la.country,
    la.city,
    la.risk_score,
    la.risk_level,
    la.status,
    la.attempted_at
FROM login_attempts la
LEFT JOIN users u ON la.user_id = u.id
ORDER BY la.attempted_at DESC
LIMIT 100;

-- View: User statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.is_active,
    u.mfa_enabled,
    COUNT(DISTINCT d.id) as device_count,
    COUNT(DISTINCT s.id) as active_sessions,
    (SELECT COUNT(*) FROM login_attempts WHERE user_id = u.id AND status = 'success') as successful_logins,
    (SELECT COUNT(*) FROM login_attempts WHERE user_id = u.id AND status = 'failed') as failed_logins,
    u.created_at
FROM users u
LEFT JOIN devices d ON u.id = d.user_id
LEFT JOIN sessions s ON u.id = s.user_id AND s.is_active = TRUE AND s.expires_at > NOW()
GROUP BY u.id;

-- ============================================
-- Indexes for performance optimization
-- ============================================

-- Composite indexes for common queries
CREATE INDEX idx_login_user_status ON login_attempts(user_id, status, attempted_at);
CREATE INDEX idx_session_user_active ON sessions(user_id, is_active, expires_at);
CREATE INDEX idx_device_user_trusted ON devices(user_id, is_trusted);

-- ============================================
-- Database setup complete
-- ============================================
