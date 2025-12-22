const express = require('express');
const { listReviews, getSummary, createReview } = require('../controllers/reviewsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', listReviews);
router.get('/summary', getSummary);
router.post('/', requireAuth, createReview);

module.exports = router;
