const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vaultController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All vault routes are protected
router.use(auth);

router.get('/status', vaultController.getVaultStatus);
router.post('/setup', vaultController.setupVault);
router.post('/unlock', vaultController.unlockVault);

router.get('/', vaultController.getItems);
router.post('/', upload.single('file'), vaultController.createItem);
router.get('/download/:id', vaultController.downloadFile);
router.delete('/:id', vaultController.deleteItem);

module.exports = router;
