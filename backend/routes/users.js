const express = require('express');
const { getMe, listUsers } = require('../controllers/usersController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, getMe);
router.get('/', requireAuth, requireAdmin, listUsers);

module.exports = router;
