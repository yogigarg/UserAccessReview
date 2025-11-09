const { query, transaction } = require('../config/database');
const { getPagination, buildPaginationResponse, successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// @desc    Get all campaigns
// @route   GET /api/v1/campaigns
// @access  Private
const getCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, campaignType } = req.query;
    const { limit: queryLimit, offset } = getPagination(page, limit);

    let whereConditions = ['c.organization_id = $1'];
    let params = [req.user.organizationId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereConditions.push(`c.status = $${paramCount}`);
      params.push(status);
    }

    if (campaignType) {
      paramCount++;
      whereConditions.push(`c.campaign_type = $${paramCount}`);
      params.push(campaignType);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM campaigns c WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get campaigns
    params.push(queryLimit, offset);
    const result = await query(
      `SELECT c.*,
              u.first_name || ' ' || u.last_name as created_by_name,
              (c.end_date - CURRENT_DATE) as days_remaining,
              CASE 
                WHEN c.status = 'active' AND c.end_date < CURRENT_DATE THEN true
                ELSE false
              END as is_overdue
       FROM campaigns c
       JOIN users u ON u.id = c.created_by
       WHERE ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    return successResponse(
      res,
      buildPaginationResponse(result.rows, page, limit, total)
    );

  } catch (error) {
    logger.error('Get campaigns error:', error);
    return errorResponse(res, 'Failed to fetch campaigns', 500);
  }
};

// @desc    Get single campaign
// @route   GET /api/v1/campaigns/:id
// @access  Private
const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*,
              u.first_name || ' ' || u.last_name as created_by_name,
              (c.end_date - CURRENT_DATE) as days_remaining,
              (SELECT COUNT(*) FROM campaign_reviewers WHERE campaign_id = c.id) as reviewer_count,
              (SELECT COUNT(*) FROM review_items WHERE campaign_id = c.id AND is_flagged = true) as flagged_items_count
       FROM campaigns c
       JOIN users u ON u.id = c.created_by
       WHERE c.id = $1 AND c.organization_id = $2`,
      [id, req.user.organizationId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', 404);
    }

    return successResponse(res, result.rows[0]);

  } catch (error) {
    logger.error('Get campaign error:', error);
    return errorResponse(res, 'Failed to fetch campaign', 500);
  }
};

// @desc    Create campaign
// @route   POST /api/v1/campaigns
// @access  Private/Admin/ComplianceManager
const createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      campaignType,
      scopeConfig,
      startDate,
      endDate,
      reminderFrequency = 3,
      escalationEnabled = true,
      escalationDays = 7,
    } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return errorResponse(res, 'End date must be after start date', 400);
    }

    const result = await transaction(async (client) => {
      // Create campaign
      const campaignResult = await client.query(
        `INSERT INTO campaigns (
          organization_id, name, description, campaign_type, status, scope_config,
          start_date, end_date, reminder_frequency, escalation_enabled, escalation_days,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          req.user.organizationId,
          name,
          description,
          campaignType,
          'draft',
          JSON.stringify(scopeConfig),
          startDate,
          endDate,
          reminderFrequency,
          escalationEnabled,
          escalationDays,
          req.user.userId,
        ]
      );

      const campaign = campaignResult.rows[0];

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name, new_values)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.organizationId,
          req.user.userId,
          'create',
          'campaign',
          campaign.id,
          name,
          JSON.stringify({ campaign_type: campaignType, start_date: startDate, end_date: endDate })
        ]
      );

      return campaign;
    });

    logger.info(`Campaign created: ${name} by ${req.user.email}`);

    return successResponse(res, result, 'Campaign created successfully', 201);

  } catch (error) {
    logger.error('Create campaign error:', error);
    return errorResponse(res, 'Failed to create campaign', 500);
  }
};

// @desc    Update campaign
// @route   PUT /api/v1/campaigns/:id
// @access  Private/Admin/ComplianceManager
const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      scopeConfig,
      startDate,
      endDate,
      reminderFrequency,
      escalationEnabled,
      status,
    } = req.body;

    // Check if campaign exists and is editable
    const currentCampaign = await query(
      'SELECT * FROM campaigns WHERE id = $1 AND organization_id = $2',
      [id, req.user.organizationId]
    );

    if (currentCampaign.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', 404);
    }

    if (currentCampaign.rows[0].status === 'completed') {
      return errorResponse(res, 'Cannot update completed campaign', 400);
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }
    if (scopeConfig) {
      paramCount++;
      updates.push(`scope_config = $${paramCount}`);
      params.push(JSON.stringify(scopeConfig));
    }
    if (startDate) {
      paramCount++;
      updates.push(`start_date = $${paramCount}`);
      params.push(startDate);
    }
    if (endDate) {
      paramCount++;
      updates.push(`end_date = $${paramCount}`);
      params.push(endDate);
    }
    if (reminderFrequency) {
      paramCount++;
      updates.push(`reminder_frequency = $${paramCount}`);
      params.push(reminderFrequency);
    }
    if (escalationEnabled !== undefined) {
      paramCount++;
      updates.push(`escalation_enabled = $${paramCount}`);
      params.push(escalationEnabled);
    }
    if (status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return errorResponse(res, 'No fields to update', 400);
    }

    paramCount++;
    params.push(id);

    const result = await query(
      `UPDATE campaigns SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    // Log audit
    await query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.organizationId, req.user.userId, 'update', 'campaign', id, name]
    );

    logger.info(`Campaign updated: ${id} by ${req.user.email}`);

    return successResponse(res, result.rows[0], 'Campaign updated successfully');

  } catch (error) {
    logger.error('Update campaign error:', error);
    return errorResponse(res, 'Failed to update campaign', 500);
  }
};

