/**
 * Utility to calculate geographical distances and travel feasibility
 */

/**
 * Calculates the distance between two points in kilometers using the Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Determines if travel between two points is "impossible" based on time elapsed
 * @param {Object} pos1 - { lat, lon, time }
 * @param {Object} pos2 - { lat, lon, time }
 * @param {number} maxSpeedKmH - Default 900 km/h (Commercial jet speed)
 * @returns {Object} - { isImpossible, speed, distance }
 */
const checkTravelFeasibility = (pos1, pos2, maxSpeedKmH = 900) => {
    if (!pos1.lat || !pos1.lon || !pos2.lat || !pos2.lon) {
        return { isImpossible: false, speed: 0, distance: 0 };
    }

    const distance = calculateDistance(pos1.lat, pos1.lon, pos2.lat, pos2.lon);
    
    // Time difference in hours
    const timeDiffMs = Math.abs(new Date(pos2.time) - new Date(pos1.time));
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    // If logins happen within 1 minute, even a small distance might trigger it
    // We add a 5-minute "grace period" for GPS noise
    if (timeDiffHours < 0.08) return { isImpossible: false, speed: 0, distance };

    const speed = distance / timeDiffHours;

    return {
        isImpossible: speed > maxSpeedKmH,
        speed: Math.round(speed),
        distance: Math.round(distance)
    };
};

module.exports = {
    calculateDistance,
    checkTravelFeasibility
};
