const { sequelize } = require('../config/sequelize');

async function migrate() {
    try {
        console.log('Verifying all database columns...');
        
        // 1. Check users table for vault_password_hash
        try {
            await sequelize.query("ALTER TABLE users ADD COLUMN vault_password_hash VARCHAR(255) NULL AFTER mfa_secret");
            console.log('✓ Added vault_password_hash to users');
        } catch (e) {
            console.log('- vault_password_hash already exists or users table error');
        }

        // 2. Check vault_items table for file columns
        const vaultColumns = [
            "ADD COLUMN file_name VARCHAR(255) NULL AFTER content_encrypted",
            "ADD COLUMN original_name VARCHAR(255) NULL AFTER file_name",
            "ADD COLUMN mime_type VARCHAR(100) NULL AFTER original_name",
            "ADD COLUMN file_size INT NULL AFTER mime_type",
            "MODIFY COLUMN content_encrypted TEXT NULL",
            "MODIFY COLUMN category ENUM('note', 'password', 'document', 'file', 'other') DEFAULT 'note'"
        ];

        for (const col of vaultColumns) {
            try {
                await sequelize.query(`ALTER TABLE vault_items ${col}`);
                console.log(`✓ Executed: ${col}`);
            } catch (e) {
                console.log(`- Column/Action already exists or error: ${col}`);
            }
        }
        
        console.log('Database synchronization complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
