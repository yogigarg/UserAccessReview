const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken } = require('../middleware/auth');

// Remove validators temporarily to debug

router.get('/pending', verifyToken, reviewController.getPendingReviews);
router.get('/stats', verifyToken, reviewController.getReviewerStats);
router.post('/bulk-approve', verifyToken, reviewController.bulkApprove);
router.get('/:id', verifyToken, reviewController.getReviewItem);
router.post('/:id/decision', verifyToken, reviewController.submitDecision);
router.post('/:id/comments', verifyToken, reviewController.addComment);

module.exports = router;