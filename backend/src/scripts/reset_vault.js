const { User, Session } = require('../models');

async function resetVault() {
    try {
        console.log('Resetting vault for Admin (User ID: 1)...');
        
        const user = await User.findByPk(1);
        if (!user) {
            console.error('User not found.');
            process.exit(1);
        }

        // 1. Clear the vault password
        user.vault_password_hash = null;
        await user.save();

        // 2. Lock the vault in all active sessions
        const sessions = await Session.findAll({ where: { user_id: 1, is_active: true } });
        for (const session of sessions) {
            const metadata = session.metadata || {};
            session.metadata = { ...metadata, vault_unlocked: false };
            session.changed('metadata', true);
            await session.save();
        }

        console.log('✓ Vault has been reset. You can now set a new password on the Vault page.');
        process.exit(0);
    } catch (error) {
        console.error('Reset failed:', error);
        process.exit(1);
    }
}

resetVault();
