const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { verifyToken, isAdminOrCompliance } = require('../middleware/auth');

// NO validators - removed completely

router.get('/', verifyToken, campaignController.getCampaigns);
router.post('/', verifyToken, isAdminOrCompliance, campaignController.createCampaign);

// Specific routes BEFORE /:id
router.get('/:id/stats', verifyToken, campaignController.getCampaignStats);
router.get('/:id/reviewers', verifyToken, campaignController.getCampaignReviewers);
router.post('/:id/launch', verifyToken, isAdminOrCompliance, campaignController.launchCampaign);

// Generic routes AFTER specific routes
router.get('/:id', verifyToken, campaignController.getCampaign);
router.put('/:id', verifyToken, isAdminOrCompliance, campaignController.updateCampaign);
router.delete('/:id', verifyToken, isAdminOrCompliance, campaignController.deleteCampaign);

module.exports = router;