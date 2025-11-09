const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, isAdminOrCompliance } = require('../middleware/auth');

// @route   GET /api/v1/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', verifyToken, dashboardController.getDashboardStats);

// @route   GET /api/v1/dashboard/activity
// @desc    Get recent activity
// @access  Private
router.get('/activity', verifyToken, dashboardController.getRecentActivity);

// @route   GET /api/v1/dashboard/campaign-progress
// @desc    Get campaign progress
// @access  Private
router.get('/campaign-progress', verifyToken, dashboardController.getCampaignProgress);

// @route   GET /api/v1/dashboard/compliance
// @desc    Get compliance overview
// @access  Private/Admin/ComplianceManager
router.get('/compliance', verifyToken, isAdminOrCompliance, dashboardController.getComplianceOverview);

// @route   GET /api/v1/dashboard/trends
// @desc    Get access trends
// @access  Private/Admin/ComplianceManager
router.get('/trends', verifyToken, isAdminOrCompliance, dashboardController.getAccessTrends);

// @route   GET /api/v1/dashboard/high-risk-users
// @desc    Get top high-risk users
// @access  Private/Admin/ComplianceManager
router.get('/high-risk-users', verifyToken, isAdminOrCompliance, dashboardController.getHighRiskUsers);

// @route   GET /api/v1/dashboard/application-usage
// @desc    Get application usage statistics
// @access  Private
router.get('/application-usage', verifyToken, dashboardController.getApplicationUsage);

// @route   GET /api/v1/dashboard/my-reviews
// @desc    Get my review summary
// @access  Private
router.get('/my-reviews', verifyToken, dashboardController.getMyReviewSummary);

module.exports = router;