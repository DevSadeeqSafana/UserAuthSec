const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const VaultItem = sequelize.define('VaultItem', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    content_encrypted: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    file_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    original_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    mime_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    file_size: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    category: {
        type: DataTypes.ENUM('note', 'password', 'document', 'file', 'other'),
        defaultValue: 'note'
    },
    last_accessed_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'vault_items',
    timestamps: true,
    underscored: true
});

module.exports = VaultItem;
