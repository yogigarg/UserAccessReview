const { query } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Generate campaign report
// @route   GET /api/v1/reports/campaign/:id
// @access  Private/Admin/ComplianceManager
const generateCampaignReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;
    const organizationId = req.user.organization_id || req.user.organizationId;

    // Get campaign details
    const campaignResult = await query(
      `SELECT c.*, 
              u.first_name || ' ' || u.last_name as created_by_name
       FROM campaigns c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = $1 AND c.organization_id = $2`,
      [id, organizationId]
    );

    if (campaignResult.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', 404);
    }

    const campaign = campaignResult.rows[0];

    // Get review items summary
    const reviewSummary = await query(
      `SELECT 
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE decision = 'approved') as approved,
        COUNT(*) FILTER (WHERE decision = 'revoked') as revoked,
        COUNT(*) FILTER (WHERE decision = 'exception') as exceptions,
        COUNT(*) FILTER (WHERE decision = 'pending') as pending
       FROM review_items
       WHERE campaign_id = $1`,
      [id]
    );

    const reportData = {
      campaign,
      summary: reviewSummary.rows[0],
    };

    // If format is CSV, convert to CSV (simplified)
    if (format === 'csv') {
      return res
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="campaign-report-${id}.csv"`)
        .send('CSV export not yet implemented');
    }

    // Log report generation
    try {
      await query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [organizationId, req.user.id || req.user.userId, 'export', 'campaign_report', id]
      );
    } catch (auditError) {
      logger.error('Audit log failed:', auditError);
    }

    return successResponse(res, reportData, 'Report generated successfully');

  } catch (error) {
    logger.error('Generate campaign report error:', error);
    return errorResponse(res, 'Failed to generate campaign report', 500);
  }
};

// @desc    Get SOD violations report
// @route   GET /api/v1/reports/sod-violations
// @access  Private/Admin/ComplianceManager
const getSODViolationsReport = async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;

    // Get summary by severity
    const summaryResult = await query(
      `SELECT 
        sr.severity,
        COUNT(DISTINCT sr.id) as total_rules,
        COUNT(sv.id) as total_violations,
        COUNT(sv.id) FILTER (WHERE sv.is_resolved = false) as unresolved,
        COUNT(sv.id) FILTER (WHERE sv.is_resolved = true) as resolved
       FROM sod_rules sr
       LEFT JOIN sod_violations sv ON sv.rule_id = sr.id
       WHERE sr.organization_id = $1 AND sr.is_active = true
       GROUP BY sr.severity
       ORDER BY 
         CASE sr.severity 
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END`,
      [organizationId]
    );

    // Get detailed violations
    const violationsResult = await query(
      `SELECT 
        sv.id,
        sv.rule_id,
        sv.user_id,
        sv.detected_at,
        sv.resolved_at,
        sv.is_resolved,
        sv.resolution_action,
        sr.name as rule_name,
        sr.severity,
        sr.process_area,
        sr.conflicting_roles,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        u.employee_id,
        d.name as department_name
       FROM sod_violations sv
       JOIN sod_rules sr ON sr.id = sv.rule_id
       JOIN users u ON u.id = sv.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE sr.organization_id = $1
       ORDER BY sv.detected_at DESC
       LIMIT 100`,
      [organizationId]
    );

    return successResponse(res, {
      summary: summaryResult.rows,
      violations: violationsResult.rows,
    });

  } catch (error) {
    logger.error('Get SOD violations report error:', error);
    return errorResponse(res, 'Failed to generate SOD violations report', 500);
  }
};

// @desc    Get dormant accounts report
// @route   GET /api/v1/reports/dormant-accounts
// @access  Private/Admin/ComplianceManager
const getDormantAccountsReport = async (req, res) => {
  try {
    const { daysInactive = 90 } = req.query;
    const organizationId = req.user.organization_id || req.user.organizationId;

    const result = await query(
      `SELECT 
        u.id,
        u.employee_id,
        u.first_name,
        u.last_name,
        u.email,
        u.status,
        u.last_login_at,
        d.name as department_name,
        (SELECT COUNT(*) FROM user_access WHERE user_id = u.id AND is_active = true) as active_access_count,
        CASE 
          WHEN u.last_login_at IS NULL THEN 999999
          ELSE EXTRACT(DAY FROM (CURRENT_TIMESTAMP - u.last_login_at))::INTEGER
        END as days_since_login
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.organization_id = $1
         AND u.status = 'active'
         AND (
           u.last_login_at IS NULL 
           OR u.last_login_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * $2
         )
       ORDER BY days_since_login DESC`,
      [organizationId, daysInactive]
    );

    return successResponse(res, result.rows);

  } catch (error) {
    logger.error('Get dormant accounts report error:', error);
    return errorResponse(res, 'Failed to generate dormant accounts report', 500);
  }
};

// @desc    Get access recertification summary
// @route   GET /api/v1/reports/recertification-summary
// @access  Private/Admin/ComplianceManager
const getRecertificationSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const organizationId = req.user.organization_id || req.user.organizationId;

    let dateFilter = '';
    const params = [organizationId];

    if (startDate && endDate) {
      dateFilter = 'AND c.start_date >= $2 AND c.end_date <= $3';
      params.push(startDate, endDate);
    }

    const result = await query(
      `SELECT 
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed') as completed_campaigns,
        COALESCE(SUM(c.total_reviews), 0) as total_reviews,
        COALESCE(SUM(c.completed_reviews), 0) as completed_reviews,
        COALESCE(SUM(c.approved_count), 0) as total_approved,
        COALESCE(SUM(c.revoked_count), 0) as total_revoked,
        COALESCE(SUM(c.exception_count), 0) as total_exceptions,
        ROUND(AVG(c.completion_percentage), 2) as avg_completion_rate
       FROM campaigns c
       WHERE c.organization_id = $1 ${dateFilter}`,
      params
    );

    // Get campaign breakdown
    const campaignBreakdown = await query(
      `SELECT c.id, c.name, c.campaign_type, c.status,
              c.start_date, c.end_date, c.completion_percentage,
              c.total_reviews, c.completed_reviews,
              c.approved_count, c.revoked_count, c.exception_count
       FROM campaigns c
       WHERE c.organization_id = $1 ${dateFilter}
       ORDER BY c.start_date DESC`,
      params
    );

    return successResponse(res, {
      summary: result.rows[0],
      campaigns: campaignBreakdown.rows,
    });

  } catch (error) {
    logger.error('Get recertification summary error:', error);
    return errorResponse(res, 'Failed to generate recertification summary', 500);
  }
};

// @desc    Get user access report
// @route   GET /api/v1/reports/user-access/:userId
// @access  Private
const getUserAccessReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const organizationId = req.user.organization_id || req.user.organizationId;

    // Get user details
    const userResult = await query(
      `SELECT u.*, d.name as department_name,
              m.first_name || ' ' || m.last_name as manager_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN users m ON m.id = u.manager_id
       WHERE u.id = $1 AND u.organization_id = $2`,
      [userId, organizationId]
    );

    if (userResult.rows.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const user = userResult.rows[0];

    // Get user's access
    const accessResult = await query(
      `SELECT 
        ua.id,
        ua.granted_date,
        ua.last_reviewed_date,
        a.name as application_name,
        a.code as application_code,
        r.name as role_name,
        r.description as role_description
       FROM user_access ua
       JOIN applications a ON a.id = ua.application_id
       LEFT JOIN roles r ON r.id = ua.role_id
       WHERE ua.user_id = $1 AND ua.is_active = true
       ORDER BY a.name, r.name`,
      [userId]
    );

    // Get user's review history
    const reviewHistory = await query(
      `SELECT c.name as campaign_name, ri.decision, ri.decision_date,
              ri.rationale, reviewer.first_name || ' ' || reviewer.last_name as reviewer_name
       FROM review_items ri
       JOIN campaigns c ON c.id = ri.campaign_id
       JOIN users reviewer ON reviewer.id = ri.reviewer_id
       WHERE ri.user_id = $1
       ORDER BY ri.decision_date DESC
       LIMIT 10`,
      [userId]
    );

    // Get SOD violations
    const sodViolations = await query(
      `SELECT sv.*, sr.name as rule_name, sr.severity
       FROM sod_violations sv
       JOIN sod_rules sr ON sr.id = sv.rule_id
       WHERE sv.user_id = $1
       ORDER BY sv.detected_at DESC`,
      [userId]
    );

    // Get risk profile if exists
    const riskProfile = await query(
      'SELECT * FROM risk_profiles WHERE user_id = $1',
      [userId]
    );

    return successResponse(res, {
      user,
      access: accessResult.rows,
      review_history: reviewHistory.rows,
      sod_violations: sodViolations.rows,
      risk_profile: riskProfile.rows[0] || null,
    });

  } catch (error) {
    logger.error('Get user access report error:', error);
    return errorResponse(res, 'Failed to generate user access report', 500);
  }
};

// @desc    Get audit log report
// @route   GET /api/v1/reports/audit-logs
// @access  Private/Admin
const getAuditLogReport = async (req, res) => {
  try {
    const { startDate, endDate, action, userId, entityType, limit = 100 } = req.query;
    const organizationId = req.user.organization_id || req.user.organizationId;

    let whereConditions = ['al.organization_id = $1'];
    const params = [organizationId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      whereConditions.push(`al.created_at >= $${paramCount}`);
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereConditions.push(`al.created_at <= $${paramCount}`);
      params.push(endDate);
    }

    if (action) {
      paramCount++;
      whereConditions.push(`al.action = $${paramCount}`);
      params.push(action);
    }

    if (userId) {
      paramCount++;
      whereConditions.push(`al.user_id = $${paramCount}`);
      params.push(userId);
    }

    if (entityType) {
      paramCount++;
      whereConditions.push(`al.entity_type = $${paramCount}`);
      params.push(entityType);
    }

    const whereClause = whereConditions.join(' AND ');

    paramCount++;
    params.push(limit);

    const result = await query(
      `SELECT al.*,
              u.first_name || ' ' || u.last_name as user_name,
              u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramCount}`,
      params
    );

    return successResponse(res, result.rows);

  } catch (error) {
    logger.error('Get audit log report error:', error);
    return errorResponse(res, 'Failed to generate audit log report', 500);
  }
};

// @desc    Export report (generic)
// @route   POST /api/v1/reports/export
// @access  Private/Admin/ComplianceManager
const exportReport = async (req, res) => {
  try {
    const { reportType, filters, format = 'json' } = req.body;
    const organizationId = req.user.organization_id || req.user.organizationId;
    const userId = req.user.id || req.user.userId;

    // This is a placeholder for report export functionality
    // In production, you would generate PDF/Excel reports here

    // Log export
    try {
      await query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          organizationId,
          userId,
          'export',
          'report',
          JSON.stringify({ report_type: reportType, format })
        ]
      );
    } catch (auditError) {
      logger.error('Audit log failed:', auditError);
    }

    return successResponse(res, {
      message: 'Report export initiated',
      reportType,
      format,
    }, 'Export started');

  } catch (error) {
    logger.error('Export report error:', error);
    return errorResponse(res, 'Failed to export report', 500);
  }
};

module.exports = {
  generateCampaignReport,
  getSODViolationsReport,
  getDormantAccountsReport,
  getRecertificationSummary,
  getUserAccessReport,
  getAuditLogReport,
  exportReport,
};
