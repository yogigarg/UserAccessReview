const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { verifyToken, isAdmin, isAdminOrCompliance } = require('../middleware/auth');
const validators = require('../utils/validators');

// @route   GET /api/v1/applications
// @desc    Get all applications
// @access  Private
router.get('/', verifyToken, validators.pagination, applicationController.getApplications);

// @route   GET /api/v1/applications/:id
// @desc    Get single application
// @access  Private
router.get('/:id', verifyToken, validators.uuidParam, applicationController.getApplication);

// @route   POST /api/v1/applications
// @desc    Create application
// @access  Private/Admin
router.post('/', verifyToken, isAdmin, validators.createApplication, applicationController.createApplication);

// @route   PUT /api/v1/applications/:id
// @desc    Update application
// @access  Private/Admin
router.put('/:id', verifyToken, isAdmin, validators.uuidParam, applicationController.updateApplication);

// @route   GET /api/v1/applications/:id/roles
// @desc    Get application roles
// @access  Private
router.get('/:id/roles', verifyToken, validators.uuidParam, applicationController.getApplicationRoles);

// @route   GET /api/v1/applications/:id/users
// @desc    Get application users
// @access  Private
router.get('/:id/users', verifyToken, validators.uuidParam, applicationController.getApplicationUsers);

module.exports = router;