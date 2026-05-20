const { sequelize } = require('../config/sequelize');

async function migrate() {
    try {
        console.log('Starting migration: Adding vault_password_hash to users table...');
        
        // Add vault_password_hash to users table
        await sequelize.query(`
            ALTER TABLE users 
            ADD COLUMN vault_password_hash VARCHAR(255) NULL AFTER mfa_secret
        `);
        
        console.log('Migration successful: vault_password_hash column added.');
        process.exit(0);
    } catch (error) {
        if (error.parent && error.parent.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Migration skipped: Column already exists.');
            process.exit(0);
        } else {
            console.error('Migration failed:', error);
            process.exit(1);
        }
    }
}

migrate();
