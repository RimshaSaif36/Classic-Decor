const express = require('express');
const { health, configStatus } = require('../controllers/statusController');
const router = express.Router();

router.get('/health', health);
router.get('/config-status', configStatus);

module.exports = router;
