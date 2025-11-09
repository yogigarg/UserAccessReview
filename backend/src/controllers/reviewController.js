const { query } = require('../config/database');
const { successResponse, errorResponse, getPaginationParams } = require('../utils/helpers');
const logger = require('../utils/logger');

// Get pending reviews for current user
const getPendingReviews = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);

    const reviewsQuery = `
      SELECT 
        ri.id,
        ri.campaign_id,
        ri.user_id,
        ri.application_id,
        ri.role_id,
        ri.decision,
        ri.decision_date,
        ri.is_flagged,
        ri.flag_reason,
        ri.risk_indicators,
        u.first_name || ' ' || u.last_name as user_name,
        u.employee_id,
        a.name as application_name,
        a.code as application_code,
        r.name as role_name,
        r.risk_level,
        c.name as campaign_name,
        c.end_date as campaign_end_date,
        CASE 
          WHEN c.end_date::date < CURRENT_DATE THEN -1 * (CURRENT_DATE::date - c.end_date::date)
          ELSE (c.end_date::date - CURRENT_DATE::date)
        END as days_remaining,
        ri.access_details
      FROM review_items ri
      JOIN campaigns c ON c.id = ri.campaign_id
      JOIN users u ON u.id = ri.user_id
      JOIN applications a ON a.id = ri.application_id
      LEFT JOIN roles r ON r.id = ri.role_id
      WHERE ri.reviewer_id = $1
        AND ri.decision = 'pending'
        AND c.status = 'active'
      ORDER BY ri.is_flagged DESC, r.risk_level DESC NULLS LAST, c.end_date ASC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM review_items ri
      JOIN campaigns c ON c.id = ri.campaign_id
      WHERE ri.reviewer_id = $1
        AND ri.decision = 'pending'
        AND c.status = 'active'
    `;

    const [reviews, countResult] = await Promise.all([
      query(reviewsQuery, [req.user.id, limit, offset]),
      query(countQuery, [req.user.id])
    ]);

    return successResponse(res, reviews.rows, 'Pending reviews retrieved successfully', 200, {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    logger.error('Get pending reviews error:', error);
    return errorResponse(res, 'Failed to get pending reviews', 500);
  }
};

// Get single review item
const getReviewItem = async (req, res) => {
  try {
    const { id } = req.params;

    const reviewQuery = `
      SELECT 
        ri.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.employee_id,
        u.email as user_email,
        a.name as application_name,
        a.code as application_code,
        r.name as role_name,
        r.risk_level,
        r.description as role_description,
        c.name as campaign_name,
        c.end_date as campaign_end_date
      FROM review_items ri
      JOIN campaigns c ON c.id = ri.campaign_id
      JOIN users u ON u.id = ri.user_id
      JOIN applications a ON a.id = ri.application_id
      LEFT JOIN roles r ON r.id = ri.role_id
      WHERE ri.id = $1 AND ri.reviewer_id = $2
    `;

    const result = await query(reviewQuery, [id, req.user.id]);

    if (result.rows.length === 0) {
      return errorResponse(res, 'Review item not found', 404);
    }

    return successResponse(res, result.rows[0]);
  } catch (error) {
    logger.error('Get review item error:', error);
    return errorResponse(res, 'Failed to get review item', 500);
  }
};

