const { query } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Get dashboard statistics
// @route   GET /api/v1/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    // Get overall statistics
    const stats = await query(
      `SELECT 
        (SELECT COUNT(*) FROM users WHERE organization_id = $1 AND status = 'active') as total_users,
        (SELECT COUNT(*) FROM applications WHERE organization_id = $1 AND is_active = true) as total_applications,
        (SELECT COUNT(*) FROM user_access ua JOIN users u ON u.id = ua.user_id WHERE u.organization_id = $1 AND ua.is_active = true) as total_access_items,
        (SELECT COUNT(*) FROM campaigns WHERE organization_id = $1 AND status = 'active') as active_campaigns,
        (SELECT COUNT(*) FROM sod_violations sv JOIN users u ON u.id = sv.user_id WHERE u.organization_id = $1 AND sv.is_resolved = false) as active_sod_violations,
        (SELECT COUNT(DISTINCT ua.user_id) FROM user_access ua JOIN users u ON u.id = ua.user_id WHERE u.organization_id = $1 AND ua.is_active = true AND (ua.last_used_date IS NULL OR ua.last_used_date < CURRENT_DATE - INTERVAL '90 days')) as dormant_accounts,
        (SELECT COUNT(*) FROM review_items ri JOIN campaigns c ON c.id = ri.campaign_id WHERE c.organization_id = $1 AND ri.decision = 'pending' AND c.status = 'active') as pending_reviews`,
      [organizationId]
    );

    // Get high-risk users count
    const highRiskUsers = await query(
      `SELECT COUNT(*) as count FROM risk_profiles rp
       JOIN users u ON u.id = rp.user_id
       WHERE u.organization_id = $1 AND rp.overall_risk_score >= 70`,
      [organizationId]
    );

    // If user is a reviewer, get their pending review count
    let myPendingReviews = 0;
    if (['reviewer', 'manager', 'compliance_manager', 'admin'].includes(req.user.role)) {
      const reviewerStats = await query(
        `SELECT COUNT(*) as count FROM review_items ri
         JOIN campaigns c ON c.id = ri.campaign_id
         WHERE ri.reviewer_id = $1 AND ri.decision = 'pending' AND c.status = 'active'`,
        [req.user.userId]
      );
      myPendingReviews = parseInt(reviewerStats.rows[0].count);
    }

    return successResponse(res, {
      ...stats.rows[0],
      high_risk_users: parseInt(highRiskUsers.rows[0].count),
      my_pending_reviews: myPendingReviews,
    });

  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    return errorResponse(res, 'Failed to fetch dashboard statistics', 500);
  }
};

// @desc    Get recent activity
// @route   GET /api/v1/dashboard/activity
// @access  Private
const getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const result = await query(
      `SELECT al.*,
              u.first_name || ' ' || u.last_name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.organization_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [req.user.organizationId, limit]
    );

    return successResponse(res, result.rows);

  } catch (error) {
    logger.error('Get recent activity error:', error);
    return errorResponse(res, 'Failed to fetch recent activity', 500);
  }
};

// @desc    Get campaign progress
// @route   GET /api/v1/dashboard/campaign-progress
// @access  Private
const getCampaignProgress = async (req, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.campaign_type, c.status,
              c.start_date, c.end_date,
              c.total_reviews, c.completed_reviews, c.completion_percentage,
              (c.end_date - CURRENT_DATE) as days_remaining,
              CASE 
                WHEN c.status = 'active' AND c.end_date < CURRENT_DATE THEN true
                ELSE false
              END as is_overdue
       FROM campaigns c
       WHERE c.organization_id = $1 AND c.status IN ('active', 'draft')
       ORDER BY c.end_date ASC
       LIMIT 10`,
      [req.user.organizationId]
    );

    return successResponse(res, result.rows);

  } catch (error) {
    logger.error('Get campaign progress error:', error);
    return errorResponse(res, 'Failed to fetch campaign progress', 500);
  }
};

// @desc    Get compliance overview
// @route   GET /api/v1/dashboard/compliance
// @access  Private/Admin/ComplianceManager
const getComplianceOverview = async (req, res) => {
  try {
    // SOD violations by severity
    const sodBySeverity = await query(
      `SELECT sr.severity, COUNT(*) as count
       FROM sod_violations sv
       JOIN sod_rules sr ON sr.id = sv.rule_id
       JOIN users u ON u.id = sv.user_id
       WHERE u.organization_id = $1 AND sv.is_resolved = false
       GROUP BY sr.severity
       ORDER BY 
         CASE sr.severity
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END`,
      [req.user.organizationId]
    );

    // Access certification rate (last 90 days)
    const certificationRate = await query(
      `SELECT 
        COUNT(DISTINCT ua.user_id) as total_users_with_access,
        COUNT(DISTINCT CASE WHEN ri.decision_date > CURRENT_DATE - INTERVAL '90 days' THEN ua.user_id END) as certified_users
       FROM user_access ua
       JOIN users u ON u.id = ua.user_id
       LEFT JOIN review_items ri ON ri.user_id = ua.user_id AND ri.access_id = ua.id
       WHERE u.organization_id = $1 AND ua.is_active = true`,
      [req.user.organizationId]
    );

    const certData = certificationRate.rows[0];
    const certificationPercentage = certData.total_users_with_access > 0
      ? ((certData.certified_users / certData.total_users_with_access) * 100).toFixed(2)
      : 0;

    // Recent completed campaigns
    const completedCampaigns = await query(
      `SELECT id, name, completed_at, completion_percentage
       FROM campaigns
       WHERE organization_id = $1 AND status = 'completed'
       ORDER BY completed_at DESC
       LIMIT 5`,
      [req.user.organizationId]
    );

    return successResponse(res, {
      sod_violations_by_severity: sodBySeverity.rows,
      certification_rate: parseFloat(certificationPercentage),
      certified_users: parseInt(certData.certified_users),
      total_users_with_access: parseInt(certData.total_users_with_access),
      recent_completed_campaigns: completedCampaigns.rows,
    });

  } catch (error) {
    logger.error('Get compliance overview error:', error);
    return errorResponse(res, 'Failed to fetch compliance overview', 500);
  }
};

