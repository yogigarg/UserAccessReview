const { query, transaction } = require('../config/database');
const { getPagination, buildPaginationResponse, successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Get pending reviews for current user
// @route   GET /api/v1/reviews/pending
// @access  Private
const getPendingReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, campaignId, flaggedOnly } = req.query;
    const { limit: queryLimit, offset } = getPagination(page, limit);

    let whereConditions = ['ri.reviewer_id = $1', 'ri.decision = $2'];
    let params = [req.user.userId, 'pending'];
    let paramCount = 2;

    if (campaignId) {
      paramCount++;
      whereConditions.push(`ri.campaign_id = $${paramCount}`);
      params.push(campaignId);
    }

    if (flaggedOnly === 'true') {
      whereConditions.push('ri.is_flagged = true');
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM review_items ri WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get review items
    params.push(queryLimit, offset);
    const result = await query(
      `SELECT ri.*,
              u.first_name || ' ' || u.last_name as user_name,
              u.email as user_email,
              u.employee_id,
              d.name as department_name,
              a.name as application_name,
              a.code as application_code,
              a.business_criticality,
              r.name as role_name,
              r.risk_level,
              c.name as campaign_name,
              c.end_date as campaign_end_date,
              (c.end_date - CURRENT_DATE) as days_remaining
       FROM review_items ri
       JOIN users u ON u.id = ri.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       JOIN applications a ON a.id = ri.application_id
       LEFT JOIN roles r ON r.id = ri.role_id
       JOIN campaigns c ON c.id = ri.campaign_id
       WHERE ${whereClause}
       ORDER BY ri.is_flagged DESC, c.end_date ASC, ri.created_at ASC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    return successResponse(
      res,
      buildPaginationResponse(result.rows, page, limit, total)
    );

  } catch (error) {
    logger.error('Get pending reviews error:', error);
    return errorResponse(res, 'Failed to fetch pending reviews', 500);
  }
};

// @desc    Get review item details
// @route   GET /api/v1/reviews/:id
// @access  Private
const getReviewItem = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT ri.*,
              u.first_name || ' ' || u.last_name as user_name,
              u.email as user_email,
              u.employee_id,
              u.job_title,
              d.name as department_name,
              m.first_name || ' ' || m.last_name as manager_name,
              a.name as application_name,
              a.business_criticality,
              r.name as role_name,
              r.risk_level,
              r.description as role_description,
              c.name as campaign_name,
              c.campaign_type,
              reviewer.first_name || ' ' || reviewer.last_name as reviewer_name,
              (SELECT COUNT(*) FROM sod_violations WHERE user_id = ri.user_id AND is_resolved = false) as sod_violation_count
       FROM review_items ri
       JOIN users u ON u.id = ri.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN users m ON m.id = u.manager_id
       JOIN applications a ON a.id = ri.application_id
       LEFT JOIN roles r ON r.id = ri.role_id
       JOIN campaigns c ON c.id = ri.campaign_id
       JOIN users reviewer ON reviewer.id = ri.reviewer_id
       WHERE ri.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Review item not found', 404);
    }

    // Check if user is authorized to view this review
    const reviewItem = result.rows[0];
    if (
      reviewItem.reviewer_id !== req.user.userId &&
      !['admin', 'compliance_manager'].includes(req.user.role)
    ) {
      return errorResponse(res, 'Not authorized to view this review', 403);
    }

    // Get review history/comments
    const comments = await query(
      `SELECT rc.*, u.first_name || ' ' || u.last_name as commenter_name
       FROM review_comments rc
       JOIN users u ON u.id = rc.user_id
       WHERE rc.review_item_id = $1
       ORDER BY rc.created_at ASC`,
      [id]
    );

    return successResponse(res, {
      ...reviewItem,
      comments: comments.rows,
    });

  } catch (error) {
    logger.error('Get review item error:', error);
    return errorResponse(res, 'Failed to fetch review item', 500);
  }
};

// @desc    Submit review decision
// @route   POST /api/v1/reviews/:id/decision
// @access  Private
const submitDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, rationale, delegateTo } = req.body;

    // Validate decision
    const validDecisions = ['approved', 'revoked', 'exception', 'delegated'];
    if (!validDecisions.includes(decision)) {
      return errorResponse(res, 'Invalid decision', 400);
    }

    // Require rationale for revocations
    if (decision === 'revoked' && !rationale) {
      return errorResponse(res, 'Rationale is required for revocations', 400);
    }

    // Check if review item exists and user is authorized
    const reviewResult = await query(
      `SELECT ri.*, c.status as campaign_status
       FROM review_items ri
       JOIN campaigns c ON c.id = ri.campaign_id
       WHERE ri.id = $1`,
      [id]
    );

    if (reviewResult.rows.length === 0) {
      return errorResponse(res, 'Review item not found', 404);
    }

    const reviewItem = reviewResult.rows[0];

    if (reviewItem.reviewer_id !== req.user.userId) {
      return errorResponse(res, 'Not authorized to review this item', 403);
    }

    if (reviewItem.campaign_status !== 'active') {
      return errorResponse(res, 'Campaign is not active', 400);
    }

    if (reviewItem.decision !== 'pending') {
      return errorResponse(res, 'Review already completed', 400);
    }

    const result = await transaction(async (client) => {
      let updateQuery = `
        UPDATE review_items 
        SET decision = $1, 
            rationale = $2, 
            decision_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      `;
      let params = [decision, rationale];
      let paramCount = 2;

      if (decision === 'delegated' && delegateTo) {
        paramCount++;
        updateQuery += `, delegated_to = $${paramCount}`;
        params.push(delegateTo);
      }

      updateQuery += ` WHERE id = $${paramCount + 1} RETURNING *`;
      params.push(id);

      const updateResult = await client.query(updateQuery, params);
      const updatedReview = updateResult.rows[0];

      // If revoked, mark for remediation
      if (decision === 'revoked') {
        await client.query(
          `UPDATE review_items 
           SET remediation_status = 'pending'
           WHERE id = $1`,
          [id]
        );

        // Optionally deactivate the access immediately
        await client.query(
          `UPDATE user_access 
           SET is_active = false, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [reviewItem.access_id]
        );
      }

      // Recalculate campaign statistics
      await client.query(
        'SELECT recalculate_campaign_stats($1)',
        [reviewItem.campaign_id]
      );

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.organizationId,
          req.user.userId,
          decision === 'approved' ? 'approve' : 'revoke',
          'review_item',
          id,
          JSON.stringify({ decision, rationale })
        ]
      );

      return updatedReview;
    });

    logger.info(`Review decision submitted: ${id} - ${decision} by ${req.user.email}`);

    return successResponse(res, result, 'Review decision submitted successfully');

  } catch (error) {
    logger.error('Submit decision error:', error);
    return errorResponse(res, 'Failed to submit decision', 500);
  }
};