// Submit review decision
const submitDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, rationale } = req.body;

    // Validate decision
    if (!['approved', 'revoked', 'exception'].includes(decision)) {
      return errorResponse(res, 'Invalid decision', 400);
    }

    // Check if review item exists and belongs to reviewer
    const checkQuery = `
      SELECT ri.*, c.organization_id
      FROM review_items ri
      JOIN campaigns c ON c.id = ri.campaign_id
      WHERE ri.id = $1 AND ri.reviewer_id = $2
    `;
    const checkResult = await query(checkQuery, [id, req.user.id]);

    if (checkResult.rows.length === 0) {
      return errorResponse(res, 'Review item not found', 404);
    }

    const reviewItem = checkResult.rows[0];

    // Update review item
    const updateQuery = `
      UPDATE review_items
      SET decision = $1,
          decision_date = CURRENT_TIMESTAMP,
          rationale = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await query(updateQuery, [decision, rationale, id]);

    // Log audit trail
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, success, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        reviewItem.organization_id,
        req.user.id,
        `review_${decision}`,
        'review_item',
        id,
        true,
        req.ip,
        JSON.stringify({ decision, rationale })
      ]
    );

    logger.info('Review decision submitted:', {
      reviewItemId: id,
      decision,
      reviewerId: req.user.email
    });

    return successResponse(res, result.rows[0], 'Decision submitted successfully');
  } catch (error) {
    logger.error('Submit decision error:', error);
    return errorResponse(res, 'Failed to submit decision', 500);
  }
};

// Bulk approve reviews
const bulkApprove = async (req, res) => {
  try {
    const { reviewItemIds, rationale } = req.body;

    if (!Array.isArray(reviewItemIds) || reviewItemIds.length === 0) {
      return errorResponse(res, 'Review item IDs required', 400);
    }

    // Check all items belong to reviewer
    const checkQuery = `
      SELECT id FROM review_items
      WHERE id = ANY($1) AND reviewer_id = $2 AND decision = 'pending'
    `;
    const checkResult = await query(checkQuery, [reviewItemIds, req.user.id]);

    if (checkResult.rows.length !== reviewItemIds.length) {
      return errorResponse(res, 'Some review items not found or already decided', 400);
    }

    // Bulk update
    const updateQuery = `
      UPDATE review_items
      SET decision = 'approved',
          decision_date = CURRENT_TIMESTAMP,
          rationale = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2) AND reviewer_id = $3
      RETURNING id
    `;

    const result = await query(updateQuery, [rationale, reviewItemIds, req.user.id]);

    logger.info('Bulk approval completed:', {
      count: result.rows.length,
      reviewerId: req.user.email
    });

    return successResponse(res, {
      approved_count: result.rows.length
    }, 'Reviews approved successfully');
  } catch (error) {
    logger.error('Bulk approve error:', error);
    return errorResponse(res, 'Failed to approve reviews', 500);
  }
};

// Add comment to review item
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      return errorResponse(res, 'Comment required', 400);
    }

    // Check if review item exists and belongs to reviewer
    const checkResult = await query(
      'SELECT id FROM review_items WHERE id = $1 AND reviewer_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return errorResponse(res, 'Review item not found', 404);
    }

    // Add comment
    const updateQuery = `
      UPDATE review_items
      SET access_details = jsonb_set(
        COALESCE(access_details, '{}'::jsonb),
        '{comments}',
        COALESCE(access_details->'comments', '[]'::jsonb) || $1::jsonb
      )
      WHERE id = $2
      RETURNING *
    `;

    const commentData = JSON.stringify({
      comment,
      commented_by: req.user.email,
      commented_at: new Date().toISOString()
    });

    const result = await query(updateQuery, [commentData, id]);

    return successResponse(res, result.rows[0], 'Comment added successfully');
  } catch (error) {
    logger.error('Add comment error:', error);
    return errorResponse(res, 'Failed to add comment', 500);
  }
};

// Get reviewer statistics
const getReviewerStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_assigned,
        COUNT(CASE WHEN decision = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN decision = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN decision = 'revoked' THEN 1 END) as revoked,
        COUNT(CASE WHEN decision = 'exception' THEN 1 END) as exception,
        COUNT(CASE WHEN decision != 'pending' THEN 1 END) as completed,
        COALESCE(
          ROUND(
            (COUNT(CASE WHEN decision != 'pending' THEN 1 END)::numeric / 
            NULLIF(COUNT(*), 0) * 100), 2
          ), 0
        ) as completion_percentage
      FROM review_items ri
      JOIN campaigns c ON c.id = ri.campaign_id
      WHERE ri.reviewer_id = $1
        AND c.status = 'active'
    `;

    const result = await query(statsQuery, [req.user.id]);

    return successResponse(res, result.rows[0]);
  } catch (error) {
    logger.error('Get reviewer stats error:', error);
    return errorResponse(res, 'Failed to get reviewer statistics', 500);
  }
};

module.exports = {
  getPendingReviews,
  getReviewItem,
  submitDecision,
  bulkApprove,
  addComment,
  getReviewerStats,
};