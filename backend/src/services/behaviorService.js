const { LoginAttempt } = require('../models');
const { Op } = require('sequelize');

/**
 * Service to analyze user behavior and detect anomalies
 */
class BehaviorService {
    /**
     * Check for high velocity login attempts (potential brute force)
     * @param {string} ip 
     * @param {number} userId 
     * @returns {Promise<boolean>} - True if suspicious
     */
    static async checkVelocity(ip, userId = null) {
        const timeWindow = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes

        const count = await LoginAttempt.count({
            where: {
                [Op.or]: [
                    { ip_address: ip },
                    userId ? { user_id: userId } : null
                ].filter(Boolean),
                status: 'failed',
                attempted_at: { [Op.gte]: timeWindow }
            }
        });

        return count >= 5; // Trigger alert if 5+ failures in 15 mins
    }

    /**
     * Analyze if the login time is unusual for the user
     * @param {number} userId 
     * @returns {Promise<number>} - Risk points (0-15)
     */
    static async analyzeTimePattern(userId) {
        if (!userId) return 0;

        const recentLogins = await LoginAttempt.findAll({
            where: { user_id: userId, status: 'success' },
            limit: 20,
            order: [['attempted_at', 'DESC']]
        });

        if (recentLogins.length < 5) return 0; // Not enough data

        const currentHour = new Date().getHours();

        // Count how many logins happened around this time of day (+/- 2 hours)
        const similarTimeLogins = recentLogins.filter(login => {
            const loginHour = new Date(login.attempted_at).getHours();
            const diff = Math.abs(currentHour - loginHour);
            return diff <= 2 || diff >= 22; // Handle midnight wrap around
        });

        // If less than 20% of logins happened at this time, it's unusual
        if (similarTimeLogins.length / recentLogins.length < 0.2) {
            return 15; // Unusual time
        }

        return 0;
    }
}

module.exports = BehaviorService;
