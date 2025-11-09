const express = require('express');
const router = express.Router();
const sodController = require('../controllers/sodController');
const { verifyToken, isAdminOrCompliance } = require('../middleware/auth');
const validators = require('../utils/validators');

// @route   GET /api/v1/sod/rules
// @desc    Get all SOD rules
// @access  Private/Admin/ComplianceManager
router.get('/rules', verifyToken, isAdminOrCompliance, validators.pagination, sodController.getSODRules);

// @route   GET /api/v1/sod/rules/:id
// @desc    Get single SOD rule
// @access  Private/Admin/ComplianceManager
router.get('/rules/:id', verifyToken, isAdminOrCompliance, validators.uuidParam, sodController.getSODRule);

// @route   POST /api/v1/sod/rules
// @desc    Create SOD rule
// @access  Private/Admin/ComplianceManager
router.post('/rules', verifyToken, isAdminOrCompliance, sodController.createSODRule);

// @route   PUT /api/v1/sod/rules/:id
// @desc    Update SOD rule
// @access  Private/Admin/ComplianceManager
router.put('/rules/:id', verifyToken, isAdminOrCompliance, validators.uuidParam, sodController.updateSODRule);

// @route   DELETE /api/v1/sod/rules/:id
// @desc    Delete SOD rule
// @access  Private/Admin
router.delete('/rules/:id', verifyToken, isAdminOrCompliance, validators.uuidParam, sodController.deleteSODRule);

// @route   GET /api/v1/sod/violations
// @desc    Get SOD violations
// @access  Private/Admin/ComplianceManager
router.get('/violations', verifyToken, isAdminOrCompliance, validators.pagination, sodController.getSODViolations);

// @route   POST /api/v1/sod/violations/:id/resolve
// @desc    Resolve SOD violation
// @access  Private/Admin/ComplianceManager
router.post('/violations/:id/resolve', verifyToken, isAdminOrCompliance, validators.uuidParam, sodController.resolveSODViolation);

// @route   POST /api/v1/sod/detect/:userId
// @desc    Detect SOD violations for a user
// @access  Private/Admin/ComplianceManager
router.post('/detect/:userId', verifyToken, isAdminOrCompliance, validators.uuidParam, sodController.detectUserViolations);

module.exports = router;