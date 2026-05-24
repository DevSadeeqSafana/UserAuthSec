/**
 * One-time migration: adds `metadata` JSON column to sessions table.
 * Run with: node addMetadataColumn.js
 */
require('dotenv').config();
const { sequelize } = require('./src/config/sequelize');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('✓ Connected to database');

        // Check if column already exists before adding
        const [rows] = await sequelize.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'sessions' 
             AND COLUMN_NAME = 'metadata';`
        );

        if (rows.length === 0) {
            await sequelize.query('ALTER TABLE sessions ADD COLUMN metadata JSON NULL;');
            console.log('✓ metadata column added to sessions table');
        } else {
            console.log('✓ metadata column already exists — no changes needed');
        }
    } catch (error) {
        console.error('Migration error:', error.message);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

migrate();
