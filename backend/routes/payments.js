const express = require('express');
const { createCheckoutSession, stripeSuccess, stripeOrder } = require('../controllers/paymentsController');

const router = express.Router();

router.post('/create-checkout-session', createCheckoutSession);
router.get('/stripe-success', stripeSuccess);
router.get('/stripe-order', stripeOrder);

module.exports = router;
