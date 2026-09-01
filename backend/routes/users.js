const express = require('express');
const { getMe, listUsers, updateMe } = require('../controllers/usersController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, getMe);
router.get('/', requireAuth, requireAdmin, listUsers);
router.put('/me', requireAuth, updateMe);

module.exports = router;
