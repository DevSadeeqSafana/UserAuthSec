const { LoginAttempt, Device } = require('../models');
const { Op } = require('sequelize');
const BehaviorService = require('./behaviorService');

/**
 * Service to assess risk levels of authentication attempts
 */
class RiskEngine {
    /**
     * Thresholds for risk levels
     */
    static THRESHOLDS = {
        LOW: 30,
        MEDIUM: 60,
        HIGH: 100
    };

    /**
     * Assess the risk of a login attempt
     * @param {Object} user 
     * @param {Object} context 
     * @returns {Promise<Object>} - { score, level, factors }
     */
    static async assessRisk(user, context) {
        let riskScore = 0;
        const factors = [];

        // 1. Device Risk (Max 40 points)
        const deviceRisk = await this.assessDeviceRisk(user.id, context.device);
        riskScore += deviceRisk.points;
        if (deviceRisk.points > 0) factors.push(deviceRisk.description);

        // 2. Location Risk (Max 30 points)
        const locationRisk = await this.assessLocationRisk(user.id, context.geolocation);
        riskScore += locationRisk.points;
        if (locationRisk.points > 0) factors.push(locationRisk.description);

        // 3. Behavioral Risk (Max 30 points)
        const behaviorRiskPoints = await BehaviorService.analyzeTimePattern(user.id);
        riskScore += behaviorRiskPoints;
        if (behaviorRiskPoints > 0) factors.push('Unusual login time pattern detected');

        // Ensure score doesn't exceed 100
        const finalScore = Math.min(riskScore, 100);

        return {
            score: finalScore,
            level: this.getRiskLevel(finalScore),
            factors
        };
    }

    /**
     * Calculate device-based risk
     */
    static async assessDeviceRisk(userId, currentDevice) {
        if (!currentDevice) {
            return { points: 40, description: 'Unknown device fingerprint' };
        }

        if (currentDevice.is_trusted) {
            return { points: 0, description: 'Trusted device' };
        }

        // Check if user has used this device before (recognized but not trusted)
        return { points: 40, description: 'New or untrusted device fingerprint' };
    }

    /**
     * Calculate location-based risk
     */
    static async assessLocationRisk(userId, currentGeo) {
        if (!currentGeo || !currentGeo.countryCode) {
            return { points: 10, description: 'Unable to verify location' };
        }

        // Get last successful login location
        const lastSuccess = await LoginAttempt.findOne({
            where: { user_id: userId, status: 'success' },
            order: [['attempted_at', 'DESC']]
        });

        if (!lastSuccess || !lastSuccess.geolocation) {
            return { points: 0, description: 'First verified location login' };
        }

        const lastGeo = lastSuccess.geolocation;

        // New Country
        if (currentGeo.countryCode !== lastGeo.countryCode) {
            return { points: 30, description: `New country detected: ${currentGeo.country}` };
        }

        // New City in same country
        if (currentGeo.city !== lastGeo.city) {
            return { points: 15, description: `New city detected: ${currentGeo.city}` };
        }

        return { points: 0, description: 'Recognized location' };
    }

    /**
     * Determine risk level based on total score
     */
    static getRiskLevel(score) {
        if (score <= this.THRESHOLDS.LOW) return 'LOW';
        if (score <= this.THRESHOLDS.MEDIUM) return 'MEDIUM';
        return 'HIGH';
    }
}

module.exports = RiskEngine;
