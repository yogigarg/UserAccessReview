const { query, transaction } = require('../config/database');
const { getPagination, buildPaginationResponse, successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Get all SOD rules
// @route   GET /api/v1/sod/rules
// @access  Private/Admin/ComplianceManager
const getSODRules = async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, isActive } = req.query;
    const { limit: queryLimit, offset } = getPagination(page, limit);

    let whereConditions = ['organization_id = $1'];
    const params = [req.user.organizationId];
    let paramCount = 1;

    if (severity) {
      paramCount++;
      whereConditions.push(`severity = $${paramCount}`);
      params.push(severity);
    }

    if (isActive !== undefined) {
      paramCount++;
      whereConditions.push(`is_active = $${paramCount}`);
      params.push(isActive === 'true');
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM sod_rules WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get rules
    params.push(queryLimit, offset);
    const result = await query(
      `SELECT sr.*,
              (SELECT COUNT(*) FROM sod_violations WHERE rule_id = sr.id AND is_resolved = false) as active_violation_count
       FROM sod_rules sr
       WHERE ${whereClause}
       ORDER BY sr.severity DESC, sr.name ASC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    return successResponse(
      res,
      buildPaginationResponse(result.rows, page, limit, total)
    );

  } catch (error) {
    logger.error('Get SOD rules error:', error);
    return errorResponse(res, 'Failed to fetch SOD rules', 500);
  }
};

// @desc    Get single SOD rule
// @route   GET /api/v1/sod/rules/:id
// @access  Private/Admin/ComplianceManager
const getSODRule = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT sr.*,
              (SELECT COUNT(*) FROM sod_violations WHERE rule_id = sr.id) as total_violations,
              (SELECT COUNT(*) FROM sod_violations WHERE rule_id = sr.id AND is_resolved = false) as active_violations,
              (SELECT COUNT(*) FROM sod_violations WHERE rule_id = sr.id AND is_resolved = true) as resolved_violations
       FROM sod_rules sr
       WHERE sr.id = $1 AND sr.organization_id = $2`,
      [id, req.user.organizationId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'SOD rule not found', 404);
    }

    return successResponse(res, result.rows[0]);

  } catch (error) {
    logger.error('Get SOD rule error:', error);
    return errorResponse(res, 'Failed to fetch SOD rule', 500);
  }
};

// @desc    Create SOD rule
// @route   POST /api/v1/sod/rules
// @access  Private/Admin/ComplianceManager
const createSODRule = async (req, res) => {
  try {
    const {
      name,
      description,
      severity,
      processArea,
      conflictingRoles,
      applicationIds,
      autoRemediate = false,
      requiresExceptionApproval = true,
    } = req.body;

    const result = await query(
      `INSERT INTO sod_rules (
        organization_id, name, description, severity, process_area,
        conflicting_roles, application_ids, auto_remediate,
        requires_exception_approval, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.user.organizationId,
        name,
        description,
        severity,
        processArea,
        JSON.stringify(conflictingRoles),
        applicationIds,
        autoRemediate,
        requiresExceptionApproval,
        true
      ]
    );

    const newRule = result.rows[0];

    // Log audit
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.organizationId, req.user.userId, 'create', 'sod_rule', newRule.id, name]
    );

    logger.info(`SOD rule created: ${name} by ${req.user.email}`);

    return successResponse(res, newRule, 'SOD rule created successfully', 201);

  } catch (error) {
    logger.error('Create SOD rule error:', error);
    return errorResponse(res, 'Failed to create SOD rule', 500);
  }
};

// @desc    Update SOD rule
// @route   PUT /api/v1/sod/rules/:id
// @access  Private/Admin/ComplianceManager
const updateSODRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if rule exists
    const existing = await query(
      'SELECT * FROM sod_rules WHERE id = $1 AND organization_id = $2',
      [id, req.user.organizationId]
    );

    if (existing.rows.length === 0) {
      return errorResponse(res, 'SOD rule not found', 404);
    }

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(updates).forEach(key => {
      paramCount++;
      if (key === 'conflictingRoles') {
        fields.push(`conflicting_roles = $${paramCount}`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return errorResponse(res, 'No fields to update', 400);
    }

    paramCount++;
    values.push(id);

    const result = await query(
      `UPDATE sod_rules SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    // Log audit
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.organizationId, req.user.userId, 'update', 'sod_rule', id, result.rows[0].name]
    );

    logger.info(`SOD rule updated: ${id} by ${req.user.email}`);

    return successResponse(res, result.rows[0], 'SOD rule updated successfully');

  } catch (error) {
    logger.error('Update SOD rule error:', error);
    return errorResponse(res, 'Failed to update SOD rule', 500);
  }
};

