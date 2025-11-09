const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { verifyToken, isAdminOrCompliance } = require('../middleware/auth');
const validators = require('../utils/validators');

// @route   GET /api/v1/campaigns
// @desc    Get all campaigns
// @access  Private
router.get('/', verifyToken, validators.pagination, campaignController.getCampaigns);

// @route   GET /api/v1/campaigns/:id
// @desc    Get single campaign
// @access  Private
router.get('/:id', verifyToken, validators.uuidParam, campaignController.getCampaign);

// @route   POST /api/v1/campaigns
// @desc    Create campaign
// @access  Private/Admin/ComplianceManager
router.post('/', verifyToken, isAdminOrCompliance, validators.createCampaign, campaignController.createCampaign);

// @route   PUT /api/v1/campaigns/:id
// @desc    Update campaign
// @access  Private/Admin/ComplianceManager
router.put('/:id', verifyToken, isAdminOrCompliance, validators.uuidParam, campaignController.updateCampaign);

// @route   POST /api/v1/campaigns/:id/launch
// @desc    Launch campaign
// @access  Private/Admin/ComplianceManager
router.post('/:id/launch', verifyToken, isAdminOrCompliance, validators.uuidParam, campaignController.launchCampaign);

// @route   GET /api/v1/campaigns/:id/reviewers
// @desc    Get campaign reviewers
// @access  Private
router.get('/:id/reviewers', verifyToken, validators.uuidParam, campaignController.getCampaignReviewers);

// @route   GET /api/v1/campaigns/:id/stats
// @desc    Get campaign statistics
// @access  Private
router.get('/:id/stats', verifyToken, validators.uuidParam, campaignController.getCampaignStats);

// @route   DELETE /api/v1/campaigns/:id
// @desc    Delete campaign
// @access  Private/Admin
router.delete('/:id', verifyToken, isAdminOrCompliance, validators.uuidParam, campaignController.deleteCampaign);

module.exports = router;