// @desc    Bulk approve reviews
// @route   POST /api/v1/reviews/bulk-approve
// @access  Private
const bulkApprove = async (req, res) => {
  try {
    const { reviewItemIds, rationale } = req.body;

    if (!Array.isArray(reviewItemIds) || reviewItemIds.length === 0) {
      return errorResponse(res, 'Review item IDs are required', 400);
    }

    if (reviewItemIds.length > 50) {
      return errorResponse(res, 'Cannot approve more than 50 items at once', 400);
    }

    const result = await transaction(async (client) => {
      // Verify all items belong to the reviewer
      const verifyResult = await client.query(
        `SELECT id FROM review_items 
         WHERE id = ANY($1) 
         AND reviewer_id = $2 
         AND decision = 'pending'`,
        [reviewItemIds, req.user.userId]
      );

      if (verifyResult.rows.length !== reviewItemIds.length) {
        throw new Error('Some review items not found or already completed');
      }

      // Update all items
      const updateResult = await client.query(
        `UPDATE review_items 
         SET decision = 'approved',
             rationale = $1,
             decision_date = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($2)
         RETURNING id, campaign_id`,
        [rationale || 'Bulk approved', reviewItemIds]
      );

      // Update campaign stats for affected campaigns
      const campaignIds = [...new Set(updateResult.rows.map(r => r.campaign_id))];
      for (const campaignId of campaignIds) {
        await client.query('SELECT recalculate_campaign_stats($1)', [campaignId]);
      }

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.organizationId,
          req.user.userId,
          'approve',
          'review_item',
          JSON.stringify({ bulk_approve: true, count: reviewItemIds.length })
        ]
      );

      return updateResult.rows;
    });

    logger.info(`Bulk approve: ${reviewItemIds.length} items by ${req.user.email}`);

    return successResponse(res, { approved: result.length }, 'Reviews approved successfully');

  } catch (error) {
    logger.error('Bulk approve error:', error);
    return errorResponse(res, error.message || 'Failed to bulk approve', 500);
  }
};

// @desc    Add comment to review
// @route   POST /api/v1/reviews/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, commentType = 'note', isInternal = false } = req.body;

    if (!comment || comment.trim().length === 0) {
      return errorResponse(res, 'Comment is required', 400);
    }

    // Verify review item exists
    const reviewResult = await query(
      'SELECT * FROM review_items WHERE id = $1',
      [id]
    );

    if (reviewResult.rows.length === 0) {
      return errorResponse(res, 'Review item not found', 404);
    }

    const result = await query(
      `INSERT INTO review_comments (review_item_id, user_id, comment, comment_type, is_internal)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, req.user.userId, comment.trim(), commentType, isInternal]
    );

    const commentData = result.rows[0];

    // Get commenter name
    const userResult = await query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [req.user.userId]
    );

    return successResponse(res, {
      ...commentData,
      commenter_name: `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`,
    }, 'Comment added successfully', 201);

  } catch (error) {
    logger.error('Add comment error:', error);
    return errorResponse(res, 'Failed to add comment', 500);
  }
};

// @desc    Get review statistics for reviewer
// @route   GET /api/v1/reviews/stats
// @access  Private
const getReviewerStats = async (req, res) => {
  try {
    const { campaignId } = req.query;

    let whereCondition = 'reviewer_id = $1';
    let params = [req.user.userId];

    if (campaignId) {
      whereCondition += ' AND campaign_id = $2';
      params.push(campaignId);
    }

    const result = await query(
      `SELECT 
        COUNT(*) as total_assigned,
        COUNT(*) FILTER (WHERE decision = 'pending') as pending,
        COUNT(*) FILTER (WHERE decision = 'approved') as approved,
        COUNT(*) FILTER (WHERE decision = 'revoked') as revoked,
        COUNT(*) FILTER (WHERE decision = 'exception') as exceptions,
        COUNT(*) FILTER (WHERE is_flagged = true) as flagged,
        COUNT(*) FILTER (WHERE decision != 'pending') as completed,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND((COUNT(*) FILTER (WHERE decision != 'pending')::NUMERIC / COUNT(*)) * 100, 2)
          ELSE 0
        END as completion_percentage
       FROM review_items
       WHERE ${whereCondition}`,
      params
    );

    return successResponse(res, result.rows[0]);

  } catch (error) {
    logger.error('Get reviewer stats error:', error);
    return errorResponse(res, 'Failed to fetch reviewer statistics', 500);
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