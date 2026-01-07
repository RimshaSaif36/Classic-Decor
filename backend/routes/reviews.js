const express = require('express');
const { listReviews, getSummary, createReview, updateReview, deleteReview } = require('../controllers/reviewsController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', listReviews);
router.get('/summary', getSummary);
// Allow public review submissions (no auth required). Admins can approve via PUT /:id
router.post('/', createReview);

// Admin endpoints to update (approve/reject) and delete reviews
router.put('/:id', requireAuth, requireAdmin, updateReview);
router.delete('/:id', requireAuth, requireAdmin, deleteReview);

module.exports = router;
