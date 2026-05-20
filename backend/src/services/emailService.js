const nodemailer = require('nodemailer');

/**
 * Service to handle email communications
 */
class EmailService {
    constructor() {
        this.transporter = null;
        this.init();
    }

    init() {
        // Only initialize if we have credentials, otherwise we'll log to console (Dev mode)
        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            this.transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || 'gmail',
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT || 587,
                secure: process.env.EMAIL_PORT == 465,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
        }
    }

    /**
     * Send an OTP email
     * @param {string} to 
     * @param {string} otp 
     */
    async sendOTPEmail(to, otp) {
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"UAAuthSec Security" <security@uaauthsec.com>',
            to,
            subject: 'Your Security Verification Code',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6366f1; margin: 0;">UAAuthSec</h1>
                        <p style="color: #666; font-size: 14px;">Secure Adaptive Authentication</p>
                    </div>
                    <div style="background: #f8fafc; padding: 30px; border-radius: 8px; text-align: center;">
                        <h2 style="margin-top: 0; color: #1e293b;">Security Verification</h2>
                        <p style="color: #475569; margin-bottom: 25px;">We noticed an unusual login attempt and require additional verification. Please use the following code to complete your sign-in:</p>
                        <div style="font-size: 32px; font-weight: 800; letter-spacing: 12px; color: #6366f1; background: white; padding: 20px; border-radius: 8px; display: inline-block; border: 1px solid #e2e8f0; margin-bottom: 25px;">
                            ${otp}
                        </div>
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">This code will expire in 10 minutes. If you did not attempt to log in, please secure your account immediately.</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
                        &copy; 2026 UAAuthSec Security Systems. All rights reserved.
                    </div>
                </div>
            `
        };

        if (this.transporter) {
            try {
                await this.transporter.sendMail(mailOptions);
                console.log(`[EMAIL] OTP sent to ${to}`);
            } catch (error) {
                console.warn('[EMAIL WARNING] Failed to send real email, falling back to simulation:', error.message);
                this.logSimulatedEmail(to, otp);
            }
        } else {
            this.logSimulatedEmail(to, otp);
        }
    }

    /**
     * Log the email to console for development
     */
    logSimulatedEmail(to, otp) {
        console.log('\n=======================================');
        console.log('📧 [SIMULATED EMAIL SERVICE]');
        console.log(`TO: ${to}`);
        console.log(`CODE: ${otp}`);
        console.log('=======================================\n');
    }
}

module.exports = new EmailService();