// @desc    Get access trends
// @route   GET /api/v1/dashboard/trends
// @access  Private/Admin/ComplianceManager
const getAccessTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await query(
      `SELECT 
        metric_date,
        total_users,
        active_users,
        total_access_items,
        high_risk_access_count,
        sod_violations_count,
        dormant_accounts_count
       FROM access_analytics
       WHERE organization_id = $1
         AND metric_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
       ORDER BY metric_date ASC`,
      [req.user.organizationId]
    );

    return successResponse(res, result.rows);

  } catch (error) {
    logger.error('Get access trends error:', error);
    return errorResponse(res, 'Failed to fetch access trends', 500);
  }
};

// @desc    Get top high-risk users
// @route   GET /api/v1/dashboard/high-risk-users
// @access  Private/Admin/ComplianceManager
const getHighRiskUsers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await query(
      `SELECT u.id, u.employee_id, u.first_name, u.last_name, u.email,
              u.job_title,
              d.name as department_name,
              rp.overall_risk_score,
              rp.privileged_access_count,
              rp.sod_violation_count,
              rp.dormant_account_flag
       FROM users u
       JOIN risk_profiles rp ON rp.user_id = u.id
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.organization_id = $1 AND u.status = 'active'
       ORDER BY rp.overall_risk_score DESC
       LIMIT $2`,
      [req.user.organizationId, limit]
    );

    return successResponse(res, result.rows);

  } catch (error) {
    logger.error('Get high-risk users error:', error);
    return errorResponse(res, 'Failed to fetch high-risk users', 500);
  }
};

// @desc    Get application usage statistics
// @route   GET /api/v1/dashboard/application-usage
// @access  Private
const getApplicationUsage = async (req, res) => {
  try {
    const result = await query(
      `SELECT a.id, a.name, a.code, a.business_criticality,
              COUNT(DISTINCT ua.user_id) as user_count,
              COUNT(ua.id) as total_access_count,
              COUNT(CASE WHEN ua.last_used_date > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_usage_count,
              COUNT(CASE WHEN ua.last_used_date < CURRENT_DATE - INTERVAL '90 days' OR ua.last_used_date IS NULL THEN 1 END) as dormant_access_count
       FROM applications a
       LEFT JOIN user_access ua ON ua.application_id = a.id AND ua.is_active = true
       WHERE a.organization_id = $1 AND a.is_active = true
       GROUP BY a.id, a.name, a.code, a.business_criticality
       ORDER BY user_count DESC
       LIMIT 15`,
      [req.user.organizationId]
    );

    return successResponse(res, result.rows);

  } catch (error) {
    logger.error('Get application usage error:', error);
    return errorResponse(res, 'Failed to fetch application usage', 500);
  }
};

// @desc    Get my review summary (for reviewers)
// @route   GET /api/v1/dashboard/my-reviews
// @access  Private
const getMyReviewSummary = async (req, res) => {
  try {
    // Get reviewer statistics
    const stats = await query(
      `SELECT 
        COUNT(*) as total_assigned,
        COUNT(*) FILTER (WHERE decision = 'pending') as pending,
        COUNT(*) FILTER (WHERE decision = 'approved') as approved,
        COUNT(*) FILTER (WHERE decision = 'revoked') as revoked,
        COUNT(*) FILTER (WHERE is_flagged = true AND decision = 'pending') as flagged_pending
       FROM review_items ri
       JOIN campaigns c ON c.id = ri.campaign_id
       WHERE ri.reviewer_id = $1 AND c.status = 'active'`,
      [req.user.userId]
    );

    // Get campaigns where user is a reviewer
    const campaigns = await query(
      `SELECT DISTINCT c.id, c.name, c.end_date,
              (c.end_date - CURRENT_DATE) as days_remaining,
              cr.total_assigned, cr.completed_count,
              CASE 
                WHEN cr.total_assigned > 0 
                THEN ROUND((cr.completed_count::NUMERIC / cr.total_assigned) * 100, 2)
                ELSE 0
              END as completion_percentage
       FROM campaigns c
       JOIN campaign_reviewers cr ON cr.campaign_id = c.id
       WHERE cr.reviewer_id = $1 AND c.status = 'active'
       ORDER BY c.end_date ASC`,
      [req.user.userId]
    );

    return successResponse(res, {
      statistics: stats.rows[0],
      active_campaigns: campaigns.rows,
    });

  } catch (error) {
    logger.error('Get my review summary error:', error);
    return errorResponse(res, 'Failed to fetch review summary', 500);
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity,
  getCampaignProgress,
  getComplianceOverview,
  getAccessTrends,
  getHighRiskUsers,
  getApplicationUsage,
  getMyReviewSummary,
};