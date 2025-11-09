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

    // Use the stored procedure to generate report
    const result = await query(
      'SELECT generate_campaign_report($1) as report_data',
      [id]
    );

    if (!result.rows[0].report_data) {
      return errorResponse(res, 'Campaign not found', 404);
    }

    const reportData = result.rows[0].report_data;

    // If format is CSV, convert to CSV (simplified)
    if (format === 'csv') {
      // This is a placeholder - in production, use a proper CSV library
      return res
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="campaign-report-${id}.csv"`)
        .send('CSV export not yet implemented');
    }

    // Log report generation
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.organizationId, req.user.userId, 'export', 'campaign_report', id]
    );

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
    const result = await query(
      'SELECT * FROM get_sod_violations_report($1)',
      [req.user.organizationId]
    );

    // Get detailed violations
    const detailedViolations = await query(
      `SELECT * FROM v_sod_violations_detail
       WHERE department_name IN (
         SELECT d.name FROM departments d WHERE d.organization_id = $1
       )
       ORDER BY detected_at DESC`,
      [req.user.organizationId]
    );

    return successResponse(res, {
      summary: result.rows,
      violations: detailedViolations.rows,
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

    const result = await query(
      'SELECT * FROM get_dormant_accounts_report($1, $2)',
      [req.user.organizationId, daysInactive]
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

    let dateFilter = '';
    const params = [req.user.organizationId];

    if (startDate && endDate) {
      dateFilter = 'AND c.start_date >= $2 AND c.end_date <= $3';
      params.push(startDate, endDate);
    }

    const result = await query(
      `SELECT 
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed') as completed_campaigns,
        SUM(c.total_reviews) as total_reviews,
        SUM(c.completed_reviews) as completed_reviews,
        SUM(c.approved_count) as total_approved,
        SUM(c.revoked_count) as total_revoked,
        SUM(c.exception_count) as total_exceptions,
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

    // Get user details
    const userResult = await query(
      `SELECT u.*, d.name as department_name,
              m.first_name || ' ' || m.last_name as manager_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN users m ON m.id = u.manager_id
       WHERE u.id = $1 AND u.organization_id = $2`,
      [userId, req.user.organizationId]
    );

    if (userResult.rows.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const user = userResult.rows[0];

    // Get user's access
    const accessResult = await query(
      `SELECT * FROM v_active_user_access WHERE user_id = $1`,
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

    // Get risk profile
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

    let whereConditions = ['organization_id = $1'];
    const params = [req.user.organizationId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      whereConditions.push(`created_at >= $${paramCount}`);
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      whereConditions.push(`created_at <= $${paramCount}`);
      params.push(endDate);
    }

    if (action) {
      paramCount++;
      whereConditions.push(`action = $${paramCount}`);
      params.push(action);
    }

    if (userId) {
      paramCount++;
      whereConditions.push(`user_id = $${paramCount}`);
      params.push(userId);
    }

    if (entityType) {
      paramCount++;
      whereConditions.push(`entity_type = $${paramCount}`);
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

    // This is a placeholder for report export functionality
    // In production, you would generate PDF/Excel reports here

    // Log export
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.organizationId,
        req.user.userId,
        'export',
        'report',
        JSON.stringify({ report_type: reportType, format })
      ]
    );

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