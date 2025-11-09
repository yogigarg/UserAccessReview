const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, isAdmin, isAdminOrCompliance } = require('../middleware/auth');

// Remove validators temporarily to debug

router.get('/', verifyToken, isAdminOrCompliance, userController.getUsers);
router.get('/:id', verifyToken, userController.getUser);
router.post('/', verifyToken, isAdmin, userController.createUser);
router.put('/:id', verifyToken, isAdmin, userController.updateUser);
router.delete('/:id', verifyToken, isAdmin, userController.deleteUser);
router.get('/:id/access', verifyToken, userController.getUserAccess);

module.exports = router;