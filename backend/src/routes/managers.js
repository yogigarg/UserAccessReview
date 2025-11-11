const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { verifyToken, isAdminOrCompliance } = require('../middleware/auth');

// Manager-Employee Mapping routes
router.get('/hierarchy', verifyToken, managerController.getOrgHierarchy);
router.get('/org-chart', verifyToken, managerController.getOrgChart);
router.get('/employees/:managerId', verifyToken, managerController.getManagerEmployees);
router.post('/mapping', verifyToken, isAdminOrCompliance, managerController.createMapping);
router.put('/mapping/:id', verifyToken, isAdminOrCompliance, managerController.updateMapping);
router.delete('/mapping/:id', verifyToken, isAdminOrCompliance, managerController.deleteMapping);

// Delegate management
router.get('/delegates', verifyToken, managerController.getDelegates);
router.post('/delegates', verifyToken, managerController.createDelegate);
router.put('/delegates/:id', verifyToken, managerController.updateDelegate);
router.delete('/delegates/:id', verifyToken, managerController.deleteDelegate);

// HRMS Integration
router.post('/sync/hrms', verifyToken, isAdminOrCompliance, managerController.syncFromHRMS);
router.get('/sync/status', verifyToken, isAdminOrCompliance, managerController.getSyncStatus);

// Department management
router.get('/departments', verifyToken, managerController.getDepartments);
router.post('/departments', verifyToken, isAdminOrCompliance, managerController.createDepartment);
router.put('/departments/:id', verifyToken, isAdminOrCompliance, managerController.updateDepartment);

module.exports = router;