const express = require('express');
const { payfastInitiate, payfastReturn, payfastNotify } = require('../controllers/paymentsController');

const router = express.Router();

// PayFast endpoints
router.post('/payfast/initiate', payfastInitiate);
router.get('/payfast/return', payfastReturn);
router.post('/payfast/notify', payfastNotify);

module.exports = router;
