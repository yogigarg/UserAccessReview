const { query, transaction } = require('../config/database');
const { getPagination, buildPaginationResponse, successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Get all SOD rules
// @route   GET /api/sod/rules
// @access  Private/Admin/ComplianceManager
const getSODRules = async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, isActive } = req.query;
    const { limit: queryLimit, offset } = getPagination(page, limit);

    let whereConditions = ['organization_id = $1'];
    const params = [req.user.organization_id];
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

    // Get rules with violation count
    params.push(queryLimit, offset);
    const result = await query(
      `SELECT sr.*,
              (SELECT COUNT(*) 
               FROM sod_violations sv 
               WHERE sv.rule_id = sr.id 
               AND sv.is_resolved = false) as active_violation_count,
              srt.name as template_name
       FROM sod_rules sr
       LEFT JOIN sod_rule_templates srt ON srt.id = sr.template_id
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
// @route   GET /api/sod/rules/:id
// @access  Private/Admin/ComplianceManager
const getSODRule = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT sr.*,
              (SELECT COUNT(*) FROM sod_violations WHERE rule_id = sr.id) as total_violations,
              (SELECT COUNT(*) FROM sod_violations WHERE rule_id = sr.id AND is_resolved = false) as active_violations,
              (SELECT COUNT(*) FROM sod_violations WHERE rule_id = sr.id AND is_resolved = true) as resolved_violations,
              srt.name as template_name,
              srt.description as template_description
       FROM sod_rules sr
       LEFT JOIN sod_rule_templates srt ON srt.id = sr.template_id
       WHERE sr.id = $1 AND sr.organization_id = $2`,
      [id, req.user.organization_id]
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
// @route   POST /api/sod/rules
// @access  Private/Admin/ComplianceManager
const createSODRule = async (req, res) => {
  try {
    const {
      name,
      description,
      severity = 'medium',
      processArea,
      conflictingRoles,
      applicationIds = [],
      autoRemediate = false,
      requiresExceptionApproval = true,
      templateId = null,
    } = req.body;

    // Validate severity
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    if (!validSeverities.includes(severity)) {
      return errorResponse(res, 'Invalid severity level', 400);
    }

    const result = await query(
      `INSERT INTO sod_rules (
        organization_id, template_id, name, description, severity, 
        process_area, conflicting_roles, application_ids, 
        auto_remediate, requires_exception_approval, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        req.user.organization_id,
        templateId,
        name,
        description,
        severity,
        processArea,
        JSON.stringify(conflictingRoles || []),
        applicationIds,
        autoRemediate,
        requiresExceptionApproval,
        true
      ]
    );

    const newRule = result.rows[0];

    // Log audit
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name, success, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.user.organization_id, 
        req.user.id, 
        'create', 
        'sod_rule', 
        newRule.id, 
        name,
        true,
        req.ip || req.connection.remoteAddress,
        JSON.stringify({ severity, process_area: processArea })
      ]
    );

    logger.info(`SOD rule created: ${name} by ${req.user.email}`);

    return successResponse(res, newRule, 'SOD rule created successfully', 201);

  } catch (error) {
    logger.error('Create SOD rule error:', error);
    return errorResponse(res, 'Failed to create SOD rule', 500);
  }
};

// @desc    Update SOD rule
// @route   PUT /api/sod/rules/:id
// @access  Private/Admin/ComplianceManager
const updateSODRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if rule exists
    const existing = await query(
      'SELECT * FROM sod_rules WHERE id = $1 AND organization_id = $2',
      [id, req.user.organization_id]
    );

    if (existing.rows.length === 0) {
      return errorResponse(res, 'SOD rule not found', 404);
    }

    // Build dynamic update query with proper field mapping
    const fields = [];
    const values = [];
    let paramCount = 0;

    // Map of camelCase to snake_case
    const fieldMapping = {
      name: 'name',
      description: 'description',
      severity: 'severity',
      processArea: 'process_area',
      conflictingRoles: 'conflicting_roles',
      applicationIds: 'application_ids',
      autoRemediate: 'auto_remediate',
      requiresExceptionApproval: 'requires_exception_approval',
      isActive: 'is_active',
      templateId: 'template_id',
    };

    Object.keys(updates).forEach(key => {
      const dbColumn = fieldMapping[key];
      if (!dbColumn) return; // Skip unknown fields

      paramCount++;
      
      if (key === 'conflictingRoles') {
        fields.push(`${dbColumn} = $${paramCount}`);
        values.push(JSON.stringify(updates[key]));
      } else if (key === 'severity') {
        // Validate severity
        const validSeverities = ['critical', 'high', 'medium', 'low'];
        if (validSeverities.includes(updates[key])) {
          fields.push(`${dbColumn} = $${paramCount}`);
          values.push(updates[key]);
        } else {
          paramCount--;
        }
      } else {
        fields.push(`${dbColumn} = $${paramCount}`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return errorResponse(res, 'No valid fields to update', 400);
    }

    paramCount++;
    values.push(id);

    const result = await query(
      `UPDATE sod_rules 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    // Log audit
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name, success, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.user.organization_id, 
        req.user.id, 
        'update', 
        'sod_rule', 
        id, 
        result.rows[0].name,
        true,
        req.ip || req.connection.remoteAddress,
        JSON.stringify(updates)
      ]
    );

    logger.info(`SOD rule updated: ${id} by ${req.user.email}`);

    return successResponse(res, result.rows[0], 'SOD rule updated successfully');

  } catch (error) {
    logger.error('Update SOD rule error:', error);
    return errorResponse(res, 'Failed to update SOD rule', 500);
  }
};

