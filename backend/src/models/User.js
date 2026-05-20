const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash'
    },
    full_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_locked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    failed_login_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    last_failed_login: {
        type: DataTypes.DATE,
        allowNull: true
    },
    mfa_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    mfa_secret: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    vault_password_hash: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
        beforeSave: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

/**
 * Compare password for login
 * @param {string} candidatePassword 
 * @returns {Promise<boolean>}
 */
User.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