// @desc    Delete SOD rule
// @route   DELETE /api/v1/sod/rules/:id
// @access  Private/Admin
const deleteSODRule = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT * FROM sod_rules WHERE id = $1 AND organization_id = $2',
      [id, req.user.organizationId]
    );

    if (existing.rows.length === 0) {
      return errorResponse(res, 'SOD rule not found', 404);
    }

    // Soft delete (deactivate)
    await query(
      'UPDATE sod_rules SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Log audit
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.organizationId, req.user.userId, 'delete', 'sod_rule', id, existing.rows[0].name]
    );

    logger.info(`SOD rule deleted: ${id} by ${req.user.email}`);

    return successResponse(res, null, 'SOD rule deleted successfully');

  } catch (error) {
    logger.error('Delete SOD rule error:', error);
    return errorResponse(res, 'Failed to delete SOD rule', 500);
  }
};

// @desc    Get SOD violations
// @route   GET /api/v1/sod/violations
// @access  Private/Admin/ComplianceManager
const getSODViolations = async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, isResolved, userId } = req.query;
    const { limit: queryLimit, offset } = getPagination(page, limit);

    let whereConditions = ['u.organization_id = $1'];
    const params = [req.user.organizationId];
    let paramCount = 1;

    if (severity) {
      paramCount++;
      whereConditions.push(`sr.severity = $${paramCount}`);
      params.push(severity);
    }

    if (isResolved !== undefined) {
      paramCount++;
      whereConditions.push(`sv.is_resolved = $${paramCount}`);
      params.push(isResolved === 'true');
    }

    if (userId) {
      paramCount++;
      whereConditions.push(`sv.user_id = $${paramCount}`);
      params.push(userId);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM sod_violations sv
       JOIN users u ON u.id = sv.user_id
       JOIN sod_rules sr ON sr.id = sv.rule_id
       WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get violations
    params.push(queryLimit, offset);
    const result = await query(
      `SELECT * FROM v_sod_violations_detail
       WHERE department_name IN (SELECT d.name FROM departments d WHERE d.organization_id = $1)
         ${severity ? `AND severity = $2` : ''}
         ${isResolved !== undefined ? `AND is_resolved = $${isResolved === 'true' ? '3' : '2'}` : ''}
         ${userId ? `AND user_id = $${paramCount - 2}` : ''}
       ORDER BY detected_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    return successResponse(
      res,
      buildPaginationResponse(result.rows, page, limit, total)
    );

  } catch (error) {
    logger.error('Get SOD violations error:', error);
    return errorResponse(res, 'Failed to fetch SOD violations', 500);
  }
};

// @desc    Resolve SOD violation
// @route   POST /api/v1/sod/violations/:id/resolve
// @access  Private/Admin/ComplianceManager
const resolveSODViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionAction, resolutionNotes, exceptionExpiry } = req.body;

    const validActions = ['revoked', 'exception_granted', 'mitigating_control'];
    if (!validActions.includes(resolutionAction)) {
      return errorResponse(res, 'Invalid resolution action', 400);
    }

    const result = await query(
      `UPDATE sod_violations
       SET is_resolved = true,
           resolved_at = CURRENT_TIMESTAMP,
           resolution_action = $1,
           resolution_notes = $2,
           exception_expiry = $3,
           resolved_by = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [resolutionAction, resolutionNotes, exceptionExpiry, req.user.userId, id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'SOD violation not found', 404);
    }

    // Log audit
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.organizationId,
        req.user.userId,
        'update',
        'sod_violation',
        id,
        JSON.stringify({ resolution_action: resolutionAction })
      ]
    );

    logger.info(`SOD violation resolved: ${id} by ${req.user.email}`);

    return successResponse(res, result.rows[0], 'SOD violation resolved successfully');

  } catch (error) {
    logger.error('Resolve SOD violation error:', error);
    return errorResponse(res, 'Failed to resolve SOD violation', 500);
  }
};

// @desc    Detect SOD violations for a user
// @route   POST /api/v1/sod/detect/:userId
// @access  Private/Admin/ComplianceManager
const detectUserViolations = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      'SELECT * FROM detect_sod_violations($1)',
      [userId]
    );

    return successResponse(res, result.rows, `Found ${result.rows.length} potential violations`);

  } catch (error) {
    logger.error('Detect user violations error:', error);
    return errorResponse(res, 'Failed to detect violations', 500);
  }
};

module.exports = {
  getSODRules,
  getSODRule,
  createSODRule,
  updateSODRule,
  deleteSODRule,
  getSODViolations,
  resolveSODViolation,
  detectUserViolations,
};