// @desc    Launch campaign
// @route   POST /api/v1/campaigns/:id/launch
// @access  Private/Admin/ComplianceManager
const launchCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await transaction(async (client) => {
      // Check campaign status
      const campaignResult = await client.query(
        'SELECT * FROM campaigns WHERE id = $1 AND organization_id = $2',
        [id, req.user.organizationId]
      );

      if (campaignResult.rows.length === 0) {
        throw new Error('Campaign not found');
      }

      const campaign = campaignResult.rows[0];

      if (campaign.status !== 'draft') {
        throw new Error('Only draft campaigns can be launched');
      }

      // Generate review items based on scope
      const scopeConfig = campaign.scope_config;
      
      // Build query to find users in scope
      let userQuery = `
        SELECT DISTINCT u.id as user_id, u.manager_id, ua.application_id, ua.role_id, ua.id as access_id
        FROM users u
        JOIN user_access ua ON ua.user_id = u.id
        WHERE u.organization_id = $1 AND u.status = 'active' AND ua.is_active = true
      `;
      
      const queryParams = [req.user.organizationId];
      
      // Add scope filters
      if (scopeConfig.departments && scopeConfig.departments.length > 0) {
        userQuery += ` AND u.department_id IN (SELECT id FROM departments WHERE code = ANY($2))`;
        queryParams.push(scopeConfig.departments);
      }

      const usersInScope = await client.query(userQuery, queryParams);

      // Create review items
      for (const item of usersInScope.rows) {
        // Determine reviewer based on campaign type
        let reviewerId = item.manager_id;
        
        if (campaign.campaign_type === 'application_owner') {
          const appOwner = await client.query(
            'SELECT owner_id FROM applications WHERE id = $1',
            [item.application_id]
          );
          reviewerId = appOwner.rows[0]?.owner_id || item.manager_id;
        }

        if (!reviewerId) {
          // Skip if no reviewer assigned
          continue;
        }

        // Get access details snapshot
        const accessDetails = await client.query(
          `SELECT ua.*, a.name as application_name, r.name as role_name
           FROM user_access ua
           JOIN applications a ON a.id = ua.application_id
           LEFT JOIN roles r ON r.id = ua.role_id
           WHERE ua.id = $1`,
          [item.access_id]
        );

        // Check if this access is flagged (SOD violation or high risk)
        const sodCheck = await client.query(
          `SELECT COUNT(*) as count FROM sod_violations 
           WHERE user_id = $1 AND is_resolved = false`,
          [item.user_id]
        );

        const isFlagged = parseInt(sodCheck.rows[0].count) > 0;

        await client.query(
          `INSERT INTO review_items (
            campaign_id, user_id, application_id, role_id, access_id,
            reviewer_id, decision, is_flagged, flag_reason, access_details
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            id,
            item.user_id,
            item.application_id,
            item.role_id,
            item.access_id,
            reviewerId,
            'pending',
            isFlagged,
            isFlagged ? 'SOD violation detected' : null,
            JSON.stringify(accessDetails.rows[0])
          ]
        );
      }

      // Count total review items
      const countResult = await client.query(
        'SELECT COUNT(*) as total FROM review_items WHERE campaign_id = $1',
        [id]
      );

      // Update campaign status
      const updateResult = await client.query(
        `UPDATE campaigns 
         SET status = 'active', 
             launched_at = CURRENT_TIMESTAMP,
             total_reviews = $1
         WHERE id = $2
         RETURNING *`,
        [countResult.rows[0].total, id]
      );

      // Create campaign reviewer records
      const reviewers = await client.query(
        `INSERT INTO campaign_reviewers (campaign_id, reviewer_id, total_assigned)
         SELECT $1, reviewer_id, COUNT(*) as total
         FROM review_items
         WHERE campaign_id = $1
         GROUP BY reviewer_id
         ON CONFLICT (campaign_id, reviewer_id) DO UPDATE
         SET total_assigned = EXCLUDED.total_assigned
         RETURNING *`,
        [id]
      );

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.organizationId, req.user.userId, 'campaign_start', 'campaign', id, campaign.name]
      );

      return {
        campaign: updateResult.rows[0],
        reviewItemsCreated: parseInt(countResult.rows[0].total),
        reviewersAssigned: reviewers.rows.length,
      };
    });

    logger.info(`Campaign launched: ${id} by ${req.user.email}`);

    return successResponse(res, result, 'Campaign launched successfully');

  } catch (error) {
    logger.error('Launch campaign error:', error);
    return errorResponse(res, error.message || 'Failed to launch campaign', 500);
  }
};

// @desc    Get campaign reviewers
// @route   GET /api/v1/campaigns/:id/reviewers
// @access  Private
const getCampaignReviewers = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT cr.*,
              u.first_name || ' ' || u.last_name as reviewer_name,
              u.email as reviewer_email,
              CASE 
                WHEN cr.total_assigned > 0 
                THEN ROUND((cr.completed_count::NUMERIC / cr.total_assigned) * 100, 2)
                ELSE 0
              END as completion_percentage
       FROM campaign_reviewers cr
       JOIN users u ON u.id = cr.reviewer_id
       WHERE cr.campaign_id = $1
       ORDER BY completion_percentage ASC, cr.total_assigned DESC`,
      [id]
    );

    return successResponse(res, result.rows);

  } catch (error) {
    logger.error('Get campaign reviewers error:', error);
    return errorResponse(res, 'Failed to fetch campaign reviewers', 500);
  }
};

// @desc    Get campaign statistics
// @route   GET /api/v1/campaigns/:id/stats
// @access  Private
const getCampaignStats = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        c.id,
        c.name,
        c.status,
        c.start_date,
        c.end_date,
        c.total_reviews,
        c.completed_reviews,
        c.completion_percentage,
        c.approved_count,
        c.revoked_count,
        c.exception_count,
        (SELECT COUNT(*) FROM review_items WHERE campaign_id = c.id AND is_flagged = true) as flagged_count,
        (SELECT COUNT(*) FROM campaign_reviewers WHERE campaign_id = c.id) as reviewer_count,
        (SELECT COUNT(*) FROM campaign_reviewers WHERE campaign_id = c.id AND completed_count = total_assigned) as completed_reviewers,
        (c.end_date - CURRENT_DATE) as days_remaining,
        CASE 
          WHEN c.status = 'active' AND c.end_date < CURRENT_DATE THEN true
          ELSE false
        END as is_overdue
       FROM campaigns c
       WHERE c.id = $1 AND c.organization_id = $2`,
      [id, req.user.organizationId]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', 404);
    }

    // Get review breakdown by department
    const deptBreakdown = await query(
      `SELECT d.name as department, COUNT(*) as total, 
              COUNT(*) FILTER (WHERE ri.decision != 'pending') as completed
       FROM review_items ri
       JOIN users u ON u.id = ri.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE ri.campaign_id = $1
       GROUP BY d.name
       ORDER BY total DESC`,
      [id]
    );

    return successResponse(res, {
      ...result.rows[0],
      departmentBreakdown: deptBreakdown.rows,
    });

  } catch (error) {
    logger.error('Get campaign stats error:', error);
    return errorResponse(res, 'Failed to fetch campaign statistics', 500);
  }
};

// @desc    Delete campaign
// @route   DELETE /api/v1/campaigns/:id
// @access  Private/Admin
const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if campaign can be deleted
    const campaignResult = await query(
      'SELECT * FROM campaigns WHERE id = $1 AND organization_id = $2',
      [id, req.user.organizationId]
    );

    if (campaignResult.rows.length === 0) {
      return errorResponse(res, 'Campaign not found', 404);
    }

    const campaign = campaignResult.rows[0];

    if (campaign.status === 'active') {
      return errorResponse(res, 'Cannot delete active campaign. Please cancel it first.', 400);
    }

    await transaction(async (client) => {
      // Delete related records
      await client.query('DELETE FROM review_items WHERE campaign_id = $1', [id]);
      await client.query('DELETE FROM campaign_reviewers WHERE campaign_id = $1', [id]);
      await client.query('DELETE FROM campaigns WHERE id = $1', [id]);

      // Log audit
      await client.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, entity_name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.organizationId, req.user.userId, 'delete', 'campaign', id, campaign.name]
      );
    });

    logger.info(`Campaign deleted: ${id} by ${req.user.email}`);

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
  getCampaignReviewers,
  getCampaignStats,
  deleteCampaign,
};