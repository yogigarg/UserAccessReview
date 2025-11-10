const { query } = require('../config/database');
const { successResponse, errorResponse, getPaginationParams } = require('../utils/helpers');
const logger = require('../utils/logger');

// Get campaign statistics
const getCampaignStats = async (req, res) => {
  try {
    const { id } = req.params;

    // First verify the campaign belongs to the user's organization
    const campaignCheck = await query(
      'SELECT id FROM campaigns WHERE id = $1 AND organization_id = $2',
      [id, req.user.organization_id]
    );

    if (campaignCheck.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', 404);
    }

    const statsQuery = `
      SELECT 
        c.id,
        c.name,
        c.status,
        c.start_date,
        c.end_date,
        COUNT(DISTINCT ri.id) as total_reviews,
        COUNT(DISTINCT CASE WHEN ri.decision = 'approved' THEN ri.id END) as approved_count,
        COUNT(DISTINCT CASE WHEN ri.decision = 'revoked' THEN ri.id END) as revoked_count,
        COUNT(DISTINCT CASE WHEN ri.decision = 'exception' THEN ri.id END) as exception_count,
        COUNT(DISTINCT CASE WHEN ri.decision != 'pending' THEN ri.id END) as completed_reviews,
        COALESCE(
          ROUND(
            (COUNT(DISTINCT CASE WHEN ri.decision != 'pending' THEN ri.id END)::numeric / 
            NULLIF(COUNT(DISTINCT ri.id), 0) * 100), 2
          ), 0
        ) as completion_percentage,
        COUNT(DISTINCT ri.reviewer_id) as reviewer_count,
        CASE 
          WHEN c.end_date::date < CURRENT_DATE THEN 0
          ELSE (c.end_date::date - CURRENT_DATE::date)
        END as days_remaining
      FROM campaigns c
      LEFT JOIN review_items ri ON ri.campaign_id = c.id
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.status, c.start_date, c.end_date
    `;

    const result = await query(statsQuery, [id]);

    if (result.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', 404);
    }

    return successResponse(res, result.rows[0]);
  } catch (error) {
    logger.error('Get campaign stats error:', error);
    return errorResponse(res, 'Failed to get campaign statistics', 500);
  }
};

// Get campaign reviewers with their progress
const getCampaignReviewers = async (req, res) => {
  try {
    const { id } = req.params;

    // First verify the campaign belongs to the user's organization
    const campaignCheck = await query(
      'SELECT id FROM campaigns WHERE id = $1 AND organization_id = $2',
      [id, req.user.organization_id]
    );

    if (campaignCheck.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', 404);
    }

    const reviewersQuery = `
      SELECT 
        u.id as reviewer_id,
        u.first_name || ' ' || u.last_name as reviewer_name,
        u.email as reviewer_email,
        u.role,
        COUNT(ri.id) as total_assigned,
        COUNT(CASE WHEN ri.decision != 'pending' THEN 1 END) as completed_count,
        COUNT(CASE WHEN ri.decision = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN ri.decision = 'revoked' THEN 1 END) as revoked_count,
        COUNT(CASE WHEN ri.decision = 'exception' THEN 1 END) as exception_count,
        COALESCE(
          ROUND(
            (COUNT(CASE WHEN ri.decision != 'pending' THEN 1 END)::numeric / 
            NULLIF(COUNT(ri.id), 0) * 100), 2
          ), 0
        ) as completion_percentage,
        MIN(CASE WHEN ri.decision != 'pending' THEN ri.decision_date END) as first_review_date,
        MAX(CASE WHEN ri.decision != 'pending' THEN ri.decision_date END) as last_review_date
      FROM review_items ri
      JOIN users u ON u.id = ri.reviewer_id
      WHERE ri.campaign_id = $1
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.role
      ORDER BY completion_percentage DESC, reviewer_name
    `;

    const result = await query(reviewersQuery, [id]);

    return successResponse(res, result.rows);
  } catch (error) {
    logger.error('Get campaign reviewers error:', error);
    return errorResponse(res, 'Failed to get campaign reviewers', 500);
  }
};

// Get campaign by ID
const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaignQuery = `
      SELECT 
        c.*,
        COUNT(DISTINCT ri.id) as total_reviews,
        COUNT(DISTINCT CASE WHEN ri.decision != 'pending' THEN ri.id END) as completed_reviews,
        COALESCE(
          ROUND(
            (COUNT(DISTINCT CASE WHEN ri.decision != 'pending' THEN ri.id END)::numeric / 
            NULLIF(COUNT(DISTINCT ri.id), 0) * 100), 2
          ), 0
        ) as completion_percentage,
        CASE 
          WHEN c.end_date::date < CURRENT_DATE THEN 0
          ELSE (c.end_date::date - CURRENT_DATE::date)
        END as days_remaining
      FROM campaigns c
      LEFT JOIN review_items ri ON ri.campaign_id = c.id
      WHERE c.id = $1 AND c.organization_id = $2
      GROUP BY c.id
    `;

    const result = await query(campaignQuery, [id, req.user.organization_id]);

    if (result.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', 404);
    }

    return successResponse(res, result.rows[0]);
  } catch (error) {
    logger.error('Get campaign error:', error);
    return errorResponse(res, 'Failed to get campaign', 500);
  }
};

