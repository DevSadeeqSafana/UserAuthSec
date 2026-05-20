require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { sequelize, testConnection } = require('./config/sequelize');

const app = express();
app.use(cookieParser());
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const PORT = process.env.PORT || 5001;

// ============================================
// Middleware Configuration
// ============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Apply global rate limiter
app.use('/api/', apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ============================================
// Health Check Endpoint
// ============================================
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ============================================
// API Routes
// ============================================
app.get('/api/v1', (req, res) => {
    res.json({
        message: 'User-Aware Authentication Security System API',
        version: '1.0.0',
        status: 'active'
    });
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vaultRoutes = require('./routes/vaultRoutes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/vault', vaultRoutes);

// ============================================
// Error Handling Middleware
// ============================================

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// Start Server
// ============================================
const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error('Failed to connect to database. Please check your configuration.');
            process.exit(1);
        }

        // Sync database models (development only)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: false });
            console.log('✓ Database models synchronized');
        }

        // Start Express server
        app.listen(PORT, () => {
            console.log('\n========================================');
            console.log('🚀 Server Started Successfully');
            console.log('========================================');
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Server running on: http://localhost:${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`API endpoint: http://localhost:${PORT}/api/v1`);
            console.log('========================================\n');
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await sequelize.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    await sequelize.close();
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
