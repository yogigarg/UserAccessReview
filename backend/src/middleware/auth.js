const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const config = require('../config/config');
const { errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return errorResponse(res, 'No token provided', 401);
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    console.log('JWT Decoded:', decoded); // Debug log

    // Fetch full user details from database
    const result = await query(
      `SELECT 
        u.id, 
        u.email, 
        u.first_name, 
        u.last_name, 
        u.role, 
        u.status,
        u.organization_id,
        u.department_id
       FROM users u
       WHERE u.id = $1 AND u.status = 'active'`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found or inactive', 401);
    }

    const user = result.rows[0];
    
    console.log('User from DB:', user); // Debug log
    console.log('Organization ID:', user.organization_id); // Debug log

    req.user = user;
    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired', 401);
    }
    
    return errorResponse(res, 'Authentication failed', 401);
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return errorResponse(res, 'Admin access required', 403);
  }
  next();
};

const isAdminOrCompliance = (req, res, next) => {
  if (!['admin', 'compliance_manager'].includes(req.user.role)) {
    return errorResponse(res, 'Admin or Compliance Manager access required', 403);
  }
  next();
};

module.exports = {
  verifyToken,
  isAdmin,
  isAdminOrCompliance,
};