// Get all campaigns
const getCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE c.organization_id = $1';
    const params = [req.user.organization_id];

    if (status) {
      params.push(status);
      whereClause += ` AND c.status = $${params.length}`;
    }

    const campaignsQuery = `
      SELECT 
        c.*,
        COUNT(DISTINCT ri.id) as total_reviews,
        COUNT(DISTINCT CASE WHEN ri.decision != 'pending' THEN ri.id END) as completed_reviews,
        COALESCE(
          ROUND(
            (COUNT(DISTINCT CASE WHEN ri.decision != 'pending' THEN ri.id END)::numeric / 
            NULLIF(COUNT(DISTINCT ri.id), 0) * 100), 2
          ), 0
        ) as completion_percentage,
        CASE 
          WHEN c.end_date::date < CURRENT_DATE THEN (CURRENT_DATE::date - c.end_date::date) * -1
          ELSE (c.end_date::date - CURRENT_DATE::date)
        END as days_remaining
      FROM campaigns c
      LEFT JOIN review_items ri ON ri.campaign_id = c.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const countQuery = `SELECT COUNT(*) FROM campaigns c ${whereClause}`;
    
    const [campaigns, countResult] = await Promise.all([
      query(campaignsQuery, params),
      query(countQuery, params.slice(0, -2))
    ]);

    return successResponse(res, campaigns.rows, 'Campaigns retrieved successfully', 200, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    logger.error('Get campaigns error:', error);
    return errorResponse(res, 'Failed to get campaigns', 500);
  }
};

// Create campaign
const createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      campaign_type,
      start_date,
      end_date,
      reminder_frequency = 3,
      scope_config = {}
    } = req.body;

    const result = await query(
      `INSERT INTO campaigns (
        organization_id, name, description, campaign_type, 
        start_date, end_date, reminder_frequency, scope_config,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.user.organization_id,
        name,
        description,
        campaign_type,
        start_date,
        end_date,
        reminder_frequency,
        JSON.stringify(scope_config),
        'draft',
        req.user.id
      ]
    );

    logger.info('Campaign created:', { campaignId: result.rows[0].id, createdBy: req.user.email });

    return successResponse(res, result.rows[0], 'Campaign created successfully', 201);
  } catch (error) {
    logger.error('Create campaign error:', error);
    return errorResponse(res, 'Failed to create campaign', 500);
  }
};

// Update campaign
const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      campaign_type,
      start_date,
      end_date,
      reminder_frequency,
      scope_config
    } = req.body;

    const result = await query(
      `UPDATE campaigns 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           campaign_type = COALESCE($3, campaign_type),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           reminder_frequency = COALESCE($6, reminder_frequency),
           scope_config = COALESCE($7, scope_config),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND organization_id = $9
       RETURNING *`,
      [
        name, 
        description, 
        campaign_type, 
        start_date, 
        end_date, 
        reminder_frequency, 
        scope_config ? JSON.stringify(scope_config) : null,
        id, 
        req.user.organization_id
      ]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', 404);
    }

    return successResponse(res, result.rows[0], 'Campaign updated successfully');
  } catch (error) {
    logger.error('Update campaign error:', error);
    return errorResponse(res, 'Failed to update campaign', 500);
  }
};

// Launch campaign
const launchCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE campaigns 
       SET status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2 AND status = 'draft'
       RETURNING *`,
      [id, req.user.organization_id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Campaign not found or already launched', 404);
    }

    logger.info('Campaign launched:', { campaignId: id, launchedBy: req.user.email });

    return successResponse(res, result.rows[0], 'Campaign launched successfully');
  } catch (error) {
    logger.error('Launch campaign error:', error);
    return errorResponse(res, 'Failed to launch campaign', 500);
  }
};

// Delete campaign
const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM campaigns 
       WHERE id = $1 AND organization_id = $2 AND status = 'draft'
       RETURNING id`,
      [id, req.user.organization_id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Campaign not found or cannot be deleted', 404);
    }

    return successResponse(res, null, 'Campaign deleted successfully');
  } catch (error) {
    logger.error('Delete campaign error:', error);
    return errorResponse(res, 'Failed to delete campaign', 500);
  }
};

module.exports = {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  launchCampaign,
  getCampaignStats,
  getCampaignReviewers,
  deleteCampaign,
};