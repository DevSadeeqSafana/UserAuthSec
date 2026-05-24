const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Session = sequelize.define('Session', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    device_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    token_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    refresh_token_hash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'sessions',
    timestamps: true,
    underscored: true
});

module.exports = Session;
