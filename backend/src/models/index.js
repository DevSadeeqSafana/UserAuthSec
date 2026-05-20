const User = require('./User');
const Device = require('./Device');
const Session = require('./Session');
const LoginAttempt = require('./LoginAttempt');
const AdminLog = require('./AdminLog');
const MFAToken = require('./MFAToken');
const PasswordReset = require('./PasswordReset');
const VaultItem = require('./VaultItem');

// Associations
User.hasMany(Device, { foreignKey: 'user_id' });
Device.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Session, { foreignKey: 'user_id' });
Session.belongsTo(User, { foreignKey: 'user_id' });

Device.hasMany(Session, { foreignKey: 'device_id' });
Session.belongsTo(Device, { foreignKey: 'device_id' });

User.hasMany(LoginAttempt, { foreignKey: 'user_id' });
LoginAttempt.belongsTo(User, { foreignKey: 'user_id' });

Device.hasMany(LoginAttempt, { foreignKey: 'device_id' });
LoginAttempt.belongsTo(Device, { foreignKey: 'device_id' });

User.hasMany(MFAToken, { foreignKey: 'user_id' });
MFAToken.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(AdminLog, { foreignKey: 'admin_id', as: 'PerformedActions' });
AdminLog.belongsTo(User, { foreignKey: 'admin_id', as: 'Admin' });

User.hasMany(AdminLog, { foreignKey: 'target_user_id', as: 'ReceivedActions' });
AdminLog.belongsTo(User, { foreignKey: 'target_user_id', as: 'TargetUser' });

User.hasMany(PasswordReset, { foreignKey: 'user_id' });
PasswordReset.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(VaultItem, { foreignKey: 'user_id' });
VaultItem.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
    User,
    Device,
    Session,
    LoginAttempt,
    AdminLog,
    MFAToken,
    PasswordReset,
    VaultItem
};
