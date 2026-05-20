const crypto = require('crypto');
const { MFAToken } = require('../models');
const emailService = require('./emailService');

/**
 * Service to handle Multi-Factor Authentication logic
 */
class MFAService {
    /**
     * Generate and send a new OTP to the user
     * @param {Object} user 
     * @returns {Promise<MFAToken>}
     */
    static async generateAndSendOTP(user) {
        // 1. Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Set expiration (10 minutes)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // 3. Store in database (Invalidate previous tokens for this user first)
        await MFAToken.destroy({ where: { user_id: user.id, verified: false } });

        const mfaToken = await MFAToken.create({
            user_id: user.id,
            token: otp,
            type: 'email_otp',
            expires_at: expiresAt
        });

        // 4. Send email
        await emailService.sendOTPEmail(user.email, otp);

        return mfaToken;
    }

    /**
     * Verify an OTP provided by the user
     * @param {number} userId 
     * @param {string} token 
     * @returns {Promise<boolean>}
     */
    static async verifyOTP(userId, token) {
        const mfaToken = await MFAToken.findOne({
            where: {
                user_id: userId,
                token: token,
                verified: false
            }
        });

        if (!mfaToken) return false;

        // Check expiration
        if (mfaToken.expires_at < new Date()) {
            await mfaToken.destroy();
            return false;
        }

        // Mark as verified
        await mfaToken.update({ verified: true });
        return true;
    }
}

module.exports = MFAService;
