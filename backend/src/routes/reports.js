const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, isAdminOrCompliance } = require('../middleware/auth');
const validators = require('../utils/validators');

// @route   GET /api/v1/reports/campaign/:id
// @desc    Generate campaign report
// @access  Private/Admin/ComplianceManager
router.get('/campaign/:id', verifyToken, isAdminOrCompliance, validators.uuidParam, reportController.generateCampaignReport);

// @route   GET /api/v1/reports/sod-violations
// @desc    Get SOD violations report
// @access  Private/Admin/ComplianceManager
router.get('/sod-violations', verifyToken, isAdminOrCompliance, reportController.getSODViolationsReport);

// @route   GET /api/v1/reports/dormant-accounts
// @desc    Get dormant accounts report
// @access  Private/Admin/ComplianceManager
router.get('/dormant-accounts', verifyToken, isAdminOrCompliance, reportController.getDormantAccountsReport);

// @route   GET /api/v1/reports/recertification-summary
// @desc    Get access recertification summary
// @access  Private/Admin/ComplianceManager
router.get('/recertification-summary', verifyToken, isAdminOrCompliance, reportController.getRecertificationSummary);

// @route   GET /api/v1/reports/user-access/:userId
// @desc    Get user access report
// @access  Private
router.get('/user-access/:userId', verifyToken, validators.uuidParam, reportController.getUserAccessReport);

// @route   GET /api/v1/reports/audit-logs
// @desc    Get audit log report
// @access  Private/Admin
router.get('/audit-logs', verifyToken, isAdminOrCompliance, reportController.getAuditLogReport);

// @route   POST /api/v1/reports/export
// @desc    Export report
// @access  Private/Admin/ComplianceManager
router.post('/export', verifyToken, isAdminOrCompliance, reportController.exportReport);

module.exports = router;