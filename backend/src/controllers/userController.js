const { query } = require('../config/database');
const { successResponse, errorResponse, getPaginationParams } = require('../utils/helpers');
const logger = require('../utils/logger');

// Get all users
const getUsers = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { search, status, role, department_id } = req.query;

    let whereClause = 'WHERE u.organization_id = $1';
    const params = [req.user.organization_id];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (
        u.first_name ILIKE $${params.length} OR 
        u.last_name ILIKE $${params.length} OR 
        u.email ILIKE $${params.length} OR 
        u.employee_id ILIKE $${params.length}
      )`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND u.status = $${params.length}`;
    }

    if (role) {
      params.push(role);
      whereClause += ` AND u.role = $${params.length}`;
    }

    if (department_id) {
      params.push(department_id);
      whereClause += ` AND u.department_id = $${params.length}`;
    }

    const usersQuery = `
      SELECT 
        u.id,
        u.employee_id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.status,
        u.job_title,
        u.hire_date,
        d.name as department_name,
        m.first_name || ' ' || m.last_name as manager_name,
        COUNT(DISTINCT ua.id) as access_count
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN users m ON m.id = u.manager_id
      LEFT JOIN user_access ua ON ua.user_id = u.id
      ${whereClause}
      GROUP BY u.id, d.name, m.first_name, m.last_name
      ORDER BY u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const countQuery = `SELECT COUNT(*) FROM users u ${whereClause}`;
    
    const [users, countResult] = await Promise.all([
      query(usersQuery, params),
      query(countQuery, params.slice(0, -2))
    ]);

    return successResponse(res, users.rows, 'Users retrieved successfully', 200, {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    logger.error('Get users error:', error);
    return errorResponse(res, 'Failed to get users', 500);
  }
};

// Get single user
const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userQuery = `
      SELECT 
        u.*,
        d.name as department_name,
        m.first_name || ' ' || m.last_name as manager_name,
        o.name as organization_name,
        COUNT(DISTINCT ua.id) as active_access_count,
        COUNT(DISTINCT sv.id) as sod_violation_count,
        COALESCE(AVG(ua.risk_score), 0) as risk_score
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN users m ON m.id = u.manager_id
      LEFT JOIN organizations o ON o.id = u.organization_id
      LEFT JOIN user_access ua ON ua.user_id = u.id
      LEFT JOIN sod_violations sv ON sv.user_id = u.id AND sv.status = 'active'
      WHERE u.id = $1 AND u.organization_id = $2
      GROUP BY u.id, d.name, m.first_name, m.last_name, o.name
    `;

    const result = await query(userQuery, [id, req.user.organization_id]);

    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    // Remove password hash
    const { password_hash, ...user } = result.rows[0];

    return successResponse(res, user);
  } catch (error) {
    logger.error('Get user error:', error);
    return errorResponse(res, 'Failed to get user', 500);
  }
};

// Create user
const createUser = async (req, res) => {
  try {
    const {
      employee_id,
      first_name,
      last_name,
      email,
      role = 'user',
      status = 'active',
      job_title,
      department_name,
      hire_date
    } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return errorResponse(res, 'User with this email already exists', 400);
    }

    // Find or create department
    let departmentId = null;
    if (department_name) {
      const dept = await query(
        'SELECT id FROM departments WHERE name = $1 AND organization_id = $2',
        [department_name, req.user.organization_id]
      );
      
      if (dept.rows.length > 0) {
        departmentId = dept.rows[0].id;
      } else {
        const newDept = await query(
          'INSERT INTO departments (organization_id, name) VALUES ($1, $2) RETURNING id',
          [req.user.organization_id, department_name]
        );
        departmentId = newDept.rows[0].id;
      }
    }

    // Generate default password (should be changed on first login)
    const defaultPassword = 'ChangeMe@123';
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const result = await query(
      `INSERT INTO users (
        organization_id, employee_id, first_name, last_name, email,
        password_hash, role, status, job_title, department_id, hire_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        req.user.organization_id,
        employee_id,
        first_name,
        last_name,
        email.toLowerCase(),
        passwordHash,
        role,
        status,
        job_title,
        departmentId,
        hire_date
      ]
    );

    const { password_hash, ...user } = result.rows[0];

    logger.info('User created:', { userId: user.id, createdBy: req.user.email });

    return successResponse(res, user, 'User created successfully. Default password: ChangeMe@123', 201);
  } catch (error) {
    logger.error('Create user error:', error);
    return errorResponse(res, 'Failed to create user', 500);
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employee_id,
      first_name,
      last_name,
      email,
      role,
      status,
      job_title,
      department_name,
      hire_date
    } = req.body;

    // Find or create department
    let departmentId = null;
    if (department_name) {
      const dept = await query(
        'SELECT id FROM departments WHERE name = $1 AND organization_id = $2',
        [department_name, req.user.organization_id]
      );
      
      if (dept.rows.length > 0) {
        departmentId = dept.rows[0].id;
      } else {
        const newDept = await query(
          'INSERT INTO departments (organization_id, name) VALUES ($1, $2) RETURNING id',
          [req.user.organization_id, department_name]
        );
        departmentId = newDept.rows[0].id;
      }
    }

    const result = await query(
      `UPDATE users 
       SET employee_id = COALESCE($1, employee_id),
           first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           email = COALESCE($4, email),
           role = COALESCE($5, role),
           status = COALESCE($6, status),
           job_title = COALESCE($7, job_title),
           department_id = COALESCE($8, department_id),
           hire_date = COALESCE($9, hire_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND organization_id = $11
       RETURNING *`,
      [
        employee_id,
        first_name,
        last_name,
        email?.toLowerCase(),
        role,
        status,
        job_title,
        departmentId,
        hire_date,
        id,
        req.user.organization_id
      ]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const { password_hash, ...user } = result.rows[0];

    return successResponse(res, user, 'User updated successfully');
  } catch (error) {
    logger.error('Update user error:', error);
    return errorResponse(res, 'Failed to update user', 500);
  }
};

// Delete user (soft delete by setting status to terminated)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE users 
       SET status = 'terminated', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2
       RETURNING id`,
      [id, req.user.organization_id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, null, 'User deleted successfully');
  } catch (error) {
    logger.error('Delete user error:', error);
    return errorResponse(res, 'Failed to delete user', 500);
  }
};

// Get user access
const getUserAccess = async (req, res) => {
  try {
    const { id } = req.params;

    const accessQuery = `
      SELECT 
        ua.*,
        a.name as application_name,
        a.code as application_code,
        r.name as role_name,
        r.risk_level,
        CASE 
          WHEN ua.last_used_date IS NULL THEN 'never_used'
          WHEN ua.last_used_date < CURRENT_DATE - INTERVAL '90 days' THEN 'dormant'
          ELSE 'active'
        END as usage_status
      FROM user_access ua
      JOIN applications a ON a.id = ua.application_id
      LEFT JOIN application_roles r ON r.id = ua.role_id
      WHERE ua.user_id = $1 AND ua.organization_id = $2
      ORDER BY a.name, r.name
    `;

    const result = await query(accessQuery, [id, req.user.organization_id]);

    return successResponse(res, result.rows);
  } catch (error) {
    logger.error('Get user access error:', error);
    return errorResponse(res, 'Failed to get user access', 500);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserAccess,
};