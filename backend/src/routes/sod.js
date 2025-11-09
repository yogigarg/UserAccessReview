const express = require('express');
const router = express.Router();
const sodController = require('../controllers/sodController');
const { verifyToken, isAdminOrCompliance } = require('../middleware/auth');
const validators = require('../utils/validators');

// SOD Rule Templates
// @route   GET /api/sod/templates
// @desc    Get SOD rule templates
// @access  Private/Admin/ComplianceManager
router.get('/templates', verifyToken, isAdminOrCompliance, sodController.getSODTemplates);

// SOD Rules
// @route   GET /api/sod/rules
// @desc    Get all SOD rules
// @access  Private/Admin/ComplianceManager
router.get('/rules', verifyToken, isAdminOrCompliance, validators.pagination, sodController.getSODRules);

// @route   GET /api/sod/rules/:id
// @desc    Get single SOD rule
// @access  Private/Admin/ComplianceManager
router.get('/rules/:id', verifyToken, isAdminOrCompliance, validators.uuidParam, sodController.getSODRule);

// @route   POST /api/sod/rules
// @desc    Create SOD rule
// @access  Private/Admin/ComplianceManager
router.post('/rules', verifyToken, isAdminOrCompliance, sodController.createSODRule);

// @route   PUT /api/sod/rules/:id
// @desc    Update SOD rule
// @access  Private/Admin/ComplianceManager
router.put('/rules/:id', verifyToken, isAdminOrCompliance, validators.uuidParam, sodController.updateSODRule);

// @route   DELETE /api/sod/rules/:id
// @desc    Delete SOD rule
// @access  Private/Admin
router.delete('/rules/:id', verifyToken, isAdminOrCompliance, validators.uuidParam, sodController.deleteSODRule);

// SOD Violations
// @route   GET /api/sod/violations
// @desc    Get SOD violations
// @access  Private/Admin/ComplianceManager
router.get('/violations', verifyToken, isAdminOrCompliance, validators.pagination, sodController.getSODViolations);

// @route   POST /api/sod/violations/:id/resolve
// @desc    Resolve SOD violation
// @access  Private/Admin/ComplianceManager
router.post('/violations/:id/resolve', verifyToken, isAdminOrCompliance, validators.uuidParam, sodController.resolveSODViolation);

// SOD Detection
// @route   POST /api/sod/detect/:userId
// @desc    Detect SOD violations for a user
// @access  Private/Admin/ComplianceManager
router.post('/detect/:userId', verifyToken, isAdminOrCompliance, validators.uuidParam, sodController.detectUserViolations);

module.exports = router;