// @desc    Delete SOD rule
// @route   DELETE /api/sod/rules/:id
// @access  Private/Admin
const deleteSODRule = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT * FROM sod_rules WHERE id = $1 AND organization_id = $2',
      [id, req.user.organization_id]
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
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name, success, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user.organization_id, 
        req.user.id, 
        'delete', 
        'sod_rule', 
        id, 
        existing.rows[0].name,
        true,
        req.ip || req.connection.remoteAddress
      ]
    );

    logger.info(`SOD rule deleted: ${id} by ${req.user.email}`);

    return successResponse(res, null, 'SOD rule deleted successfully');

  } catch (error) {
    logger.error('Delete SOD rule error:', error);
    return errorResponse(res, 'Failed to delete SOD rule', 500);
  }
};

// @desc    Get SOD violations
// @route   GET /api/sod/violations
// @access  Private/Admin/ComplianceManager
const getSODViolations = async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, isResolved, userId } = req.query;
    const { limit: queryLimit, offset } = getPagination(page, limit);

    // Note: sod_violations table doesn't have organization_id, 
    // so we filter through users table
    let whereConditions = ['u.organization_id = $1'];
    const params = [req.user.organization_id];
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

    // Get violations with full details
    params.push(queryLimit, offset);
    const result = await query(
      `SELECT 
        sv.id,
        sv.rule_id,
        sv.user_id,
        sv.violation_details,
        sv.detected_at,
        sv.resolved_at,
        sv.resolution_action,
        sv.resolved_by,
        sv.resolution_notes,
        sv.exception_expiry,
        sv.risk_assessment,
        sv.is_resolved,
        sv.created_at,
        sv.updated_at,
        sr.name as rule_name,
        sr.description as rule_description,
        sr.severity,
        sr.process_area,
        sr.conflicting_roles,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        u.employee_id,
        resolver.first_name || ' ' || resolver.last_name as resolved_by_name
       FROM sod_violations sv
       JOIN sod_rules sr ON sr.id = sv.rule_id
       JOIN users u ON u.id = sv.user_id
       LEFT JOIN users resolver ON resolver.id = sv.resolved_by
       WHERE ${whereClause}
       ORDER BY sv.detected_at DESC
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
// @route   POST /api/sod/violations/:id/resolve
// @access  Private/Admin/ComplianceManager
const resolveSODViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionAction, resolutionNotes, exceptionExpiry, riskAssessment } = req.body;

    const validActions = ['revoked', 'exception_granted', 'mitigating_control'];
    if (!validActions.includes(resolutionAction)) {
      return errorResponse(res, 'Invalid resolution action', 400);
    }

    // Check if violation exists and belongs to organization
    const existing = await query(
      `SELECT sv.*, u.organization_id 
       FROM sod_violations sv
       JOIN users u ON u.id = sv.user_id
       WHERE sv.id = $1 AND u.organization_id = $2`,
      [id, req.user.organization_id]
    );

    if (existing.rows.length === 0) {
      return errorResponse(res, 'SOD violation not found', 404);
    }

    const result = await query(
      `UPDATE sod_violations
       SET is_resolved = true,
           resolved_at = CURRENT_TIMESTAMP,
           resolution_action = $1,
           resolution_notes = $2,
           exception_expiry = $3,
           resolved_by = $4,
           risk_assessment = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        resolutionAction, 
        resolutionNotes, 
        exceptionExpiry, 
        req.user.id,
        riskAssessment ? JSON.stringify(riskAssessment) : null,
        id
      ]
    );

    // Log audit
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, new_values, success, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user.organization_id,
        req.user.id,
        'update',
        'sod_violation',
        id,
        JSON.stringify({ 
          resolution_action: resolutionAction,
          exception_expiry: exceptionExpiry 
        }),
        true,
        req.ip || req.connection.remoteAddress
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
// @route   POST /api/sod/detect/:userId
// @access  Private/Admin/ComplianceManager
const detectUserViolations = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user belongs to same organization
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
      [userId, req.user.organization_id]
    );

    if (userCheck.rows.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check if detect_sod_violations function exists
    const result = await query(
      'SELECT * FROM detect_sod_violations($1)',
      [userId]
    );

    return successResponse(res, result.rows, `Found ${result.rows.length} potential violations`);

  } catch (error) {
    logger.error('Detect user violations error:', error);
    
    // If function doesn't exist, provide helpful error
    if (error.code === '42883') {
      return errorResponse(res, 'SOD detection function not configured. Please contact administrator.', 500);
    }
    
    return errorResponse(res, 'Failed to detect violations', 500);
  }
};

// @desc    Get SOD rule templates
// @route   GET /api/sod/templates
// @access  Private/Admin/ComplianceManager
const getSODTemplates = async (req, res) => {
  try {
    const { processArea, isStandard } = req.query;

    let whereConditions = [];
    const params = [];
    let paramCount = 0;

    if (processArea) {
      paramCount++;
      whereConditions.push(`process_area = $${paramCount}`);
      params.push(processArea);
    }

    if (isStandard !== undefined) {
      paramCount++;
      whereConditions.push(`is_standard = $${paramCount}`);
      params.push(isStandard === 'true');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT * FROM sod_rule_templates
       ${whereClause}
       ORDER BY process_area, name`,
      params
    );

    return successResponse(res, result.rows);

  } catch (error) {
    logger.error('Get SOD templates error:', error);
    return errorResponse(res, 'Failed to fetch SOD templates', 500);
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
  getSODTemplates,
};