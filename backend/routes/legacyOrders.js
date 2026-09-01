const express = require('express');
const { createOrder, checkTransaction } = require('../controllers/ordersController');

const router = express.Router();

// Public endpoints kept for legacy clients (no auth)
router.post('/orders', createOrder);
router.get('/orders/check', checkTransaction);

module.exports = router;
