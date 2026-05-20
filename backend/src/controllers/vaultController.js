const { VaultItem, User, Session, LoginAttempt } = require('../models');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AuditService = require('../services/auditService');
const MFAService = require('../services/mfaService');
const path = require('path');
const fs = require('fs');

// Encryption constants (Should be in .env in production)
const ENCRYPTION_KEY = process.env.VAULT_SECRET || 'v-a-u-l-t-s-e-c-r-e-t-k-e-y-32-chars';
const IV_LENGTH = 16;

/**
 * Encrypt text
 */
const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

/**
 * Decrypt text
 */
const decrypt = (text) => {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        return '[Decryption Error]';
    }
};

/**
 * Get Vault Status (Is it set up? Is it unlocked for this session?)
 */
exports.getVaultStatus = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);
        
        // We track the "unlocked" state in the active session
        const session = await Session.findOne({ where: { user_id: req.user.id, is_active: true } });
        const isUnlocked = session?.metadata?.vault_unlocked === true;

        res.status(200).json({
            success: true,
            data: {
                isSetup: !!user.vault_password_hash,
                isUnlocked: isUnlocked
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Setup Vault Password for the first time
 */
exports.setupVault = async (req, res, next) => {
    try {
        const { password } = req.body;
        const user = await User.findByPk(req.user.id);

        if (user.vault_password_hash) {
            return res.status(400).json({ success: false, message: 'Vault password already set' });
        }

        const salt = await bcrypt.genSalt(10);
        user.vault_password_hash = await bcrypt.hash(password, salt);
        await user.save();

        await AuditService.logSecurityAlert(req.user.id, 'VAULT_SETUP_COMPLETED', { timestamp: new Date() });

        res.status(200).json({ success: true, message: 'Vault password set successfully' });
    } catch (error) {
        next(error);
    }
};

/**
 * Unlock Vault with Adaptive Risk Check
 */
exports.unlockVault = async (req, res, next) => {
    try {
        const { password } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user.vault_password_hash) {
            return res.status(400).json({ success: false, message: 'Vault not set up' });
        }

        // 1. Verify Password
        const isMatch = await bcrypt.compare(password, user.vault_password_hash);
        if (!isMatch) {
            await AuditService.logSecurityAlert(req.user.id, 'VAULT_UNLOCK_FAILED', { reason: 'Invalid password' });
            return res.status(401).json({ success: false, message: 'Invalid vault password' });
        }

        // 2. Check for Suspicious Activity (Adaptive MFA)
        // We look at the risk score of the current login attempt
        const lastAttempt = await LoginAttempt.findOne({
            where: { user_id: req.user.id },
            order: [['attempted_at', 'DESC']]
        });

        // If risk is MEDIUM or HIGH, trigger MFA
        if (lastAttempt && (lastAttempt.risk_level === 'medium' || lastAttempt.risk_level === 'high')) {
            // Check if MFA was already verified in this session
            const session = await Session.findOne({ where: { user_id: req.user.id, is_active: true } });
            
            if (!session?.metadata?.vault_mfa_verified) {
                await MFAService.generateAndSendOTP(user);
                return res.status(200).json({ 
                    success: true, 
                    mfaRequired: true, 
                    message: 'Suspicious activity detected. MFA verification required to unlock vault.' 
                });
            }
        }

        // 3. Unlock Vault
        const session = await Session.findOne({ where: { user_id: req.user.id, is_active: true } });
        
        // Update metadata object
        const currentMetadata = session.metadata || {};
        session.metadata = { ...currentMetadata, vault_unlocked: true };
        
        // Force Sequelize to recognize the change in the JSON field
        session.changed('metadata', true);
        await session.save();

        await AuditService.logSecurityAlert(req.user.id, 'VAULT_UNLOCKED', { risk_level: lastAttempt?.risk_level || 'low' });

        res.status(200).json({ success: true, message: 'Vault unlocked' });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all vault items for user (Requires unlocked vault)
 */
exports.getItems = async (req, res, next) => {
    try {
        const session = await Session.findOne({ where: { user_id: req.user.id, is_active: true } });
        if (!session?.metadata?.vault_unlocked) {
            return res.status(403).json({ success: false, message: 'Vault is locked', isLocked: true });
        }

        const items = await VaultItem.findAll({
            where: { user_id: req.user.id },
            order: [['updated_at', 'DESC']]
        });

        // Map and decrypt content where applicable
        const formattedItems = items.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category,
            content: item.content_encrypted ? decrypt(item.content_encrypted) : null,
            file: item.file_name ? {
                name: item.original_name,
                size: item.file_size,
                type: item.mime_type
            } : null,
            updated_at: item.updated_at
        }));

        await AuditService.logSecurityAlert(req.user.id, 'VAULT_ACCESSED', { count: items.length });

        res.status(200).json({ success: true, data: formattedItems });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new vault item (Supports both text notes and file uploads)
 */
exports.createItem = async (req, res, next) => {
    try {
        const { title, content, category } = req.body;
        const file = req.file;

        let encryptedContent = null;
        if (content) {
            encryptedContent = encrypt(content);
        }

        const itemData = {
            user_id: req.user.id,
            title: title || (file ? file.originalname : 'Untitled'),
            content_encrypted: encryptedContent,
            category: category || (file ? 'file' : 'note')
        };

        if (file) {
            itemData.file_name = file.filename;
            itemData.original_name = file.originalname;
            itemData.mime_type = file.mimetype;
            itemData.file_size = file.size;
        }

        const item = await VaultItem.create(itemData);

        await AuditService.logSecurityAlert(req.user.id, 'VAULT_ITEM_CREATED', { 
            itemId: item.id, 
            type: file ? 'FILE' : 'NOTE' 
        });

        res.status(201).json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
};

/**
 * Download a vault file
 */
exports.downloadFile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const item = await VaultItem.findOne({
            where: { id, user_id: req.user.id }
        });

        if (!item || !item.file_name) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        const filePath = path.join(__dirname, '../uploads/vault', item.file_name);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Physical file missing' });
        }

        await AuditService.logSecurityAlert(req.user.id, 'VAULT_FILE_DOWNLOADED', { itemId: id });

        res.download(filePath, item.original_name);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete vault item
 */
exports.deleteItem = async (req, res, next) => {
    try {
        const { id } = req.params;

        const item = await VaultItem.findOne({
            where: { id, user_id: req.user.id }
        });

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Delete physical file if exists
        if (item.file_name) {
            const filePath = path.join(__dirname, '../uploads/vault', item.file_name);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await item.destroy();

        await AuditService.logSecurityAlert(req.user.id, 'VAULT_ITEM_DELETED', { itemId: id });

        res.status(200).json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
        next(error);
    }
};
