const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const MFAToken = sequelize.define('MFAToken', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    token: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('email_otp', 'sms_otp', 'totp'),
        allowNull: false
    },
    purpose: {
        type: DataTypes.ENUM('login', 'password_reset', 'email_verification'),
        defaultValue: 'login'
    },
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'mfa_tokens',
    timestamps: true,
    updatedAt: false,
    underscored: true
});

module.exports = MFAToken;
