const { User, Session, Device } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const ContextService = require('../services/contextService');
const BehaviorService = require('../services/behaviorService');
const RiskEngine = require('../services/riskEngine');
const AuditService = require('../services/auditService');
const MFAService = require('../services/mfaService');
const GeoIPService = require('../services/geoIPService');

/**
 * Generate tokens and set cookie
 */
const generateTokens = async (user, deviceId = null) => {
    const accessToken = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await Session.create({
        user_id: user.id,
        device_id: deviceId,
        token_hash: tokenHash,
        expires_at: expiresAt
    });

    return { accessToken, refreshToken };
};

/**
 * Register a new user
 */
exports.register = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password, full_name } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        const user = await User.create({ email, password, full_name });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { userId: user.id, email: user.email, full_name: user.full_name }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login user with Risk-Based Adaptive Authentication
 */
exports.login = async (req, res, next) => {
    let context = null;
    let user = null;

    try {
        const { email, password, fingerprint } = req.body;
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // 1. Initial Velocity Check (Brute Force Protection)
        const isSuspicious = await BehaviorService.checkVelocity(ip);
        if (isSuspicious) {
            await ContextService.logAttempt({
                userId: null,
                email: email,
                ip,
                status: 'BLOCKED',
                riskScore: 100,
                riskLevel: 'HIGH'
            });
            await AuditService.logSecurityAlert(null, 'BRUTE_FORCE_PREVENTION', { ip });
            return res.status(429).json({ success: false, message: 'Too many failed attempts. Access temporarily restricted.' });
        }

        // 2. Find User
        user = await User.findOne({ where: { email } });

        // 3. Capture Context
        if (user) {
            context = await ContextService.captureContext(req, user, fingerprint);
        } else {
            const geolocation = await GeoIPService.lookup(ip);
            context = { ip, userAgent: req.headers['user-agent'], geolocation, device: null };
        }

        // 4. Handle non-existent or inactive user
        if (!user || !user.is_active) {
            await ContextService.logAttempt({
                userId: user ? user.id : null,
                email: email,
                ip: context.ip,
                geolocation: context.geolocation,
                status: 'FAILED',
                riskScore: 0
            });
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // 5. Verify Password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            await ContextService.logAttempt({
                userId: user.id,
                email: email,
                deviceId: context.device ? context.device.id : null,
                ip: context.ip,
                geolocation: context.geolocation,
                status: 'FAILED',
                riskScore: 10
            });
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // 6. Risk Assessment
        const riskAssessment = await RiskEngine.assessRisk(user, context);
        const { score: riskScore, level: riskLevel, factors } = riskAssessment;

        // 7. Adaptive Decision Logic

        // Case: HIGH RISK - Block immediately
        if (riskLevel === 'HIGH') {
            await ContextService.logAttempt({
                userId: user.id,
                email: email,
                deviceId: context.device ? context.device.id : null,
                ip: context.ip,
                geolocation: context.geolocation,
                status: 'BLOCKED',
                riskScore,
                riskLevel
            });

            await AuditService.logSecurityAlert(user.id, 'HIGH_RISK_LOGIN_BLOCKED', {
                context,
                riskScore,
                factors
            });

            return res.status(403).json({
                success: false,
                message: 'Access denied due to high security risk.',
                riskLevel: 'HIGH',
                factors
            });
        }

        // Case: MEDIUM RISK - Trigger MFA (Phase 5: Real OTP)
        if (riskLevel === 'MEDIUM') {
            await ContextService.logAttempt({
                userId: user.id,
                email: email,
                deviceId: context.device ? context.device.id : null,
                ip: context.ip,
                geolocation: context.geolocation,
                status: 'MFA_REQUIRED',
                riskScore,
                riskLevel,
                mfaRequired: true
            });

            // PHASE 5: Generate and send actual OTP
            await MFAService.generateAndSendOTP(user);

            return res.status(200).json({
                success: true,
                message: 'Additional verification required.',
                mfaRequired: true,
                riskScore,
                riskLevel: 'MEDIUM',
                factors,
                data: {
                    userId: user.id,
                    email: user.email,
                    deviceId: context.device ? context.device.id : null
                }
            });
        }

        // Case: LOW RISK - Proceed with normal login
        const { accessToken, refreshToken } = await generateTokens(user, context.device ? context.device.id : null);

        await ContextService.logAttempt({
            userId: user.id,
            email: email,
            deviceId: context.device ? context.device.id : null,
            ip: context.ip,
            geolocation: context.geolocation,
            status: 'SUCCESS',
            riskScore,
            riskLevel,
            mfaRequired: false
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token: accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    mfa_enabled: user.mfa_enabled,
                    risk_score: riskScore,
                    risk_level: riskLevel
                }
            }
        });

    } catch (error) {
        if (user && context) {
            await ContextService.logAttempt({
                userId: user.id,
                email: req.body.email,
                deviceId: context.device ? context.device.id : null,
                ip: context.ip,
                geolocation: context.geolocation,
                status: 'failed',
                riskScore: 0
            });
        }
        next(error);
    }
};

/**
 * Verify MFA OTP
 */
exports.verifyMFA = async (req, res, next) => {
    try {
        const { userId, token, deviceId } = req.body;

        if (!userId || !token) {
            return res.status(400).json({ success: false, message: 'User ID and token are required' });
        }

        const isValid = await MFAService.verifyOTP(userId, token);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid or expired verification code' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Generate tokens upon successful MFA
        const { accessToken, refreshToken } = await generateTokens(user, deviceId);

        // Optional: Auto-trust device after successful MFA if it's the same device
        if (deviceId) {
            const device = await Device.findByPk(deviceId);
            if (device && device.user_id === user.id) {
                await device.update({ is_trusted: true });
            }
        }

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            message: 'MFA Verification successful',
            data: {
                token: accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    mfa_enabled: user.mfa_enabled
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Refresh Token
 */
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'No refresh token' });
        }

        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const session = await Session.findOne({
            where: { token_hash: tokenHash },
            include: [{ model: User }]
        });

        if (!session || session.expires_at < new Date()) {
            if (session) await session.destroy();
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateTokens(session.User, session.device_id);

        await session.destroy();

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            data: { token: accessToken }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout
 */
exports.logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        if (refreshToken) {
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            await Session.destroy({ where: { token_hash: tokenHash } });
        }

        res.clearCookie('refreshToken');
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout from all devices (Global Session Invalidation)
 */
exports.logoutAll = async (req, res, next) => {
    try {
        await Session.destroy({
            where: { user_id: req.user.id }
        });

        res.clearCookie('refreshToken');
        res.status(200).json({
            success: true,
            message: 'All sessions invalidated successfully. Please log in again.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user login history
 */
exports.getHistory = async (req, res, next) => {
    try {
        const history = await ContextService.getRecentHistory(req.user.id, 15);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        next(error);
    }
};

/**
 * Toggle MFA status
 */
exports.toggleMFA = async (req, res, next) => {
    try {
        const { enabled } = req.body;
        const user = await User.findByPk(req.user.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await user.update({ mfa_enabled: enabled });
        
        await AuditService.logSecurityEvent(user.id, 'MFA_TOGGLED', { enabled });

        res.status(200).json({ 
            success: true, 
            message: `MFA ${enabled ? 'enabled' : 'disabled'} successfully`,
            data: { mfa_enabled: user.mfa_enabled }
        });
    } catch (error) {
        next(error);
    }
};
