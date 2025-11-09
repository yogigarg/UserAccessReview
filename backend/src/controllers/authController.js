const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const config = require('../config/config');
const { 
  successResponse, 
  errorResponse, 
  hashPassword, 
  comparePassword, 
  generateToken 
} = require('../utils/helpers');
const logger = require('../utils/logger');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email });

    // Check if user exists
    const result = await query(
      `SELECT u.*, o.name as organization_name, d.name as department_name
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      console.log('User not found:', email);
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const user = result.rows[0];
    console.log('User found:', {
      id: user.id,
      email: user.email,
      organization_id: user.organization_id,
      role: user.role
    });

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    console.log('Password valid?', isPasswordValid);
    
    if (!isPasswordValid) {
      // Log failed login attempt
      await query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, success, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.organization_id, user.id, 'login', 'user', user.id, false, req.ip]
      );
      
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check if user is active
    if (user.status !== 'active') {
      return errorResponse(res, 'User account is not active', 403);
    }

    // Generate tokens with userId in payload
    const token = generateToken({ 
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id
    });
    
    const refreshToken = generateToken({ 
      userId: user.id 
    }, config.jwt.refreshSecret, config.jwt.refreshExpire);

    console.log('Token generated for user:', user.id);

    // Update last login
    await query(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );

    // Log successful login
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, success, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.organization_id, user.id, 'login', 'user', user.id, true, req.ip]
    );

    // Remove sensitive data
    const sanitizedUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      status: user.status,
      organization_id: user.organization_id,
      organization_name: user.organization_name,
      department_id: user.department_id,
      department_name: user.department_name,
      job_title: user.job_title,
    };

    console.log('Login successful, returning user data');

    return successResponse(res, {
      user: sanitizedUser,
      token,
      refreshToken,
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    logger.error('Login error:', error);
    return errorResponse(res, 'Login failed', 500);
  }
};

const getMe = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.*, o.name as organization_name, d.name as department_name
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const user = result.rows[0];

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      status: user.status,
      organization_id: user.organization_id,
      organization_name: user.organization_name,
      department_id: user.department_id,
      department_name: user.department_name,
      job_title: user.job_title,
    };

    return successResponse(res, sanitizedUser);
  } catch (error) {
    logger.error('Get current user error:', error);
    return errorResponse(res, 'Failed to get user info', 500);
  }
};

const logout = async (req, res) => {
  try {
    // Log logout action
    if (req.user && req.user.organization_id) {
      await query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, success, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.organization_id, req.user.id, 'logout', 'user', req.user.id, true, req.ip]
      );
    }

    return successResponse(res, null, 'Logout successful');
  } catch (error) {
    logger.error('Logout error:', error);
    return errorResponse(res, 'Logout failed', 500);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 'Refresh token required', 400);
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

    const result = await query(
      'SELECT * FROM users WHERE id = $1 AND status = $2',
      [decoded.userId, 'active']
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found or inactive', 401);
    }

    const user = result.rows[0];

    const newToken = generateToken({ 
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id
    });

    return successResponse(res, { token: newToken });
  } catch (error) {
    logger.error('Refresh token error:', error);
    return errorResponse(res, 'Invalid refresh token', 401);
  }
};

module.exports = {
  login,
  getMe,
  logout,
  refreshToken,
};