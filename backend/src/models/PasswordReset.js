const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const PasswordReset = sequelize.define('PasswordReset', {
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
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'password_resets',
    timestamps: true,
    updatedAt: false,
    underscored: true
});

module.exports = PasswordReset;
