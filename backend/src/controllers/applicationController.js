const { query } = require('../config/database');
const { getPagination, buildPaginationResponse, successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Get all applications
// @route   GET /api/v1/applications
// @access  Private
const getApplications = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, applicationType, isActive } = req.query;
    const { limit: queryLimit, offset } = getPagination(page, limit);

    let whereConditions = ['organization_id = $1'];
    let params = [req.user.organizationId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      whereConditions.push(`(name ILIKE $${paramCount} OR code ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    if (applicationType) {
      paramCount++;
      whereConditions.push(`application_type = $${paramCount}`);
      params.push(applicationType);
    }

    if (isActive !== undefined) {
      paramCount++;
      whereConditions.push(`is_active = $${paramCount}`);
      params.push(isActive === 'true');
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM applications WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get applications
    params.push(queryLimit, offset);
    const result = await query(
      `SELECT a.*,
              u.first_name || ' ' || u.last_name as owner_name,
              (SELECT COUNT(*) FROM roles WHERE application_id = a.id) as role_count,
              (SELECT COUNT(*) FROM user_access WHERE application_id = a.id AND is_active = true) as active_access_count
       FROM applications a
       LEFT JOIN users u ON u.id = a.owner_id
       WHERE ${whereClause}
       ORDER BY a.name ASC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    return successResponse(
      res,
      buildPaginationResponse(result.rows, page, limit, total)
    );

  } catch (error) {
    logger.error('Get applications error:', error);
    return errorResponse(res, 'Failed to fetch applications', 500);
  }
};

// @desc    Get single application
// @route   GET /api/v1/applications/:id
// @access  Private
const getApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT a.*,
              u.first_name || ' ' || u.last_name as owner_name,
              u.email as owner_email,
              (SELECT COUNT(*) FROM roles WHERE application_id = a.id) as role_count,
              (SELECT COUNT(*) FROM user_access WHERE application_id = a.id AND is_active = true) as active_access_count,
              (SELECT COUNT(DISTINCT user_id) FROM user_access WHERE application_id = a.id AND is_active = true) as user_count
       FROM applications a
       LEFT JOIN users u ON u.id = a.owner_id
       WHERE a.id = $1 AND a.organization_id = $2`,
      [id, req.user.organizationId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Application not found', 404);
    }

    return successResponse(res, result.rows[0]);

  } catch (error) {
    logger.error('Get application error:', error);
    return errorResponse(res, 'Failed to fetch application', 500);
  }
};

// @desc    Create application
// @route   POST /api/v1/applications
// @access  Private/Admin
const createApplication = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      applicationType,
      vendor,
      ownerId,
      businessCriticality,
      complianceScope,
      connectorType,
    } = req.body;

    // Check if application code already exists
    const existing = await query(
      'SELECT id FROM applications WHERE code = $1 AND organization_id = $2',
      [code, req.user.organizationId]
    );

    if (existing.rows.length > 0) {
      return errorResponse(res, 'Application with this code already exists', 409);
    }

    const result = await query(
      `INSERT INTO applications (
        organization_id, name, code, description, application_type, vendor,
        owner_id, business_criticality, compliance_scope, connector_type, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        req.user.organizationId,
        name,
        code,
        description,
        applicationType,
        vendor,
        ownerId,
        businessCriticality,
        complianceScope,
        connectorType,
        true
      ]
    );

    const newApp = result.rows[0];

    // Log audit
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.organizationId, req.user.userId, 'create', 'application', newApp.id, name]
    );

    logger.info(`Application created: ${name} by ${req.user.email}`);

    return successResponse(res, newApp, 'Application created successfully', 201);

  } catch (error) {
    logger.error('Create application error:', error);
    return errorResponse(res, 'Failed to create application', 500);
  }
};

// @desc    Update application
// @route   PUT /api/v1/applications/:id
// @access  Private/Admin
const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if application exists
    const existing = await query(
      'SELECT * FROM applications WHERE id = $1 AND organization_id = $2',
      [id, req.user.organizationId]
    );

    if (existing.rows.length === 0) {
      return errorResponse(res, 'Application not found', 404);
    }

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(updates).forEach(key => {
      paramCount++;
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
    });

    if (fields.length === 0) {
      return errorResponse(res, 'No fields to update', 400);
    }

    paramCount++;
    values.push(id);

    const result = await query(
      `UPDATE applications SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    // Log audit
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.organizationId, req.user.userId, 'update', 'application', id, result.rows[0].name]
    );

    logger.info(`Application updated: ${id} by ${req.user.email}`);

    return successResponse(res, result.rows[0], 'Application updated successfully');

  } catch (error) {
    logger.error('Update application error:', error);
    return errorResponse(res, 'Failed to update application', 500);
  }
};

// @desc    Get application roles
// @route   GET /api/v1/applications/:id/roles
// @access  Private
const getApplicationRoles = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT r.*,
              (SELECT COUNT(*) FROM user_access WHERE role_id = r.id AND is_active = true) as assignment_count
       FROM roles r
       WHERE r.application_id = $1
       ORDER BY r.risk_level DESC, r.name ASC`,
      [id]
    );

    return successResponse(res, result.rows);

  } catch (error) {
    logger.error('Get application roles error:', error);
    return errorResponse(res, 'Failed to fetch application roles', 500);
  }
};

// @desc    Get application users
// @route   GET /api/v1/applications/:id/users
// @access  Private
const getApplicationUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const { limit: queryLimit, offset } = getPagination(page, limit);

    // Get total count
    const countResult = await query(
      `SELECT COUNT(DISTINCT ua.user_id) as total
       FROM user_access ua
       WHERE ua.application_id = $1 AND ua.is_active = true`,
      [id]
    );

    const total = parseInt(countResult.rows[0].total);

    // Get users
    const result = await query(
      `SELECT DISTINCT u.id, u.employee_id, u.first_name, u.last_name, u.email,
              u.job_title, u.status,
              d.name as department_name,
              (SELECT COUNT(*) FROM user_access WHERE user_id = u.id AND application_id = $1 AND is_active = true) as role_count
       FROM users u
       JOIN user_access ua ON ua.user_id = u.id
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE ua.application_id = $1 AND ua.is_active = true
       ORDER BY u.last_name, u.first_name
       LIMIT $2 OFFSET $3`,
      [id, queryLimit, offset]
    );

    return successResponse(
      res,
      buildPaginationResponse(result.rows, page, limit, total)
    );

  } catch (error) {
    logger.error('Get application users error:', error);
    return errorResponse(res, 'Failed to fetch application users', 500);
  }
};

module.exports = {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  getApplicationRoles,
  getApplicationUsers,
};